import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestRegressor

FEATURES = ["beds", "baths", "sqft"]


def to_df(props):
    """Convert property dictionaries to a clean dataframe while tracking origin indices."""
    rows = []
    for idx, prop in enumerate(props):
        row = {**prop, "__idx": idx}
        rows.append(row)
    df = pd.DataFrame(rows)
    for col in FEATURES + ["price"]:
        if col in df:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        else:
            df[col] = np.nan
    df = df.dropna(subset=FEATURES + ["price"])
    return df


def _fallback_prediction(prop):
    """Heuristic price estimator to keep predictions available on tiny datasets."""
    sqft = prop.get("sqft") or 0
    beds = prop.get("beds") or 0
    baths = prop.get("baths") or 0
    base = sqft * 295 + beds * 18500 + baths * 12500
    if prop.get("status") == "listed":
        base *= 1.02
    if prop.get("status") == "under_contract":
        base *= 0.98
    return base


def score_properties(props):
    """
    Enrich property dictionaries with Random Forest price predictions and Isolation Forest anomalies.
    Returns a list of the same length/order as the input (minus any rows missing key fields).
    """
    if not props:
        return []

    df = to_df(props)
    if df.empty:
        return []

    idx_map = df["__idx"].tolist()
    df = df.drop(columns=["__idx"])

    X = df[FEATURES].values
    y = df["price"].values

    trainable = len(df) >= 10 and df["price"].nunique() > 1
    if trainable:
        rf = RandomForestRegressor(
            n_estimators=400,
            random_state=42,
            min_samples_leaf=2,
            n_jobs=-1,
        )
        rf.fit(X, y)
        pred = rf.predict(X)
    else:
        pred = np.array([_fallback_prediction(row) for row in df.to_dict(orient="records")])

    delta = pred - y
    roi = np.where(y > 0, (delta / y) * 100, 0)

    iso_ready = len(df) >= 8
    if iso_ready:
        contamination = min(0.2, max(0.05, 6 / len(df)))
        iso_input = np.column_stack([delta, y, df["sqft"].values])
        iso = IsolationForest(contamination=contamination, random_state=42)
        flags = iso.fit_predict(iso_input)
        scores = iso.decision_function(iso_input)
    else:
        flags = np.ones(len(df))
        scores = np.zeros(len(df))

    ppsf = np.where(df["sqft"].values > 0, y / df["sqft"].values, np.nan)

    df_out = df.copy()
    df_out["predicted_price"] = pred
    df_out["delta"] = delta
    df_out["roi"] = roi
    df_out["ppsf"] = ppsf
    df_out["anomalous"] = flags == -1
    df_out["anomaly_score"] = scores

    enriched = []
    for record, idx in zip(df_out.to_dict(orient="records"), idx_map):
        merged = {**props[idx], **record}
        merged["anomalous"] = bool(merged.get("anomalous", False))
        enriched.append(merged)

    return enriched
