/** Compact numeric labels for dataset overview and metadata tiles. */
export function formatApproxNumber(value, approx = false) {
  if (value == null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const abs = Math.abs(n);
  let text;
  if (abs >= 1e9) text = `${(n / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  else if (abs >= 1e6) text = `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  else if (abs >= 1e3) text = `${(n / 1e3).toFixed(0)}k`;
  else text = String(Math.round(n));
  return (approx || abs >= 1e6) && abs > 0 ? `~${text}` : text;
}

/** Month + year (no day) for collection dates. */
export function formatMonthYear(value) {
  if (value == null || value === '') return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
}

/** Cached summary date span for aggregate stat tiles. */
export function formatSummaryDateRange(summary) {
  if (!summary) return '';
  if (summary.date_range) return String(summary.date_range);
  const start = summary.date_start || summary.start_date;
  const end = summary.date_end || summary.end_date;
  if (!start && !end) return '';
  const fmt = (v) => formatMonthYear(v) ?? String(v);
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start || end);
}
