/**
 * Guess a runnable importer slug from dataset naming (ADR-016 pairs).
 * Used by Run import… to preselect Fitbit vs ICDE when both are runnable.
 */
export function importerSlugForDataset(dataset, contributions) {
  if (!dataset || !contributions?.length) return null;
  const haystack = [dataset.name, dataset.id, dataset.description]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  if (haystack.includes('icde')) {
    return contributions.find((c) => c.slug.includes('icde'))?.slug || null;
  }
  if (haystack.includes('fitbit')) {
    return contributions.find((c) => c.slug.includes('fitbit'))?.slug || null;
  }
  return null;
}

export function resolveRunSlug({ slug, datasetId, localRunTargets, catalogRunTargets, contributions }) {
  if (slug) return slug;
  const allTargets = [...(localRunTargets || []), ...(catalogRunTargets || [])];
  const dataset = allTargets.find((d) => d.id === datasetId) || null;
  return importerSlugForDataset(dataset, contributions) || contributions[0]?.slug || '';
}

/**
 * When importing into an empty catalog row, suggest linking a sibling that already
 * has data for the same importer instead of re-ingesting.
 */
export function findLoadedLinkAlternative({
  targetDatasetId,
  importerSlug,
  localRunTargets,
  catalogRunTargets,
  contributions,
}) {
  if (!importerSlug || !targetDatasetId) return null;
  const all = [...(localRunTargets || []), ...(catalogRunTargets || [])];
  const target = all.find((d) => d.id === targetDatasetId);
  if (!target || Number(target.table_count ?? 0) > 0) return null;

  const matches = (d) =>
    !d.read_only
    && Number(d.table_count ?? 0) > 0
    && importerSlugForDataset(d, contributions) === importerSlug;

  for (const d of localRunTargets || []) {
    if (d.id === targetDatasetId || !matches(d)) continue;
    return { ...d, alreadyLinked: true };
  }
  for (const d of catalogRunTargets || []) {
    if (d.id === targetDatasetId || !matches(d)) continue;
    return { ...d, alreadyLinked: false };
  }
  return null;
}
