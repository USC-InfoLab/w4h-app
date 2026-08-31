function parseSummary(raw) {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}

function firstNumber(...values) {
  for (const value of values) {
    if (value == null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatDay(value) {
  if (!value) return '';
  const text = String(value);
  const ymd = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const d = ymd
    ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]))
    : new Date(value);
  if (Number.isNaN(d.getTime())) return text;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateRange(range, start, end) {
  if (range && typeof range === 'object' && !Array.isArray(range)) {
    return formatDateRange(null, range.start, range.end);
  }
  if (typeof range === 'string' && range.trim()) return range.trim();
  if (!start && !end) return '';
  if (start && end) return `${formatDay(start)} – ${formatDay(end)}`;
  return formatDay(start || end);
}

function formatDeviceTypes(fromBasic, ...fallbacks) {
  if (Array.isArray(fromBasic) && fromBasic.length) {
    return fromBasic.map((d) => String(d).trim()).filter(Boolean).join(', ');
  }
  if (typeof fromBasic === 'string' && fromBasic.trim()) return fromBasic.trim();
  for (const value of fallbacks) {
    if (value == null || value === '') continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
}

function formatApproxNumber(value, approx = false) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const abs = Math.abs(n);
  let text;
  if (abs >= 1e9) text = `${(n / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  else if (abs >= 1e6) text = `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  else if (abs >= 1e3) text = n.toLocaleString();
  else text = String(Math.round(n));
  return approx && abs > 0 ? `~${text}` : text;
}

function sumRowCounts(rowCounts) {
  if (!rowCounts || typeof rowCounts !== 'object') return null;
  let total = 0;
  let any = false;
  for (const value of Object.values(rowCounts)) {
    const n = Number(value);
    if (!Number.isFinite(n)) continue;
    total += n;
    any = true;
  }
  return any ? total : null;
}

/** Normalize catalog D-02 + cached summary.basic_stats for the Analytics card (ADR-020). */
export function datasetBasicStats(row) {
  const summary = parseSummary(row?.summary);
  const basic =
    summary.basic_stats && typeof summary.basic_stats === 'object' && !Array.isArray(summary.basic_stats)
      ? summary.basic_stats
      : {};
  const rowCounts =
    basic.row_counts && typeof basic.row_counts === 'object' && !Array.isArray(basic.row_counts)
      ? basic.row_counts
      : null;

  // D-02 subject_count wins when populated; else cached distinct-from-tables.
  const subjects = firstNumber(row?.subject_count, basic.subjects_total);
  const tableColumns =
    (row?.table_columns && typeof row.table_columns === 'object' && !Array.isArray(row.table_columns)
      ? row.table_columns
      : null) ||
    (basic.table_columns && typeof basic.table_columns === 'object' && !Array.isArray(basic.table_columns)
      ? basic.table_columns
      : {});
  const tableNames = [
    ...new Set([
      ...(rowCounts ? Object.keys(rowCounts) : []),
      ...Object.keys(tableColumns),
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  const tables = tableNames.map((name) => ({
    name,
    columns: Array.isArray(tableColumns[name])
      ? tableColumns[name].map((col) => String(col || '').trim()).filter(Boolean)
      : [],
  }));
  const tableCount = firstNumber(
    tables.length || null,
    row?.table_count,
    summary.table_count
  );
  let observations = firstNumber(sumRowCounts(rowCounts), summary.observations);
  // Cached estimates can be 0 when physical tables live outside public; prefer table count.
  if (observations === 0 && (tableCount || 0) > 0) observations = null;
  const observationsApprox = rowCounts
    ? true
    : summary.observations_approx === true;

  return {
    id: String(row?.id || row?.dataset_id || ''),
    name: row?.name || row?.id || 'Dataset',
    subjects,
    dateRange: formatDateRange(
      null,
      row?.date_start || basic.date_range?.start || summary.date_start,
      row?.date_end || basic.date_range?.end || summary.date_end
    ),
    deviceTypes: formatDeviceTypes(row?.device_type, basic.device_types),
    tableCount,
    tableNames,
    tables,
    observations,
    observationsApprox: Boolean(observationsApprox && observations != null && observations > 0),
    rowCounts,
    updatedAt: basic.summary_updated_at || row?.summary_updated_at || null,
  };
}

export { formatApproxNumber, formatDateRange, parseSummary };
