<template>
  <main class="container-fluid py-3 project-hub">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item">
          <RouterLink :to="{ name: 'studies' }">Projects</RouterLink>
        </li>
        <li class="breadcrumb-item active" aria-current="page">{{ project.name }}</li>
      </ol>
    </nav>

    <header class="mb-3">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <div class="small text-muted">{{ id }}</div>
          <h3 class="mb-1">{{ project.name }}</h3>
          <div class="small text-muted">
            {{ project.status }} · {{ project.visibility }}
            <span v-if="project.irbProtocolId"> · {{ project.irbProtocolId }}</span>
            <span v-if="project.irbExpiryDate"> · expires {{ formatShortDate(project.irbExpiryDate) }}</span>
          </div>
        </div>

        <div class="d-flex gap-2">
          <button class="btn btn-outline-secondary" type="button" @click="openProjectModal">Edit project</button>
          <button class="btn btn-primary" type="button" @click="openNotebookModal">+ Add notebook</button>
        </div>
      </div>
    </header>

    <div class="row g-3">
      <div class="col-12 col-xl-7">
        <section class="card mb-3">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="mb-0">Notebooks <small class="text-muted">({{ project.notebooks.length }})</small></h6>
              <small class="text-muted">Tracked links, not hosted runtime</small>
            </div>

            <div v-if="project.notebooks.length === 0" class="text-muted small">No notebooks tracked yet.</div>

            <div v-for="nb in project.notebooks" :key="nb.id" class="border rounded p-3 mb-2">
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div class="fw-semibold">{{ nb.title }}</div>
                  <div class="small text-muted">{{ nb.description || 'No description.' }}</div>
                </div>
                <span class="badge text-bg-light">{{ nb.purpose }}</span>
              </div>

              <div class="small text-muted mt-2 font-monospace">
                {{ nb.repoRef || 'main' }} · {{ shortSha(nb.repoSha) }}
              </div>
              <div class="small text-break font-monospace">{{ nb.notebookPath }}</div>

              <div class="d-flex flex-wrap gap-2 mt-2">
                <button
                  v-for="launcher in nb.launchers"
                  :key="launcher"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  @click="launchNotebook(launcher, nb)"
                >
                  {{ launcherLabel(launcher) }}
                </button>
              </div>
            </div>

            <button class="btn btn-link px-0" type="button" @click="openNotebookModal">+ Add notebook</button>
          </div>
        </section>

        <section class="card">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="mb-0">Project documentation</h6>
              <button class="btn btn-sm btn-outline-secondary" type="button" @click="addDoc">+ New page</button>
            </div>

            <div v-if="project.docs.length === 0" class="text-muted small">No docs yet.</div>

            <ul class="list-group list-group-flush">
              <li v-for="doc in project.docs" :key="doc.id" class="list-group-item px-0 d-flex justify-content-between align-items-center">
                <RouterLink :to="{ name: 'docs', params: { slug: doc.slug } }" class="text-decoration-none">
                  {{ doc.title }}
                </RouterLink>
                <small class="text-muted">edited {{ relativeDate(doc.updatedAt) }}</small>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <aside class="col-12 col-xl-5">
        <section class="card mb-3">
          <div class="card-body">
            <h6 class="mb-2">Collaborating organizations</h6>
            <div v-for="org in project.organizations" :key="org.id" class="d-flex gap-2 align-items-start mb-2">
              <span class="badge text-bg-light">{{ org.short }}</span>
              <div>
                <div class="fw-semibold">{{ org.name }}</div>
                <small class="text-muted">{{ org.role }}</small>
              </div>
            </div>
          </div>
        </section>

        <section class="card mb-3">
          <div class="card-body">
            <h6 class="mb-2">Members</h6>
            <div v-for="m in project.members" :key="m.id" class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div class="fw-semibold">{{ m.name }}</div>
                <small class="text-muted">{{ m.org }}</small>
              </div>
              <span class="badge text-bg-secondary">{{ m.role }}</span>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="mb-0">Datasets</h6>
              <button class="btn btn-sm btn-outline-secondary" type="button" @click="openProjectModal">Edit links</button>
            </div>

            <div v-if="linkedDatasets.length === 0" class="text-muted small">No datasets linked to this project.</div>

            <div v-for="d in linkedDatasets" :key="d.id" class="border rounded p-2 mb-2">
              <div class="fw-semibold">{{ d.name || d.id }}</div>
              <div class="small text-muted">{{ d.study_id || 'study n/a' }} · {{ d.version || 'v1.0.0' }}</div>
              <div class="small text-muted text-truncate" :title="d.description || ''">{{ d.description || 'No description' }}</div>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <div class="modal fade" tabindex="-1" ref="projectModalEl" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Project settings</h5>
            <button type="button" class="btn-close" @click="closeProjectModal" aria-label="Close" />
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-6">
                <label class="form-label">Project name</label>
                <input v-model="project.name" class="form-control" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Status</label>
                <select v-model="project.status" class="form-select">
                  <option value="active">active</option>
                  <option value="archived">archived</option>
                </select>
              </div>
              <div class="col-md-6">
                <label class="form-label">IRB protocol</label>
                <input v-model="project.irbProtocolId" class="form-control" placeholder="IRB-2024-112" />
              </div>
              <div class="col-md-6">
                <label class="form-label">IRB expiry</label>
                <input v-model="project.irbExpiryDate" type="date" class="form-control" />
              </div>
              <div class="col-12">
                <label class="form-label">Visibility</label>
                <select v-model="project.visibility" class="form-select">
                  <option>Org-private</option>
                  <option>Project-private</option>
                  <option>Internal</option>
                </select>
              </div>
            </div>

            <hr class="my-3" />

            <h6>Launcher configuration</h6>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label">Jupyter base URL</label>
                <input v-model="project.launchers.jupyterBaseUrl" class="form-control font-monospace" placeholder="https://jupyter.example.org" />
              </div>
              <div class="col-12">
                <label class="form-label">RStudio base URL</label>
                <input v-model="project.launchers.rstudioBaseUrl" class="form-control font-monospace" placeholder="https://rstudio.example.org" />
              </div>
              <div class="col-12">
                <label class="form-label">VSCode URL template</label>
                <input v-model="project.launchers.vscodeTemplate" class="form-control font-monospace" placeholder="vscode://file/{path}" />
                <small class="text-muted">Variables: {'{path}'}, {'{repo_url}'}, {'{repo_ref}'}</small>
              </div>
            </div>

            <hr class="my-3" />

            <h6>Linked datasets (project-level)</h6>
            <div v-if="availableDatasets.length === 0" class="text-muted small">No datasets available for your account.</div>
            <div v-else class="dataset-picker border rounded p-2">
              <label v-for="d in availableDatasets" :key="d.id" class="d-flex align-items-start gap-2 mb-2 small">
                <input type="checkbox" class="form-check-input mt-1" :checked="linkedDatasetSet.has(d.id)" @change="toggleDatasetLink(d.id)" />
                <span>
                  <strong>{{ d.name || d.id }}</strong>
                  <span class="text-muted ms-1">{{ d.id }}</span>
                </span>
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeProjectModal">Cancel</button>
            <button type="button" class="btn btn-primary" @click="saveProject">Save</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" tabindex="-1" ref="notebookModalEl" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add notebook link</h5>
            <button type="button" class="btn-close" @click="closeNotebookModal" aria-label="Close" />
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">Title</label>
                <input v-model="notebookForm.title" class="form-control" />
              </div>
              <div class="col-md-4">
                <label class="form-label">Purpose</label>
                <select v-model="notebookForm.purpose" class="form-select">
                  <option>exploration</option>
                  <option>preprocessing</option>
                  <option>analysis</option>
                  <option>visualization</option>
                  <option>report</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label">Description</label>
                <input v-model="notebookForm.description" class="form-control" />
              </div>
              <div class="col-md-8">
                <label class="form-label">Repository URL</label>
                <input v-model="notebookForm.repoUrl" class="form-control font-monospace" placeholder="https://github.com/org/repo" />
              </div>
              <div class="col-md-4">
                <label class="form-label">Ref (branch/tag/sha)</label>
                <input v-model="notebookForm.repoRef" class="form-control font-monospace" placeholder="main" />
              </div>
              <div class="col-12">
                <label class="form-label">Notebook path</label>
                <input v-model="notebookForm.notebookPath" class="form-control font-monospace" placeholder="notebooks/hrv_analysis.ipynb" />
              </div>
              <div class="col-12">
                <label class="form-label d-block">Launchers</label>
                <div class="d-flex gap-3">
                  <label class="form-check-label"><input class="form-check-input me-1" type="checkbox" value="jupyter" v-model="notebookForm.launchers" />Jupyter</label>
                  <label class="form-check-label"><input class="form-check-input me-1" type="checkbox" value="rstudio" v-model="notebookForm.launchers" />RStudio</label>
                  <label class="form-check-label"><input class="form-check-input me-1" type="checkbox" value="vscode" v-model="notebookForm.launchers" />VSCode</label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeNotebookModal">Cancel</button>
            <button type="button" class="btn btn-primary" :disabled="!canSaveNotebook" @click="saveNotebook">Save notebook</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { Modal } from 'bootstrap';
import { useRoute, useRouter } from 'vue-router';

import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

const route = useRoute();
const router = useRouter();

const id = computed(() => String(route.params.id || ''));
const availableDatasets = ref([]);

const project = ref({
  id: '',
  name: 'Project',
  status: 'active',
  visibility: 'Org-private',
  irbProtocolId: '',
  irbExpiryDate: '',
  notebooks: [],
  docs: [],
  members: [],
  organizations: [],
  linkedDatasetIds: [],
  launchers: {
    jupyterBaseUrl: '',
    rstudioBaseUrl: '',
    vscodeTemplate: 'vscode://file/{path}'
  }
});

const notebookForm = ref(newNotebookForm());

const projectModalEl = ref(null);
const notebookModalEl = ref(null);
let projectModal = null;
let notebookModal = null;

const linkedDatasetSet = computed(() => new Set(project.value.linkedDatasetIds || []));
const linkedDatasets = computed(() => {
  const lookup = new Map(availableDatasets.value.map(d => [String(d.id), d]));
  return (project.value.linkedDatasetIds || []).map((datasetId) => lookup.get(String(datasetId)) || {
    id: datasetId,
    name: datasetId,
    study_id: '',
    description: '',
    version: ''
  });
});

const canSaveNotebook = computed(() => {
  const f = notebookForm.value;
  return Boolean((f.title || '').trim() && (f.notebookPath || '').trim());
});

function newNotebookForm() {
  return {
    title: '',
    description: '',
    purpose: 'analysis',
    repoUrl: '',
    repoRef: 'main',
    notebookPath: '',
    launchers: ['jupyter', 'vscode']
  };
}

function storageKey(suffix) {
  return `w4h.project.${id.value}.${suffix}`;
}

function seedProject() {
  const projectId = id.value || 'project';
  return {
    id: projectId,
    name: projectId,
    status: 'active',
    visibility: 'Org-private',
    irbProtocolId: '',
    irbExpiryDate: '',
    notebooks: [],
    docs: [
      { id: `${Date.now()}-doc-1`, title: 'Project overview & objectives', slug: 'home', updatedAt: new Date().toISOString() }
    ],
    members: [
      { id: 'me', name: 'Current User', role: 'owner', org: 'Local workspace' }
    ],
    organizations: [],
    linkedDatasetIds: [],
    launchers: {
      jupyterBaseUrl: '',
      rstudioBaseUrl: '',
      vscodeTemplate: 'vscode://file/{path}'
    }
  };
}

function normalizeProject(raw) {
  const base = seedProject();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    notebooks: Array.isArray(raw.notebooks) ? raw.notebooks : base.notebooks,
    docs: Array.isArray(raw.docs) ? raw.docs : base.docs,
    members: Array.isArray(raw.members) ? raw.members : base.members,
    organizations: Array.isArray(raw.organizations) ? raw.organizations : base.organizations,
    linkedDatasetIds: Array.isArray(raw.linkedDatasetIds) ? raw.linkedDatasetIds.map(String) : [],
    launchers: {
      ...base.launchers,
      ...(raw.launchers || {})
    }
  };
}

function loadProject() {
  try {
    const raw = localStorage.getItem(storageKey('hub'));
    const parsed = raw ? JSON.parse(raw) : null;
    project.value = normalizeProject(parsed);
  } catch {
    project.value = seedProject();
  }
}

function persistProject() {
  localStorage.setItem(storageKey('hub'), JSON.stringify(project.value));
}

async function loadDatasets() {
  try {
    const res = await api.get('datasets', authHeaders());
    availableDatasets.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    availableDatasets.value = [];
  }
}

function shortSha(value) {
  return String(value || '').slice(0, 7) || '—';
}

function formatShortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

function relativeDate(value) {
  const d = new Date(value || Date.now());
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'today';
  const days = Math.round(diff / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function launcherLabel(value) {
  if (value === 'rstudio') return 'RStudio';
  if (value === 'vscode') return 'VSCode';
  return 'Jupyter';
}

function encodePathForUrl(pathValue) {
  return String(pathValue || '')
    .split('/')
    .map(seg => encodeURIComponent(seg))
    .join('/');
}

function launchNotebook(launcher, notebook) {
  const p = String(notebook.notebookPath || '').trim();
  let url = '';

  if (launcher === 'jupyter') {
    const base = String(project.value.launchers.jupyterBaseUrl || '').trim();
    if (!base || !p) return;
    url = `${base.replace(/\/$/, '')}/lab/tree/${encodePathForUrl(p)}`;
  } else if (launcher === 'rstudio') {
    const base = String(project.value.launchers.rstudioBaseUrl || '').trim();
    if (!base || !p) return;
    url = `${base.replace(/\/$/, '')}/?file=${encodeURIComponent(p)}`;
  } else {
    const template = String(project.value.launchers.vscodeTemplate || '').trim();
    if (!template || !p) return;
    url = template
      .replace('{path}', encodeURIComponent(p))
      .replace('{repo_url}', encodeURIComponent(String(notebook.repoUrl || '')))
      .replace('{repo_ref}', encodeURIComponent(String(notebook.repoRef || 'main')));
  }

  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

function openProjectModal() {
  projectModal?.show();
}

function closeProjectModal() {
  projectModal?.hide();
}

function saveProject() {
  persistProject();
  closeProjectModal();
}

function toggleDatasetLink(datasetId) {
  const idValue = String(datasetId || '');
  const current = new Set(project.value.linkedDatasetIds || []);
  if (current.has(idValue)) current.delete(idValue);
  else current.add(idValue);
  project.value.linkedDatasetIds = Array.from(current);
}

function openNotebookModal() {
  notebookForm.value = newNotebookForm();
  notebookModal?.show();
}

function closeNotebookModal() {
  notebookModal?.hide();
}

function saveNotebook() {
  if (!canSaveNotebook.value) return;
  const now = Date.now();
  project.value.notebooks = [
    {
      id: `${now}-nb`,
      title: notebookForm.value.title.trim(),
      description: notebookForm.value.description.trim(),
      purpose: notebookForm.value.purpose,
      repoUrl: notebookForm.value.repoUrl.trim(),
      repoRef: notebookForm.value.repoRef.trim() || 'main',
      repoSha: notebookForm.value.repoRef.trim() || 'main',
      notebookPath: notebookForm.value.notebookPath.trim(),
      launchers: notebookForm.value.launchers.length ? [...notebookForm.value.launchers] : ['jupyter']
    },
    ...project.value.notebooks
  ];
  persistProject();
  closeNotebookModal();
}

function addDoc() {
  const title = window.prompt('Documentation page title');
  if (!title) return;
  const slug = `project-${id.value}-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
  project.value.docs = [
    {
      id: `${Date.now()}-doc`,
      title: title.trim(),
      slug: slug || 'home',
      updatedAt: new Date().toISOString()
    },
    ...project.value.docs
  ];
  persistProject();
}

onMounted(async () => {
  document.title = `${APP_NAME} Project`;
  if (!id.value) {
    router.replace({ name: 'studies' });
    return;
  }

  loadProject();
  await loadDatasets();

  if (projectModalEl.value) projectModal = new Modal(projectModalEl.value);
  if (notebookModalEl.value) notebookModal = new Modal(notebookModalEl.value);
});
</script>

<style scoped>
.project-hub .card {
  border-radius: 0.75rem;
}

.dataset-picker {
  max-height: 260px;
  overflow: auto;
}

@media (max-width: 1199.98px) {
  aside {
    order: 2;
  }
}
</style>
