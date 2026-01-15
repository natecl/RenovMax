const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:8000";

function toQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchProperties(params) {
  const res = await fetch(`${API_BASE}/properties${toQuery(params)}`);
  if (!res.ok) {
    throw new Error("Failed to fetch properties");
  }
  return res.json();
}

export async function fetchAnomalies(params) {
  const res = await fetch(`${API_BASE}/anomalies${toQuery(params)}`);
  if (!res.ok) {
    throw new Error("Failed to fetch anomalies");
  }
  return res.json();
}

export async function createProperty(payload) {
  const res = await fetch(`${API_BASE}/properties`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error("Failed to create property");
  }
  return res.json();
}
