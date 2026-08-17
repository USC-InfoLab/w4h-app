const KIND_ORDER = ['notebook', 'cli', 'script', 'postgres_extension'];

export function contributionKinds(row) {
  const extra = Array.isArray(row?.kinds) ? row.kinds : [];
  const seen = new Set();
  const out = [];
  for (const raw of [...extra, row?.kind]) {
    const k = String(raw || '').trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  out.sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b));
  return out;
}
