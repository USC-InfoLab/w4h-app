export const CONTRIBUTION_KIND_CHOICES = [
  {
    id: 'notebook',
    help: 'Jupyter notebook in the repo — interactive walkthrough.',
  },
  {
    id: 'cli',
    help: 'Command-line entry point, typically for cron or incremental runs.',
  },
  {
    id: 'script',
    help: 'Standalone script that is not a notebook or packaged CLI.',
  },
  {
    id: 'sql',
    help: 'YAML-bound SQL job the API binds and executes. Distinct from a Postgres extension.',
  },
  {
    id: 'postgres_extension',
    help: 'CREATE EXTENSION on the institution’s Postgres (for example fft_approximate).',
  },
  {
    id: 'dataset',
    help: 'Sample-data repo (manifest.yaml plus CSV or JSON). Import code is a separate contribution.',
  },
];

const KIND_ORDER = CONTRIBUTION_KIND_CHOICES.map((k) => k.id);

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
