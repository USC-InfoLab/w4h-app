// Builds ECharts options from the shapes returned by POST /datasets/:id/analytics/series
// (ADR-029). Pure functions: data in, option out. No vendor knowledge anywhere.

// Okabe–Ito: distinguishable with the common kinds of colour-blindness.
export const PALETTE = [
  '#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#6a51a3', '#7f7f7f',
];

export function readTheme() {
  const css = getComputedStyle(document.documentElement);
  const get = (name, fallback) => (css.getPropertyValue(name).trim() || fallback);
  return {
    text: get('--bs-body-color', '#212529'),
    muted: get('--bs-secondary-color', '#6c757d'),
    border: get('--bs-border-color', '#dee2e6'),
    bg: get('--bs-body-bg', '#ffffff'),
  };
}

function base(theme, extra = {}) {
  return {
    color: PALETTE,
    // Timestamps are wall-clock times stored without a zone and sent as UTC-labelled ISO text;
    // render them as-is rather than shifting them into the browser's timezone.
    useUTC: true,
    backgroundColor: 'transparent',
    textStyle: { color: theme.text },
    aria: { enabled: true },
    animation: false,
    grid: { left: 52, right: 16, top: 28, bottom: 56, containLabel: false },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: theme.bg,
      borderColor: theme.border,
      textStyle: { color: theme.text },
    },
    legend: { type: 'scroll', top: 0, textStyle: { color: theme.muted } },
    ...extra,
  };
}

const axisCommon = (theme) => ({
  axisLine: { lineStyle: { color: theme.border } },
  axisTick: { lineStyle: { color: theme.border } },
  axisLabel: { color: theme.muted },
  splitLine: { lineStyle: { color: theme.border, opacity: 0.6 } },
  nameTextStyle: { color: theme.muted },
});

// Readable time ticks at every zoom level (day, hour, minute).
const timeAxis = (theme) => ({
  type: 'time',
  ...axisCommon(theme),
  axisLabel: {
    color: theme.muted,
    hideOverlap: true,
    formatter: {
      year: '{yyyy}',
      month: '{MMM} {yyyy}',
      day: '{MMM} {d}',
      hour: '{MMM} {d} {HH}:{mm}',
      minute: '{HH}:{mm}',
      second: '{HH}:{mm}:{ss}',
      millisecond: '{HH}:{mm}:{ss}',
    },
  },
});

const zoom = [
  { type: 'inside', filterMode: 'none' },
  { type: 'slider', height: 18, bottom: 8, filterMode: 'none' },
];

/** series: [{ key, points: [[iso, value], ...] }] */
export function lineOption(series, theme, { yName = '', band = null, stepped = false } = {}) {
  const lines = (series || []).map((s, i) => ({
    name: s.key,
    type: 'line',
    showSymbol: false,
    sampling: 'lttb',
    step: stepped ? 'end' : false,
    lineStyle: { width: s.emphasis ? 2.5 : 1.6, type: s.dashed ? 'dashed' : 'solid' },
    itemStyle: s.color ? { color: s.color } : undefined,
    data: s.points,
    markArea: i === 0 && band && band.min != null && band.max != null
      ? {
          silent: true,
          itemStyle: { color: 'rgba(0, 158, 115, 0.12)' },
          data: [[{ yAxis: band.min }, { yAxis: band.max }]],
        }
      : undefined,
  }));
  return base(theme, {
    legend: { show: lines.length > 1, type: 'scroll', top: 0, textStyle: { color: theme.muted } },
    xAxis: timeAxis(theme),
    yAxis: { type: 'value', name: yName, scale: true, ...axisCommon(theme) },
    dataZoom: zoom,
    series: lines,
  });
}

export function histogramOption(histogram, theme, { xName = '' } = {}) {
  return base(theme, {
    legend: { show: false },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, confine: true,
      backgroundColor: theme.bg, borderColor: theme.border, textStyle: { color: theme.text } },
    xAxis: {
      type: 'category', name: xName, nameLocation: 'middle', nameGap: 32,
      data: (histogram || []).map((h) => `${h.x0}–${h.x1}`),
      ...axisCommon(theme),
      axisLabel: { color: theme.muted, hideOverlap: true },
    },
    yAxis: { type: 'value', name: 'Count', ...axisCommon(theme) },
    series: [{ type: 'bar', data: (histogram || []).map((h) => h.count), barCategoryGap: '8%' }],
  });
}

/** box: [{ key, min, q1, median, q3, max, n }] */
export function boxOption(box, theme, { yName = '' } = {}) {
  return base(theme, {
    legend: { show: false },
    tooltip: { trigger: 'item', confine: true, backgroundColor: theme.bg,
      borderColor: theme.border, textStyle: { color: theme.text } },
    xAxis: { type: 'category', data: (box || []).map((b) => b.key), ...axisCommon(theme) },
    yAxis: { type: 'value', name: yName, scale: true, ...axisCommon(theme) },
    series: [{
      type: 'boxplot',
      data: (box || []).map((b) => [b.min, b.q1, b.median, b.q3, b.max]),
      itemStyle: { color: 'rgba(0,114,178,0.18)', borderColor: PALETTE[0] },
    }],
  });
}

/** cells: [[iso, subject, count], ...] */
export function heatmapOption(coverage, theme) {
  const days = (coverage?.days || []).map((d) => (coverage.resolution === 'hour' ? d.slice(0, 13).replace('T', ' ') : d.slice(0, 10)));
  const subjects = coverage?.subjects || [];
  const dayIndex = new Map((coverage?.days || []).map((d, i) => [d, i]));
  const subjIndex = new Map(subjects.map((s, i) => [s, i]));
  const data = (coverage?.cells || []).map(([t, s, n]) => [dayIndex.get(t), subjIndex.get(s), n]);
  const max = data.reduce((m, d) => Math.max(m, d[2]), 1);
  return base(theme, {
    legend: { show: false },
    grid: { left: 70, right: 24, top: 12, bottom: 70 },
    tooltip: { trigger: 'item', confine: true, backgroundColor: theme.bg,
      borderColor: theme.border, textStyle: { color: theme.text },
      formatter: (p) => `${subjects[p.value[1]]}<br/>${days[p.value[0]]}: <b>${p.value[2]}</b> observations` },
    xAxis: { type: 'category', data: days, splitArea: { show: true }, ...axisCommon(theme),
      axisLabel: { color: theme.muted, hideOverlap: true } },
    yAxis: { type: 'category', data: subjects, splitArea: { show: true }, ...axisCommon(theme) },
    visualMap: { min: 0, max, calculable: false, orient: 'horizontal', left: 'center', bottom: 6,
      itemWidth: 12, itemHeight: 120, textStyle: { color: theme.muted },
      inRange: { color: ['#f2f2f2', '#9ecae1', '#0072B2'] } },
    series: [{ type: 'heatmap', data, emphasis: { itemStyle: { borderColor: theme.text, borderWidth: 1 } } }],
  });
}

/** points: [[x, y, subject], ...] */
export function scatterOption(scatter, theme) {
  const bySubject = new Map();
  for (const [x, y, s] of scatter?.points || []) {
    if (!bySubject.has(s)) bySubject.set(s, []);
    bySubject.get(s).push([x, y]);
  }
  const label = (a) => `${a?.signal || ''} · ${a?.value || ''}`;
  return base(theme, {
    legend: { show: bySubject.size > 1, type: 'scroll', top: 0, textStyle: { color: theme.muted } },
    tooltip: { trigger: 'item', confine: true, backgroundColor: theme.bg,
      borderColor: theme.border, textStyle: { color: theme.text } },
    xAxis: { type: 'value', name: label(scatter?.x), nameLocation: 'middle', nameGap: 32, scale: true, ...axisCommon(theme) },
    yAxis: { type: 'value', name: label(scatter?.y), scale: true, ...axisCommon(theme) },
    dataZoom: [{ type: 'inside', filterMode: 'none' }],
    series: [...bySubject.entries()].map(([name, data]) => ({
      name, type: 'scatter', symbolSize: 6, data, large: data.length > 2000,
    })),
  });
}

/** events: [[iso, subject, label], ...]  — one row per subject, one colour per label. */
export function eventsOption(result, theme) {
  const subjects = result?.subjects || [];
  const labels = [...new Set((result?.events || []).map((e) => e[2]))];
  const shown = labels.slice(0, 10);
  const series = shown.map((label) => ({
    name: label,
    type: 'scatter',
    symbolSize: 10,
    data: (result.events || []).filter((e) => e[2] === label)
      .map((e) => ({ value: [e[0], e[1]], label })),
  }));
  const rest = (result?.events || []).filter((e) => !shown.includes(e[2]));
  if (rest.length) series.push({ name: 'other', type: 'scatter', symbolSize: 10, data: rest.map((e) => ({ value: [e[0], e[1]], label: e[2] })) });
  return base(theme, {
    legend: { type: 'scroll', top: 0, textStyle: { color: theme.muted } },
    tooltip: { trigger: 'item', confine: true, backgroundColor: theme.bg,
      borderColor: theme.border, textStyle: { color: theme.text },
      formatter: (p) => `${p.data.label}<br/>${p.value[1]} · ${String(p.value[0]).replace('T', ' ').slice(0, 16)}` },
    xAxis: timeAxis(theme),
    yAxis: { type: 'category', data: subjects, ...axisCommon(theme) },
    dataZoom: [{ type: 'inside', filterMode: 'none' }, { type: 'slider', height: 18, bottom: 8, filterMode: 'none' }],
    series,
  });
}

/** Rows for "view as table" and CSV export, per result shape. */
export function tableFor(kind, result) {
  if (!result) return { columns: [], rows: [] };
  if (kind === 'series') {
    return {
      columns: ['series', 'time', 'value'],
      rows: (result.series || []).flatMap((s) => s.points.map(([t, v]) => [s.key, t, v])),
    };
  }
  if (kind === 'distribution') {
    return {
      columns: ['from', 'to', 'count'],
      rows: (result.histogram || []).map((h) => [h.x0, h.x1, h.count]),
    };
  }
  if (kind === 'box') {
    return {
      columns: ['subject', 'min', 'q1', 'median', 'q3', 'max', 'n'],
      rows: (result.box || []).map((b) => [b.key, b.min, b.q1, b.median, b.q3, b.max, b.n]),
    };
  }
  if (kind === 'coverage') {
    return { columns: ['period', 'subject', 'observations'], rows: result.cells || [] };
  }
  if (kind === 'scatter') {
    return { columns: ['x', 'y', 'subject'], rows: result.points || [] };
  }
  if (kind === 'events') {
    return { columns: ['time', 'subject', 'label'], rows: result.events || [] };
  }
  return { columns: [], rows: [] };
}

export function toCsv({ columns, rows }) {
  const esc = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n');
}
