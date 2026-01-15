/* eslint-disable react/prop-types */
const formatCurrency = (value) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    value,
  );

function SummaryBar({ totals }) {
  const cards = [
    {
      title: "Avg ROI",
      value: `${totals.avgRoi.toFixed(1)}%`,
      hint: "Weighted across all properties",
    },
    {
      title: "Avg $/sqft",
      value: `$${Math.round(totals.avgPpsf).toLocaleString()}`,
      hint: "Market-normalized density",
    },
    {
      title: "Active Pipeline",
      value: totals.active,
      hint: "Listed or under contract",
    },
    {
      title: "Portfolio Value",
      value: formatCurrency(totals.totalValue),
      hint: "Sum of current list prices",
    },
    {
      title: "Price Range",
      value: `${formatCurrency(totals.priceRange.min)} – ${formatCurrency(totals.priceRange.max)}`,
      hint: "Spread in current search",
    },
    {
      title: "Anomaly Flags",
      value: totals.anomalyCount,
      hint: "Isolation Forest undervalued picks",
    },
  ];

  return (
    <div className="grid gap-4 border-b border-white/10 p-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.title}
          className="rounded-xl bg-white/5 px-4 py-3 text-white shadow-inner shadow-primary-900/40"
        >
          <p className="text-xs uppercase tracking-[0.12em] text-primary-100">{card.title}</p>
          <p className="text-2xl font-semibold">{card.value}</p>
          <p className="text-sm text-slate-300">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}

export default SummaryBar;
