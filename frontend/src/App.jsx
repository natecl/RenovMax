import { useEffect, useMemo, useState } from "react";
import { createProperty, fetchAnomalies, fetchProperties } from "./api";
import PropertyCard from "./components/PropertyCard";
import SummaryBar from "./components/SummaryBar";

const defaultProperties = [
  {
    id: 1,
    title: "Maple Street Craftsman",
    address: "412 Maple St, Portland, OR",
    zip_code: "97204",
    price: 625000,
    beds: 3,
    baths: 2,
    sqft: 1820,
    status: "listed",
    roi: 12.4,
    predicted_price: 682000,
    anomalous: false,
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 2,
    title: "Hilltop Modern",
    address: "88 Summit Rd, Austin, TX",
    zip_code: "78701",
    price: 830000,
    beds: 4,
    baths: 3,
    sqft: 2450,
    status: "under_contract",
    roi: 9.8,
    predicted_price: 905000,
    anomalous: false,
    image:
      "https://images.unsplash.com/photo-1430285561322-7808604715df?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 3,
    title: "Lakeview Retreat",
    address: "15 Shoreline Dr, Seattle, WA",
    zip_code: "98101",
    price: 1250000,
    beds: 5,
    baths: 4,
    sqft: 3180,
    status: "listed",
    roi: 10.2,
    predicted_price: 1335000,
    anomalous: false,
    image:
      "https://images.unsplash.com/photo-1600585154340-0ef3c08de660?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 4,
    title: "SoMa Loft",
    address: "240 Brannan St, San Francisco, CA",
    zip_code: "94107",
    price: 1150000,
    beds: 2,
    baths: 2,
    sqft: 1320,
    status: "listed",
    roi: 8.5,
    predicted_price: 1290000,
    anomalous: true,
    image:
      "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=80",
  },
];

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );

const fallbackForestPredict = (prop) => {
  // Lightweight client-side "forest" to keep investment scanning alive offline.
  const trees = [
    (p) => p.sqft * 320 + p.beds * 15000 + p.baths * 12000,
    (p) => p.sqft * 290 + p.beds * 18000 + p.baths * 9000 + (p.zip_code?.endsWith("1") ? 25000 : 0),
    (p) => p.sqft * 305 + p.beds * 14000 + p.baths * 11000 + (p.status === "listed" ? 15000 : 0),
  ];
  const avg = trees.reduce((sum, tree) => sum + tree(prop), 0) / trees.length;
  return Math.round(avg);
};

function App() {
  const [properties, setProperties] = useState(defaultProperties);
  const [spotlight, setSpotlight] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({
    zip: "",
    status: "all",
    minPrice: "",
    maxPrice: "",
    minRoi: "",
    sortBy: "delta",
    anomaliesOnly: false,
  });
  const [form, setForm] = useState({
    title: "",
    address: "",
    zip_code: "",
    price: "",
    beds: "",
    baths: "",
    sqft: "",
    status: "listed",
    image: "",
  });

  const hydrate = (list) =>
    list.map((p) => {
      const price = Number(p.price ?? 0);
      const sqft = p.sqft ? Number(p.sqft) : 0;
      const beds = p.beds ? Number(p.beds) : 0;
      const baths = p.baths ? Number(p.baths) : 0;
      const ppsf = p.ppsf ?? (sqft ? Math.round((price / sqft) * 100) / 100 : null);
      const predicted_price = p.predicted_price ?? fallbackForestPredict({ ...p, price, sqft, beds, baths });
      const delta = predicted_price - price;
      const roi = p.roi ?? (price ? (delta / price) * 100 : 0);
      const anomalous = p.anomalous ?? p.is_anomaly ?? p.is_anomaly_flag ?? false;
      const anomaly_score = p.anomaly_score ?? p.score ?? 0;
      const id = p.id ?? `${p.address}-${p.zip_code}`;
      return { ...p, id, price, sqft, beds, baths, ppsf, predicted_price, delta, roi, anomalous, anomaly_score };
    });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const params = {
          zip_code: filters.zip || undefined,
          status: filters.status !== "all" ? filters.status : undefined,
          min_price: filters.minPrice || undefined,
          max_price: filters.maxPrice || undefined,
          min_roi: filters.minRoi || undefined,
          sort_by: filters.sortBy !== "delta" ? filters.sortBy : undefined,
        };
        const data = await fetchProperties(params);
        setProperties(hydrate(data));

        try {
          const anomalies = await fetchAnomalies({ zip_code: params.zip_code, max_count: 12 });
          setSpotlight(hydrate(anomalies));
        } catch (err) {
          setSpotlight([]);
        }
      } catch (err) {
        setError("Backend unavailable; showing demo data with client-side models.");
        setProperties(hydrate(defaultProperties));
        setSpotlight([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.zip, filters.status, filters.minPrice, filters.maxPrice, filters.minRoi, filters.sortBy]);

  const totals = useMemo(() => {
    const totalValue = properties.reduce((sum, p) => sum + (p.price || 0), 0);
    const avgRoi =
      properties.length > 0
        ? properties.reduce((sum, p) => sum + (p.roi || 0), 0) / properties.length
        : 0;
    const active = properties.filter((p) => p.status !== "sold").length;
    const avgPpsf =
      properties.length > 0
        ? properties.reduce((sum, p) => sum + (p.ppsf || 0), 0) / properties.length
        : 0;
    const priceValues = properties.map((p) => p.price || 0);
    const priceRange =
      priceValues.length > 0
        ? {
            min: Math.min(...priceValues),
            max: Math.max(...priceValues),
          }
        : { min: 0, max: 0 };
    const anomalyCount = properties.filter((p) => p.anomalous).length;
    return { totalValue, avgRoi, active, avgPpsf, priceRange, anomalyCount };
  }, [properties]);

  const clientFiltered = useMemo(() => {
    let data = [...properties];
    if (filters.anomaliesOnly) {
      data = data.filter((p) => p.anomalous);
    }
    const sorters = {
      delta: (a, b) => (b.delta || 0) - (a.delta || 0),
      price: (a, b) => a.price - b.price,
      roi: (a, b) => (b.roi || 0) - (a.roi || 0),
      sqft: (a, b) => a.sqft - b.sqft,
    };
    data.sort(sorters[filters.sortBy] ?? sorters.delta);
    return data;
  }, [filters.anomaliesOnly, filters.sortBy, properties]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        beds: Number(form.beds),
        baths: Number(form.baths),
        sqft: Number(form.sqft),
      };
      const created = await createProperty(payload);
      setProperties((prev) => [hydrate([created])[0], ...prev]);
      setForm({
        title: "",
        address: "",
        zip_code: "",
        price: "",
        beds: "",
        baths: "",
        sqft: "",
        status: "listed",
        image: "",
      });
    } catch (err) {
      setError("Failed to create property; check backend.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-10 sm:px-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-primary-200">Portfolio</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">RenoMax Dashboard</h1>
          <p className="mt-2 max-w-2xl text-slate-300">
            ZIP-searchable, ML-assisted investment scanner with anomaly surfacing and price predictions.
          </p>
        </div>
        <div className="glass rounded-xl px-4 py-3 shadow-glow card-gradient">
          <p className="text-sm text-slate-200">Total Value</p>
          <p className="text-2xl font-semibold text-white">{formatCurrency(totals.totalValue)}</p>
        </div>
      </header>

      <section className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-slate-900/40 p-4 shadow-inner sm:grid-cols-2 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <label className="text-xs uppercase tracking-[0.15em] text-primary-100">ZIP search</label>
          <input
            name="zip"
            value={filters.zip}
            onChange={handleFilterChange}
            placeholder="e.g. 97204"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-primary-100">Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-primary-400 focus:outline-none"
          >
            <option value="all">All</option>
            <option value="listed">Listed</option>
            <option value="under_contract">Under Contract</option>
            <option value="sold">Sold</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-primary-100">Min price</label>
          <input
            type="number"
            name="minPrice"
            value={filters.minPrice}
            onChange={handleFilterChange}
            placeholder="250000"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-primary-100">Max price</label>
          <input
            type="number"
            name="maxPrice"
            value={filters.maxPrice}
            onChange={handleFilterChange}
            placeholder="1200000"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-primary-100">Min ROI (%)</label>
          <input
            type="number"
            name="minRoi"
            value={filters.minRoi}
            onChange={handleFilterChange}
            placeholder="8"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.15em] text-primary-100">Sort by</label>
          <select
            name="sortBy"
            value={filters.sortBy}
            onChange={handleFilterChange}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-primary-400 focus:outline-none"
          >
            <option value="delta">Anomaly delta</option>
            <option value="price">Price</option>
            <option value="roi">ROI</option>
            <option value="sqft">Sq Ft</option>
          </select>
        </div>
        <label className="flex items-center gap-3 lg:col-span-2">
          <input
            type="checkbox"
            name="anomaliesOnly"
            checked={filters.anomaliesOnly}
            onChange={handleFilterChange}
            className="h-4 w-4 accent-primary-400"
          />
          <span className="text-sm text-slate-200">Show undervalued anomalies only</span>
        </label>
      </section>

      <main className="mt-10 grid gap-8 lg:grid-cols-[2fr,1fr]">
        <section className="glass card-gradient rounded-2xl border border-white/10 shadow-xl">
          <SummaryBar totals={totals} />

          {spotlight.length > 0 && (
            <div className="flex items-center gap-4 border-b border-white/10 px-4 py-3 text-sm text-primary-100">
              <span className="rounded-full bg-primary-500/20 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary-100">
                Anomaly spotlight
              </span>
              <div className="flex flex-wrap gap-2">
                {spotlight.slice(0, 6).map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full bg-white/10 px-3 py-1 text-white shadow-inner shadow-primary-900/30"
                  >
                    {p.title} ({p.zip_code}) · Δ {formatCurrency(Math.round(p.delta || 0))}
                  </span>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="p-8 text-slate-200">Loading properties...</div>
          ) : (
            <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {clientFiltered.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          )}

          {error && <div className="px-4 pb-4 text-sm text-amber-300">{error}</div>}
        </section>

        <aside className="glass card-gradient h-fit rounded-2xl border border-white/10 p-6 shadow-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.15em] text-primary-200">New Deal</p>
              <h2 className="text-xl font-semibold text-white">Add Property</h2>
            </div>
            {creating && <span className="text-xs text-primary-100">Saving...</span>}
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              required
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Property title"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
            />
            <input
              required
              name="address"
              value={form.address}
              onChange={handleChange}
              placeholder="Address"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
            />
            <input
              required
              name="zip_code"
              value={form.zip_code}
              onChange={handleChange}
              placeholder="ZIP code"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="number"
                min="0"
                name="price"
                value={form.price}
                onChange={handleChange}
                placeholder="Price"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
              />
              <input
                type="url"
                name="image"
                value={form.image}
                onChange={handleChange}
                placeholder="Image URL"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                required
                type="number"
                min="0"
                name="beds"
                value={form.beds}
                onChange={handleChange}
                placeholder="Beds"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
              />
              <input
                required
                type="number"
                min="0"
                name="baths"
                value={form.baths}
                onChange={handleChange}
                placeholder="Baths"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
              />
              <input
                required
                type="number"
                min="0"
                name="sqft"
                value={form.sqft}
                onChange={handleChange}
                placeholder="Sq Ft"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white placeholder:text-slate-400 focus:border-primary-400 focus:outline-none"
              />
            </div>
            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white focus:border-primary-400 focus:outline-none"
            >
              <option value="listed">Listed</option>
              <option value="under_contract">Under Contract</option>
              <option value="sold">Sold</option>
            </select>
            <button
              type="submit"
              disabled={creating}
              className="w-full rounded-lg bg-gradient-to-r from-primary-500 to-accent px-4 py-2 font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
            >
              Add Property
            </button>
          </form>
        </aside>
      </main>
    </div>
  );
}

export default App;
