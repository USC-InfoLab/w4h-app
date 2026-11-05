/**
 * Project page categories (`doc_type`): free-form labels per project. The
 * defaults are always offered; anything a page uses is added to the list.
 */
export const DEFAULT_CATEGORIES = ['Report', 'Guide', 'Workflow', 'Reference'];
export const DEFAULT_NEW_CATEGORY = 'Report';

const FIXED_COLORS = {
  report: '#7d3c98',
  guide: '#1e8449',
  workflow: '#1f618d',
  reference: '#6c757d',
};
const PALETTE = ['#b9770e', '#c0392b', '#117a65', '#2e4053', '#a04000', '#6c3483', '#1a5276', '#7b7d32'];

export function categoryKey(value) {
  return String(value || '').trim().toLowerCase();
}

/** Older pages store lowercase keys (`guide`); show them capitalized. */
export function categoryLabel(value) {
  const s = String(value || '').trim();
  if (!s) return 'Uncategorized';
  return s === s.toLowerCase() ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function categoryColor(value) {
  const key = categoryKey(value);
  if (FIXED_COLORS[key]) return FIXED_COLORS[key];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

/** Defaults plus every category in use, with page counts; in-use first by count. */
export function buildCategories(pages) {
  const byKey = new Map();
  for (const label of DEFAULT_CATEGORIES) {
    byKey.set(categoryKey(label), { key: categoryKey(label), value: label, label, count: 0 });
  }
  for (const p of pages || []) {
    const key = categoryKey(p.doc_type);
    if (!key) continue;
    const row = byKey.get(key);
    if (row) {
      row.count += 1;
      if (row.count === 1) row.value = p.doc_type;
    } else {
      byKey.set(key, { key, value: p.doc_type, label: categoryLabel(p.doc_type), count: 1 });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label)
  );
}
