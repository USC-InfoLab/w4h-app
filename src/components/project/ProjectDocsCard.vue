<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { MdEditor, MdPreview } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import { api, authHeaders } from '@/utils/api';
import { useUIStore } from '@/stores/ui';
import { storeToRefs } from 'pinia';

const props = defineProps({
  projectId: { type: String, required: true },
  canEdit: { type: Boolean, default: false },
  initialPages: { type: Array, default: () => [] },
  /** Compact project-landing list (recent docs + View all). */
  landing: { type: Boolean, default: false },
});

const uiStore = useUIStore();
const { darkMode } = storeToRefs(uiStore);

const pages = ref([]);
const loading = ref(false);
const error = ref('');
const search = ref('');
const typeFilter = ref('all');
const landingExpanded = ref(false);
const mode = ref('list'); // list | view | edit
const activeSlug = ref('');
const activePage = ref(null);
const saving = ref(false);
const draft = ref({
  title: '',
  doc_type: 'guide',
  md: '',
});

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'guide', label: 'Guides' },
  { id: 'workflow', label: 'Workflows' },
  { id: 'reference', label: 'References' },
];

const editorTheme = computed(() => (darkMode.value ? 'dark' : 'light'));

function normalizeType(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/s$/, '');
}

function typeLabel(value) {
  const t = normalizeType(value);
  if (t === 'guide') return 'Guide';
  if (t === 'workflow') return 'Workflow';
  if (t === 'reference') return 'Reference';
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Doc';
}

function typeBadgeClass(value) {
  const t = normalizeType(value);
  if (t === 'workflow') return 'text-bg-primary';
  if (t === 'guide') return 'text-bg-success';
  if (t === 'reference') return 'text-bg-secondary';
  return 'text-bg-light border';
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const filteredPages = computed(() => {
  const q = search.value.trim().toLowerCase();
  let rows = (pages.value || []).filter((p) => {
    const t = normalizeType(p.doc_type);
    if (typeFilter.value !== 'all' && t !== typeFilter.value) return false;
    if (!q) return true;
    return `${p.title || ''} ${p.slug || ''} ${t}`.toLowerCase().includes(q);
  });
  if (props.landing && mode.value === 'list' && !landingExpanded.value && !search.value && typeFilter.value === 'all') {
    rows = rows.slice(0, 5);
  }
  return rows;
});

const showListFilters = computed(
  () => !props.landing || landingExpanded.value || !!search.value || typeFilter.value !== 'all'
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
    const res = await api.get(
      `projects/${encodeURIComponent(props.projectId)}/pages`,
      authHeaders()
    );
    pages.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to load project pages.';
    pages.value = [];
  } finally {
    loading.value = false;
  }
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
    draft.value = {
      title: res.data.title || '',
      doc_type: normalizeType(res.data.doc_type) || 'guide',
      md: res.data.md || '',
    };
    mode.value = edit && props.canEdit ? 'edit' : 'view';
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Failed to open page.';
  }
}

function startNew() {
  if (!props.canEdit) return;
  activeSlug.value = '';
  activePage.value = null;
  draft.value = {
    title: 'Untitled document',
    doc_type: 'guide',
    md: '# Untitled document\n\n',
  };
  mode.value = 'edit';
}

function backToList() {
  mode.value = 'list';
  activeSlug.value = '';
  activePage.value = null;
}

async function savePage() {
  if (!props.canEdit || !props.projectId) return;
  saving.value = true;
  error.value = '';
  try {
    const payload = {
      title: String(draft.value.title || '').trim() || 'Untitled document',
      doc_type: draft.value.doc_type || 'guide',
      md: draft.value.md || '',
      keep_slug: true,
    };
    let res;
    if (activeSlug.value) {
      res = await api.put(
        `projects/${encodeURIComponent(props.projectId)}/pages/${encodeURIComponent(activeSlug.value)}`,
        payload,
        authHeaders()
      );
    } else {
      res = await api.post(
        `projects/${encodeURIComponent(props.projectId)}/pages`,
        payload,
        authHeaders()
      );
    }
    activePage.value = res.data;
    activeSlug.value = res.data.slug;
    draft.value = {
      title: res.data.title || '',
      doc_type: normalizeType(res.data.doc_type) || 'guide',
      md: res.data.md || '',
    };
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
  if (!window.confirm(`Delete “${draft.value.title || activeSlug.value}”?`)) return;
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

watch(
  () => props.initialPages,
  () => syncInitial(),
  { deep: true }
);

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
});
</script>

<template>
  <div class="card p-3">
    <div v-if="mode === 'list'">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
        <div>
          <h5 class="card-title mb-1">
            <i class="bi bi-file-earmark-text me-1" aria-hidden="true"></i>
            Project documentation
          </h5>
          <p class="small text-muted mb-0">
            Workflows, guides, and project information written in Markdown.
            Private to this project.
          </p>
        </div>
        <button
          v-if="canEdit"
          type="button"
          class="btn btn-sm btn-primary"
          @click="startNew"
        >
          + New document
        </button>
      </div>

      <div v-if="!landing || showListFilters" class="row g-2 align-items-center mb-3">
        <div class="col-12 col-md">
          <input
            v-model="search"
            type="search"
            class="form-control form-control-sm"
            placeholder="Search documentation..."
            aria-label="Search documentation"
          />
        </div>
        <div class="col-12 col-md-auto">
          <div class="btn-group btn-group-sm" role="group" aria-label="Filter by type">
            <button
              v-for="f in TYPE_FILTERS"
              :key="f.id"
              type="button"
              class="btn"
              :class="typeFilter === f.id ? 'btn-primary' : 'btn-outline-secondary'"
              @click="typeFilter = f.id"
            >
              {{ f.label }}
            </button>
          </div>
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
        <li
          v-for="page in filteredPages"
          :key="page.slug"
          class="list-group-item px-0"
        >
          <button
            type="button"
            class="btn btn-link text-start text-decoration-none p-0 w-100"
            @click="openPage(page.slug, false)"
          >
            <div class="fw-semibold">{{ page.title || page.slug }}</div>
            <div class="small text-muted">
              <span class="badge me-1" :class="typeBadgeClass(page.doc_type)">{{ typeLabel(page.doc_type) }}</span>
              <template v-if="formatDate(page.updated_at)">
                Updated {{ formatDate(page.updated_at) }}
              </template>
              <template v-if="page.updated_by"> by {{ page.updated_by }}</template>
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
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="backToList">
          ← Back to list
        </button>
        <div class="d-flex flex-wrap gap-2">
          <template v-if="mode === 'view' && canEdit">
            <button type="button" class="btn btn-sm btn-primary" @click="mode = 'edit'">Edit</button>
            <button type="button" class="btn btn-sm btn-outline-danger" :disabled="saving" @click="deletePage">
              Delete
            </button>
          </template>
          <template v-else-if="mode === 'edit'">
            <button type="button" class="btn btn-sm btn-primary" :disabled="saving" @click="savePage">
              <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
              Save
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="saving"
              @click="activeSlug ? openPage(activeSlug, false) : backToList()"
            >
              Cancel
            </button>
          </template>
        </div>
      </div>

      <div v-if="error" class="alert alert-danger py-2 small">{{ error }}</div>

      <template v-if="mode === 'edit'">
        <div class="row g-2 mb-2">
          <div class="col-md-8">
            <label class="form-label small mb-0">Title</label>
            <input v-model="draft.title" type="text" class="form-control form-control-sm" />
          </div>
          <div class="col-md-4">
            <label class="form-label small mb-0">Type</label>
            <select v-model="draft.doc_type" class="form-select form-select-sm">
              <option value="guide">Guide</option>
              <option value="workflow">Workflow</option>
              <option value="reference">Reference</option>
            </select>
          </div>
        </div>
        <MdEditor
          v-model="draft.md"
          language="en-US"
          :theme="editorTheme"
          :preview="true"
          :toolbars-exclude="['github']"
          style="height: 420px"
        />
      </template>

      <template v-else-if="activePage">
        <h4 class="mb-1">{{ activePage.title }}</h4>
        <div class="small text-muted mb-3">
          <span class="badge me-1" :class="typeBadgeClass(activePage.doc_type)">{{ typeLabel(activePage.doc_type) }}</span>
          <template v-if="formatDate(activePage.updated_at)">
            Updated {{ formatDate(activePage.updated_at) }}
          </template>
          <template v-if="activePage.updated_by"> by {{ activePage.updated_by }}</template>
        </div>
        <MdPreview :model-value="activePage.md || ''" :theme="editorTheme" />
      </template>
    </div>
  </div>
</template>
