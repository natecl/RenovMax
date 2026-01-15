const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );

export default function PropertyCard({ property }) {
  if (!property) return null;
  const {
    title,
    address,
    zip_code,
    beds,
    baths,
    sqft,
    price,
    predicted_price,
    delta,
    roi,
    anomalous,
    status,
    image,
    ppsf,
  } = property;

  const deltaColor = delta >= 0 ? "text-emerald-300" : "text-rose-300";
  const badgeClass = anomalous
    ? "bg-emerald-400/20 text-emerald-200 border border-emerald-400/40"
    : "bg-white/10 text-slate-200 border border-white/10";

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70 shadow-xl transition hover:-translate-y-1 hover:shadow-glow">
      <div className="absolute inset-0 blueprint-grid opacity-60" aria-hidden />
      {image && (
        <div
          className="h-36 w-full bg-cover bg-center opacity-90"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}
      <div className="relative space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-primary-100">{zip_code}</p>
            <h3 className="text-lg font-semibold text-white">{title || address}</h3>
            <p className="text-sm text-slate-300">{address}</p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
            {anomalous ? "Undervalued" : "Tracked"}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-200">
          <span className="rounded-full bg-white/5 px-3 py-1">
            {beds} bd · {baths} ba
          </span>
          <span className="rounded-full bg-white/5 px-3 py-1">{sqft?.toLocaleString()} sqft</span>
          <span className="rounded-full bg-white/5 px-3 py-1">{ppsf ? `$${Math.round(ppsf)}/sf` : "—/sf"}</span>
          <span className="rounded-full bg-white/5 px-3 py-1 capitalize">{status}</span>
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-xl bg-white/5 p-3 text-sm text-slate-200">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-primary-100">List</p>
            <p className="text-xl font-semibold text-white">{formatCurrency(price || 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.12em] text-primary-100">Model</p>
            <p className="text-xl font-semibold text-accent">{formatCurrency(Math.round(predicted_price || 0))}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-primary-100">Δ vs ask</p>
            <p className={`text-lg font-semibold ${deltaColor}`}>
              {delta >= 0 ? "+" : ""}
              {formatCurrency(Math.round(delta || 0))}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.12em] text-primary-100">ROI signal</p>
            <p className="text-lg font-semibold text-amber-200">{(roi ?? 0).toFixed(1)}%</p>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 pointer-events-none opacity-0 transition group-hover:opacity-100">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent/10" />
        <div className="absolute -right-12 -top-12 h-24 w-24 rotate-12 rounded-full border border-primary-500/50" />
      </div>
    </article>
  );
}
