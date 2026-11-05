<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import mermaid from 'mermaid';
import RichDocEditor from '@/components/RichDocEditor.vue';
import CategoryPicker from '@/components/project/CategoryPicker.vue';
import CategoryManager from '@/components/project/CategoryManager.vue';
import { api, authHeaders } from '@/utils/api';
import { useUIStore } from '@/stores/ui';
import { storeToRefs } from 'pinia';
import {
  DEFAULT_NEW_CATEGORY,
  buildCategories,
  categoryColor,
  categoryKey,
  categoryLabel,
} from '@/utils/pageCategories';

const props = defineProps({
  projectId: { type: String, required: true },
  canEdit: { type: Boolean, default: false },
  initialPages: { type: Array, default: () => [] },
  /** Compact project-landing list (recent docs + View all). */
  landing: { type: Boolean, default: false },
  /** Sidebar + read pane. Editing always takes the full width. */
  workspace: { type: Boolean, default: false },
});

const uiStore = useUIStore();
const { darkMode } = storeToRefs(uiStore);

const pages = ref([]);
const loading = ref(false);
const error = ref('');
const search = ref('');
const categoryFilter = ref('all');
const landingExpanded = ref(false);
const mode = ref('list'); // list | view | edit
const activeSlug = ref('');
const activePage = ref(null);
const saving = ref(false);
const renaming = ref(false);
const rootEl = ref(null);
const draft = ref({ title: '', doc_type: DEFAULT_NEW_CATEGORY, html: '' });
let draftSnapshot = '';

const editorTheme = computed(() => (darkMode.value ? 'dark' : 'light'));
const categories = computed(() => buildCategories(pages.value));
const usedCategories = computed(() => categories.value.filter((c) => c.count > 0));
const dirty = computed(() => mode.value === 'edit' && JSON.stringify(draft.value) !== draftSnapshot);

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const filteredPages = computed(() => {
  const q = search.value.trim().toLowerCase();
  let rows = (pages.value || []).filter((p) => {
    if (categoryFilter.value !== 'all' && categoryKey(p.doc_type) !== categoryFilter.value) return false;
    if (!q) return true;
    return `${p.title || ''} ${p.slug || ''} ${p.doc_type || ''}`.toLowerCase().includes(q);
  });
  if (props.landing && mode.value === 'list' && !landingExpanded.value && !search.value && categoryFilter.value === 'all') {
    rows = rows.slice(0, 5);
  }
  return rows;
});

const showListFilters = computed(
  () => !props.landing || landingExpanded.value || !!search.value || categoryFilter.value !== 'all'
);

function syncInitial() {
  if (Array.isArray(props.initialPages) && props.initialPages.length) {
    pages.value = props.initialPages.map((p) => ({ ...p }));
  }
}

async function loadPages() {
  if (!props.projectId) return;
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get(`projects/${encodeURIComponent(props.projectId)}/pages`, authHeaders());
    pages.value = Array.isArray(res.data) ? res.data : [];
    if (categoryFilter.value !== 'all' && !usedCategories.value.some((c) => c.key === categoryFilter.value)) {
      categoryFilter.value = 'all';
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to load project pages.';
    pages.value = [];
  } finally {
    loading.value = false;
  }
}

function setDraftFrom(page) {
  draft.value = {
    title: page?.title || '',
    doc_type: page?.doc_type || DEFAULT_NEW_CATEGORY,
    html: page?.html || '',
  };
  draftSnapshot = JSON.stringify(draft.value);
}

async function openPage(slug, edit = false) {
  error.value = '';
  try {
    const res = await api.get(
      `projects/${encodeURIComponent(props.projectId)}/pages/${encodeURIComponent(slug)}`,
      authHeaders()
    );
    activePage.value = res.data;
    activeSlug.value = res.data.slug;
    setDraftFrom(res.data);
    mode.value = edit && props.canEdit ? 'edit' : 'view';
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to open page.';
  }
}

function startEdit() {
  setDraftFrom(activePage.value);
  mode.value = 'edit';
}

function startNew() {
  if (!props.canEdit) return;
  activeSlug.value = '';
  activePage.value = null;
  setDraftFrom({
    title: '',
    doc_type: categoryFilter.value !== 'all'
      ? (usedCategories.value.find((c) => c.key === categoryFilter.value)?.value || DEFAULT_NEW_CATEGORY)
      : DEFAULT_NEW_CATEGORY,
    html: '',
  });
  mode.value = 'edit';
}

function backToList() {
  mode.value = 'list';
  activeSlug.value = '';
  activePage.value = null;
}

function cancelEdit() {
  if (dirty.value && !window.confirm('Discard your changes?')) return;
  if (activeSlug.value) {
    setDraftFrom(activePage.value);
    mode.value = 'view';
  } else {
    backToList();
  }
}

async function savePage() {
  if (!props.canEdit || !props.projectId || saving.value) return;
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      title: String(draft.value.title || '').trim() || 'Untitled document',
      doc_type: String(draft.value.doc_type || '').trim() || DEFAULT_NEW_CATEGORY,
      html: draft.value.html || '',
      keep_slug: true,
    };
    const base = `projects/${encodeURIComponent(props.projectId)}/pages`;
    const res = activeSlug.value
      ? await api.put(`${base}/${encodeURIComponent(activeSlug.value)}`, payload, authHeaders())
      : await api.post(base, payload, authHeaders());
    activePage.value = res.data;
    activeSlug.value = res.data.slug;
    setDraftFrom(res.data);
    await loadPages();
    mode.value = 'view';
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to save page.';
  } finally {
    saving.value = false;
  }
}

async function deletePage() {
  if (!props.canEdit || !activeSlug.value) return;
  if (!window.confirm(`Delete “${activePage.value?.title || activeSlug.value}”?`)) return;
  saving.value = true;
  error.value = '';
  try {
    await api.delete(
      `projects/${encodeURIComponent(props.projectId)}/pages/${encodeURIComponent(activeSlug.value)}`,
      authHeaders()
    );
    await loadPages();
    backToList();
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to delete page.';
  } finally {
    saving.value = false;
  }
}

async function renameCategory(from, to) {
  renaming.value = true;
  error.value = '';
  try {
    const res = await api.patch(
      `projects/${encodeURIComponent(props.projectId)}/page-categories`,
      { from, to },
      authHeaders()
    );
    if (categoryFilter.value === categoryKey(from)) categoryFilter.value = categoryKey(res.data?.to || to);
    await loadPages();
    if (activePage.value && categoryKey(activePage.value.doc_type) === categoryKey(from)) {
      activePage.value = { ...activePage.value, doc_type: res.data?.to || to };
    }
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to rename category.';
  } finally {
    renaming.value = false;
  }
}

/** Markdown copy made by the API from the page HTML (ADR-030; lossy). */
function downloadMarkdown() {
  const page = activePage.value;
  if (!page) return;
  const body = `# ${page.title || page.slug}\n\n${page.md || ''}`;
  const url = URL.createObjectURL(new Blob([body], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${page.slug || 'page'}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

async function renderMermaid() {
  await nextTick();
  const nodes = [...(rootEl.value?.querySelectorAll('.page-view .mermaid') || [])].filter(
    (el) => !el.querySelector('svg')
  );
  if (!nodes.length) return;
  mermaid.initialize({ startOnLoad: false, theme: darkMode.value ? 'dark' : 'default' });
  try {
    await mermaid.run({ nodes });
  } catch {
    /* a broken diagram shows its source */
  }
}

/** ⌘S / Ctrl+S saves while editing. */
function onKeydown(e) {
  if (mode.value !== 'edit') return;
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault();
    savePage();
  }
}

/** Warn before leaving the browser tab with unsaved edits. */
function onBeforeUnload(e) {
  if (!dirty.value) return;
  e.preventDefault();
  e.returnValue = '';
}

watch([mode, activePage], () => {
  if (mode.value === 'view') renderMermaid();
});
watch(() => props.initialPages, () => syncInitial(), { deep: true });
watch(
  () => props.projectId,
  () => {
    backToList();
    loadPages();
  }
);

onMounted(() => {
  syncInitial();
  loadPages();
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('beforeunload', onBeforeUnload);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('beforeunload', onBeforeUnload);
});
</script>

<template>
  <div ref="rootEl" :class="workspace || mode === 'edit' ? 'docs-workspace card overflow-hidden' : 'card p-3'">
    <!-- Editing: full width, no page list or search. -->
    <div v-if="mode === 'edit'" class="page-editor">
      <div class="page-editor__bar">
        <button type="button" class="btn btn-sm btn-link text-decoration-none px-0" :disabled="saving" @click="cancelEdit">
          <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>{{ activeSlug ? 'Back to page' : 'Pages' }}
        </button>
        <div class="ms-auto d-flex align-items-center gap-2">
          <span v-if="dirty" class="small text-muted">Unsaved changes</span>
          <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="saving" @click="cancelEdit">Cancel</button>
          <button type="button" class="btn btn-sm btn-primary" :disabled="saving" v-tooltip="'Save  ⌘S'" @click="savePage">
            <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
            Save
          </button>
        </div>
      </div>
      <div v-if="error" class="alert alert-danger py-2 small mx-4 mt-3 mb-0">{{ error }}</div>
      <div class="page-editor__head">
        <input
          v-model="draft.title"
          type="text"
          class="page-editor__title"
          placeholder="Untitled document"
          aria-label="Title"
        />
        <CategoryPicker v-model="draft.doc_type" :categories="categories" />
      </div>
      <RichDocEditor v-model="draft.html" :theme="editorTheme" class="page-editor__body" />
    </div>

    <!-- Workspace: page list + read pane. -->
    <div v-else-if="workspace" class="row g-0">
      <div class="col-12 col-md-4 col-xl-3 border-end docs-nav">
        <div class="p-3 border-bottom d-flex align-items-center justify-content-between gap-2">
          <strong>Pages</strong>
          <button v-if="canEdit" type="button" class="btn btn-sm btn-primary" @click="startNew">+ New</button>
        </div>
        <div class="p-2 border-bottom">
          <input
            v-model="search"
            type="search"
            class="form-control form-control-sm"
            placeholder="Search…"
            aria-label="Search documentation"
          />
          <div v-if="usedCategories.length" class="cat-filters mt-2">
            <button type="button" class="cat-chip" :class="{ 'is-on': categoryFilter === 'all' }" @click="categoryFilter = 'all'">
              All <span class="cat-count">{{ pages.length }}</span>
            </button>
            <button
              v-for="c in usedCategories"
              :key="c.key"
              type="button"
              class="cat-chip"
              :class="{ 'is-on': categoryFilter === c.key }"
              :style="{ '--cat': categoryColor(c.value) }"
              @click="categoryFilter = categoryFilter === c.key ? 'all' : c.key"
            >
              <span class="cat-dot"></span>{{ c.label }} <span class="cat-count">{{ c.count }}</span>
            </button>
            <CategoryManager v-if="canEdit" :categories="categories" :busy="renaming" @rename="renameCategory" />
          </div>
        </div>
        <div v-if="loading" class="p-3 small text-muted">Loading…</div>
        <div v-else-if="pages.length === 0" class="p-3 small text-muted">No documents yet.</div>
        <div v-else class="list-group list-group-flush">
          <button
            v-for="page in filteredPages"
            :key="page.slug"
            type="button"
            class="list-group-item list-group-item-action text-start"
            :class="{ active: page.slug === activeSlug }"
            @click="openPage(page.slug, false)"
          >
            <div class="fw-semibold text-truncate">{{ page.title || page.slug }}</div>
            <div class="small d-flex align-items-center gap-1 opacity-75">
              <span class="cat-dot" :style="{ '--cat': categoryColor(page.doc_type) }"></span>
              {{ categoryLabel(page.doc_type) }}
            </div>
          </button>
        </div>
      </div>
      <div class="col-12 col-md-8 col-xl-9 p-3 docs-main">
        <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>
        <div v-if="mode === 'list' || !activePage" class="text-muted py-5 text-center">
          Select a page to read it.
          <span v-if="canEdit"> Use <strong>+ New</strong> to write one.</span>
        </div>
        <template v-else>
          <div class="d-flex flex-wrap gap-2 mb-3">
            <template v-if="canEdit">
              <button type="button" class="btn btn-sm btn-primary" @click="startEdit">Edit</button>
              <button type="button" class="btn btn-sm btn-outline-danger" :disabled="saving" @click="deletePage">Delete</button>
            </template>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="downloadMarkdown">
              <i class="bi bi-download me-1" aria-hidden="true"></i>Download .md
            </button>
          </div>
          <h3 class="mb-1">{{ activePage.title }}</h3>
          <div class="small text-muted mb-3 d-flex flex-wrap align-items-center gap-2">
            <span class="cat-chip cat-chip--static" :style="{ '--cat': categoryColor(activePage.doc_type) }">
              <span class="cat-dot"></span>{{ categoryLabel(activePage.doc_type) }}
            </span>
            <span v-if="formatDate(activePage.updated_at)">
              Updated {{ formatDate(activePage.updated_at) }}<template v-if="activePage.updated_by"> by {{ activePage.updated_by }}</template>
            </span>
          </div>
          <div :key="activePage.updated_at" class="page-html page-view" v-html="activePage.html || ''"></div>
        </template>
      </div>
    </div>

    <!-- Card: list or read view. -->
    <template v-else>
      <div v-if="mode === 'list'">
        <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
          <div>
            <h5 class="card-title mb-1">
              <i class="bi bi-file-earmark-text me-1" aria-hidden="true"></i>
              Project documentation
            </h5>
            <p class="small text-muted mb-0">Reports, workflows, guides, and project information. Private to this project.</p>
          </div>
          <button v-if="canEdit" type="button" class="btn btn-sm btn-primary" @click="startNew">+ New document</button>
        </div>

        <div v-if="!landing || showListFilters" class="mb-3">
          <input
            v-model="search"
            type="search"
            class="form-control form-control-sm mb-2"
            placeholder="Search documentation..."
            aria-label="Search documentation"
          />
          <div v-if="usedCategories.length" class="cat-filters">
            <button type="button" class="cat-chip" :class="{ 'is-on': categoryFilter === 'all' }" @click="categoryFilter = 'all'">
              All <span class="cat-count">{{ pages.length }}</span>
            </button>
            <button
              v-for="c in usedCategories"
              :key="c.key"
              type="button"
              class="cat-chip"
              :class="{ 'is-on': categoryFilter === c.key }"
              :style="{ '--cat': categoryColor(c.value) }"
              @click="categoryFilter = categoryFilter === c.key ? 'all' : c.key"
            >
              <span class="cat-dot"></span>{{ c.label }} <span class="cat-count">{{ c.count }}</span>
            </button>
            <CategoryManager v-if="canEdit" :categories="categories" :busy="renaming" @rename="renameCategory" />
          </div>
        </div>

        <div v-if="loading" class="small text-muted">Loading…</div>
        <div v-else-if="error" class="text-danger small">{{ error }}</div>
        <div v-else-if="pages.length === 0" class="small text-muted">
          No documents yet.
          <template v-if="canEdit"> Use <strong>+ New document</strong> to create the first one.</template>
        </div>
        <div v-else-if="filteredPages.length === 0" class="small text-muted">No matching documents.</div>
        <ul v-else class="list-group list-group-flush">
          <li v-for="page in filteredPages" :key="page.slug" class="list-group-item px-0">
            <button type="button" class="btn btn-link text-start text-decoration-none p-0 w-100" @click="openPage(page.slug, false)">
              <div class="fw-semibold">{{ page.title || page.slug }}</div>
              <div class="small text-muted d-flex flex-wrap align-items-center gap-2">
                <span class="cat-chip cat-chip--static" :style="{ '--cat': categoryColor(page.doc_type) }">
                  <span class="cat-dot"></span>{{ categoryLabel(page.doc_type) }}
                </span>
                <span v-if="formatDate(page.updated_at)">
                  Updated {{ formatDate(page.updated_at) }}<template v-if="page.updated_by"> by {{ page.updated_by }}</template>
                </span>
              </div>
            </button>
          </li>
        </ul>

        <div v-if="landing && pages.length && !landingExpanded" class="mt-2">
          <button type="button" class="btn btn-link btn-sm px-0 text-decoration-none" @click="landingExpanded = true">
            View all documentation →
          </button>
        </div>
      </div>

      <div v-else>
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="backToList">← Back to list</button>
          <div class="d-flex flex-wrap gap-2">
            <template v-if="canEdit">
              <button type="button" class="btn btn-sm btn-primary" @click="startEdit">Edit</button>
              <button type="button" class="btn btn-sm btn-outline-danger" :disabled="saving" @click="deletePage">Delete</button>
            </template>
            <button v-if="activePage" type="button" class="btn btn-sm btn-outline-secondary" @click="downloadMarkdown">
              <i class="bi bi-download me-1" aria-hidden="true"></i>Download .md
            </button>
          </div>
        </div>
        <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>
        <template v-if="activePage">
          <h4 class="mb-1">{{ activePage.title }}</h4>
          <div class="small text-muted mb-3 d-flex flex-wrap align-items-center gap-2">
            <span class="cat-chip cat-chip--static" :style="{ '--cat': categoryColor(activePage.doc_type) }">
              <span class="cat-dot"></span>{{ categoryLabel(activePage.doc_type) }}
            </span>
            <span v-if="formatDate(activePage.updated_at)">
              Updated {{ formatDate(activePage.updated_at) }}<template v-if="activePage.updated_by"> by {{ activePage.updated_by }}</template>
            </span>
          </div>
          <div :key="activePage.updated_at" class="page-html page-view" v-html="activePage.html || ''"></div>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.docs-nav {
  min-height: 28rem;
}
.cat-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}
.page-editor__bar {
  position: sticky;
  top: 0;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.5rem;
  border-bottom: 1px solid var(--bs-border-color);
  background: var(--bs-body-bg);
}
.page-editor__head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 1.5rem 1.5rem 0.75rem;
}
.page-editor__title {
  width: 100%;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  color: var(--bs-body-color);
  font-size: 2rem;
  font-weight: 600;
  line-height: 1.2;
}
.page-editor__title::placeholder {
  color: var(--bs-secondary-color);
  opacity: 0.6;
}
.page-editor__body {
  margin: 0 1.5rem 1.5rem;
  min-height: calc(100vh - 16rem);
}
</style>

<style>
/* Category chips and dots (also used by CategoryPicker / CategoryManager). */
.cat-dot {
  display: inline-block;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 50%;
  background: var(--cat, var(--bs-secondary-color));
  flex: 0 0 auto;
}
.cat-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.15rem 0.6rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 999px;
  background: transparent;
  color: var(--bs-body-color);
  font-size: 0.78rem;
  line-height: 1.5;
  white-space: nowrap;
}
button.cat-chip:hover {
  background: var(--bs-tertiary-bg);
}
.cat-chip.is-on {
  border-color: var(--cat, var(--bs-primary));
  background: color-mix(in srgb, var(--cat, var(--bs-primary)) 14%, transparent);
  font-weight: 600;
}
.cat-chip--static,
.cat-chip--button {
  border-color: color-mix(in srgb, var(--cat) 40%, transparent);
  background: color-mix(in srgb, var(--cat) 12%, transparent);
}
.cat-chip--button {
  padding: 0.25rem 0.7rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.cat-count {
  color: var(--bs-secondary-color);
  font-weight: 400;
}

/* Project page body, shared by the read view and the rich-text editor. */
.page-html {
  line-height: 1.6;
  overflow-wrap: anywhere;
}
/* Body headings sit under the page title. */
.page-html h2 {
  font-size: 1.4rem;
  margin-top: 1.25rem;
}
.page-html h3 {
  font-size: 1.2rem;
  margin-top: 1rem;
}
.page-html h4 {
  font-size: 1.05rem;
  margin-top: 0.9rem;
}
.page-html img {
  max-width: 100%;
  height: auto;
}
.page-html table {
  width: 100%;
  margin: 0.75rem 0;
  border-collapse: collapse;
  table-layout: auto;
}
.page-html th,
.page-html td {
  position: relative;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--bs-border-color);
  vertical-align: top;
}
.page-html th {
  background: var(--bs-tertiary-bg);
  font-weight: 600;
}
.page-html th > p,
.page-html td > p {
  margin: 0;
}
.page-html blockquote {
  margin: 0.75rem 0;
  padding-left: 0.9rem;
  border-left: 3px solid var(--bs-border-color);
  color: var(--bs-secondary-color);
}
.page-html pre {
  padding: 0.6rem 0.8rem;
  border-radius: 0.4rem;
  background: var(--bs-tertiary-bg);
  overflow-x: auto;
}
.page-html code {
  font-size: 0.875em;
}
.page-html mark {
  padding: 0 0.1em;
  border-radius: 0.15em;
}
.page-html .mermaid {
  margin: 0.75rem 0;
  text-align: center;
}
[data-bs-theme='dark'] .page-html mark {
  color: #111;
}
</style>
