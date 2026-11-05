import { ref, watch } from 'vue';

// Help folders meant for the core team / contributors, not end users.
// Hidden from the docs sidebar and search unless the reader opts in.
export const DEVELOPER_DOC_TYPES = ['dev'];

const STORAGE_KEY = 'w4h.docs.showDeveloperDocs';

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

// One shared ref so the sidebar and search page stay in sync.
const showDeveloperDocs = ref(readStored());

watch(showDeveloperDocs, (on) => {
  try {
    localStorage.setItem(STORAGE_KEY, on ? '1' : '0');
  } catch {
    /* private mode: keep in memory only */
  }
});

export function isDeveloperDoc(doc) {
  return DEVELOPER_DOC_TYPES.includes(doc?.doc_type || '');
}

export function useDocsAudience() {
  return { showDeveloperDocs, isDeveloperDoc };
}
