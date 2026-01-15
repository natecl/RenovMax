from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os, requests, time, uuid
from dotenv import load_dotenv
from ml import score_properties

load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

API_KEY = os.getenv("RAPIDAPI_KEY")
BLUEPRINT_IMG = "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1000&q=70"

LOCAL_DATA: List[dict] = []
ZIP_CACHE: dict = {}

SEED_DATA = [
    {
        "id": "seed-1",
        "title": "Maple Street Craftsman",
        "address": "412 Maple St, Portland, OR",
        "zip_code": "97204",
        "price": 625000,
        "beds": 3,
        "baths": 2,
        "sqft": 1820,
        "status": "listed",
        "image": BLUEPRINT_IMG,
    },
    {
        "id": "seed-2",
        "title": "Hilltop Modern",
        "address": "88 Summit Rd, Austin, TX",
        "zip_code": "78701",
        "price": 830000,
        "beds": 4,
        "baths": 3,
        "sqft": 2450,
        "status": "under_contract",
        "image": BLUEPRINT_IMG,
    },
    {
        "id": "seed-3",
        "title": "Lakeview Retreat",
        "address": "15 Shoreline Dr, Seattle, WA",
        "zip_code": "98101",
        "price": 1250000,
        "beds": 5,
        "baths": 4,
        "sqft": 3180,
        "status": "listed",
        "image": BLUEPRINT_IMG,
    },
    {
        "id": "seed-4",
        "title": "SoMa Loft",
        "address": "240 Brannan St, San Francisco, CA",
        "zip_code": "94107",
        "price": 1150000,
        "beds": 2,
        "baths": 2,
        "sqft": 1320,
        "status": "listed",
        "image": BLUEPRINT_IMG,
    },
]


class PropertyIn(BaseModel):
    title: str
    address: str
    zip_code: str
    price: float
    beds: int
    baths: int
    sqft: float
    status: str = "listed"
    image: Optional[str] = None


def zillow_fetch(zipcode: str, limit: int):
    """Fetch live housing data from RapidAPI Zillow wrapper."""
    if not API_KEY:
        return []
    url = "https://zillow-com1.p.rapidapi.com/propertyExtendedSearch"
    params = {
        "location": zipcode,
        "status_type": "ForSale",
        "home_type": "Houses",
        "limit": limit,
    }
    headers = {
        "X-RapidAPI-Key": API_KEY,
        "X-RapidAPI-Host": "zillow-com1.p.rapidapi.com",
    }
    try:
        r = requests.get(url, headers=headers, params=params, timeout=15)
    except requests.RequestException:
        return []
    if r.status_code != 200:
        return []
    data = r.json().get("props", [])
    cleaned = []
    for d in data:
        if not (d.get("price") and d.get("livingArea")):
            continue
        cleaned.append(
            {
                "id": f"zillow-{d.get('zpid') or uuid.uuid4().hex[:8]}",
                "title": d.get("address") or "Live Listing",
                "address": f"{d.get('address')}, {d.get('city')}, {d.get('state')}",
                "zip_code": zipcode,
                "price": d.get("price"),
                "beds": d.get("bedrooms"),
                "baths": d.get("bathrooms"),
                "sqft": d.get("livingArea"),
                "status": "listed",
                "lat": d.get("latitude"),
                "lng": d.get("longitude"),
                "image": d.get("imgSrc") or BLUEPRINT_IMG,
            }
        )
    return cleaned


def load_inventory(zip_code: Optional[str], limit: int):
    """Blend live API data, seeded examples, and user-submitted records."""
    props: List[dict] = []
    if zip_code:
        cached = ZIP_CACHE.get(zip_code)
        if cached and cached["expires_at"] > time.time():
            props.extend(cached["data"])
        else:
            fetched = []
            try:
                fetched = zillow_fetch(zip_code, limit) or []
            except Exception:
                fetched = []
            if not fetched and not API_KEY:
                # Keep UX alive even without live data by seeding a few examples.
                fetched = [p for p in SEED_DATA if p["zip_code"].startswith(zip_code[:2])] or SEED_DATA
            ZIP_CACHE[zip_code] = {"data": fetched, "expires_at": time.time() + 900}
            props.extend(fetched)
    else:
        props.extend(SEED_DATA)
    props.extend([p for p in LOCAL_DATA if not zip_code or p["zip_code"] == zip_code])
    return props


def filter_and_sort(props: List[dict], status: Optional[str], min_price: Optional[float], max_price: Optional[float], min_roi: Optional[float], sort_by: str):
    data = props
    if status:
        data = [p for p in data if p.get("status") == status]
    if min_price is not None:
        data = [p for p in data if p.get("price") is not None and p["price"] >= min_price]
    if max_price is not None:
        data = [p for p in data if p.get("price") is not None and p["price"] <= max_price]
    if min_roi is not None:
        data = [p for p in data if p.get("roi") is not None and p["roi"] >= min_roi]

    sorters = {
        "price": lambda p: p.get("price") or 0,
        "roi": lambda p: p.get("roi") or 0,
        "sqft": lambda p: p.get("sqft") or 0,
        "delta": lambda p: p.get("delta") or 0,
    }
    data.sort(key=sorters.get(sort_by, sorters["delta"]), reverse=True if sort_by in ["delta", "roi"] else False)
    return data


@app.get("/properties")
def properties(
    zip_code: Optional[str] = Query(None, description="ZIP code to search"),
    status: Optional[str] = Query(None, description="Filter by status"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_roi: Optional[float] = Query(None, ge=-100),
    sort_by: str = Query("delta", description="delta | price | roi | sqft"),
    limit: int = Query(60, ge=10, le=100),
):
    props = load_inventory(zip_code, limit)
    scored = score_properties(props)
    return filter_and_sort(scored, status, min_price, max_price, min_roi, sort_by)


@app.get("/anomalies")
def anomalies(
    zip_code: Optional[str] = Query(None, description="ZIP code for anomaly scan"),
    max_count: int = Query(12, ge=3, le=40),
):
    scored = score_properties(load_inventory(zip_code, limit=max_count * 4))
    flagged = sorted(
        [p for p in scored if p.get("anomalous")],
        key=lambda p: p.get("delta") or 0,
        reverse=True,
    )
    return flagged[:max_count]


@app.post("/properties")
def create_property(payload: PropertyIn):
    prop = payload.model_dump()
    prop["id"] = f"user-{uuid.uuid4().hex[:8]}"
    LOCAL_DATA.append(prop)
    scored = score_properties([prop])
    if not scored:
        raise HTTPException(400, "Unable to score property payload")
    return scored[0]
