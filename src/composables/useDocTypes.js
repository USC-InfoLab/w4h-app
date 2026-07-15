import { ref } from 'vue';
import { api, authHeaders } from '@/utils/api';

/** Display labels for known doc types (folder names in w4h-docs). */
export const DOC_TYPE_LABELS = {
  guide: 'Guides',
  tutorial: 'Tutorials',
  reference: 'Reference',
  faq: 'FAQs',
  internal: 'Internal',
  other: 'Other',
  dev: 'Developer',
};

/** Sidebar / list ordering — matches legacy SQL CASE order. */
export const DOC_TYPE_ORDER = ['guide', 'tutorial', 'reference', 'faq', 'internal', 'other', 'dev'];

const docTypes = ref([]);
const loaded = ref(false);
let loadPromise = null;

function asTypeList(types) {
  const list = types ?? docTypes.value;
  return Array.isArray(list) ? list : [];
}

function formatDocTypeLabel(type) {
  if (!type) return '';
  const known = DOC_TYPE_LABELS[type];
  if (known) return known;
  const fromApi = asTypeList().find((t) => t.slug === type);
  if (fromApi?.label) return fromApi.label;
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function typeSortOrder(slug) {
  if (!slug) return 0;
  const idx = DOC_TYPE_ORDER.indexOf(slug);
  return idx >= 0 ? idx + 1 : 99;
}

async function fetchDocTypes({ force = false } = {}) {
  if (loaded.value && !force) return docTypes.value;
  if (loadPromise && !force) return loadPromise;

  loadPromise = api.get('/docs/types', authHeaders())
    .then((res) => {
      docTypes.value = Array.isArray(res.data) ? res.data : [];
      loaded.value = true;
      return docTypes.value;
    })
    .catch((err) => {
      console.error('Failed to fetch doc types', err);
      docTypes.value = [];
      return docTypes.value;
    })
    .finally(() => {
      loadPromise = null;
    });

  return loadPromise;
}

async function createDocType({ slug, label, sort_order = 0 }) {
  const res = await api.post('/docs/types', { slug, label, sort_order }, authHeaders());
  const created = res.data;
  const current = asTypeList();
  docTypes.value = [...current, created].sort(
    (a, b) => typeSortOrder(a.slug) - typeSortOrder(b.slug) || a.slug.localeCompare(b.slug)
  );
  return created;
}

export function useDocTypes() {
  return {
    docTypes,
    loaded,
    fetchDocTypes,
    createDocType,
    formatDocTypeLabel,
    typeSortOrder,
    DOC_TYPE_LABELS,
    DOC_TYPE_ORDER,
  };
}
