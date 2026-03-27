<template>
  <main class="container-fluid pt-2 pb-4">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item">
          <RouterLink :to="{ name: 'studies' }">Projects</RouterLink>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
          {{ projectTitle }}
        </li>
      </ol>
    </nav>

    <div class="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-3">
      <div>
        <h4 class="mb-0">{{ projectTitle }}</h4>
        <small class="text-muted">Project workspace</small>
      </div>

      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-sm btn-outline-secondary" type="button" @click="refreshProject" :disabled="loading">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1" />
          Refresh
        </button>
        <button class="btn btn-sm btn-primary" type="button" @click="openStartAnalysis"
          :disabled="selectedStudies.length === 0" title="Select at least one study to start analysis">
          <i class="bi bi-play-fill me-1" /> Start analysis
        </button>
      </div>
    </div>

    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'manage' }" @click="activeTab = 'manage'">
          Manage
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'monitor' }" @click="activeTab = 'monitor'">
          Monitor
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'visualize' }" @click="activeTab = 'visualize'">
          Visualize
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" :class="{ active: activeTab === 'settings' }" @click="activeTab = 'settings'">
          Settings
        </button>
      </li>
    </ul>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <section v-if="activeTab === 'manage'">
      <div class="row g-3">
        <div class="col-12 col-lg-3">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">Project items</h6>
                <span class="badge text-bg-secondary">{{ selectedStudies.length }}</span>
              </div>
              <div class="input-group input-group-sm mb-2">
                <span class="input-group-text">Search</span>
                <input v-model="studySearch" class="form-control" placeholder="Filter studies..." />
              </div>

              <div class="list-group small project-list">
                <button v-for="s in filteredStudies" :key="s.id" type="button"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  :class="{ active: selectedStudyIdsSet.has(s.id) }" @click="toggleStudy(s.id)">
                  <span class="text-truncate">{{ s.name || s.id }}</span>
                  <span class="badge text-bg-light">{{ s.id }}</span>
                </button>
              </div>

              <div v-if="!loading && studies.length === 0" class="text-muted small mt-2">
                No studies available for this account.
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-6">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="mb-2">Selected studies</h6>
              <div v-if="selectedStudies.length === 0" class="text-muted">
                Select one or more studies to start analysis.
              </div>
              <div v-else class="d-flex flex-wrap gap-2">
                <span v-for="s in selectedStudies" :key="s.id" class="badge rounded-pill text-bg-primary">
                  {{ s.name || s.id }}
                  <button type="button" class="btn-close btn-close-white ms-2" aria-label="Remove"
                    @click="toggleStudy(s.id)" />
                </span>
              </div>

              <hr class="my-3" />

              <h6 class="mb-2">Datasets (placeholder)</h6>
              <div class="text-muted">
                Next: show datasets filtered by selected studies and allow multi-study analysis configuration.
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="mb-2">Details</h6>
              <div class="text-muted">
                No item selected.
              </div>
              <hr class="my-3" />
              <small class="text-muted d-block">
                This panel mirrors the UKB “details” side panel. We’ll populate it as we add real workspace items.
              </small>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'monitor'">
      <div class="row g-3">
        <div class="col-12 col-xl-8">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">Runs</h6>
                <button class="btn btn-sm btn-outline-secondary" type="button" @click="clearRuns" :disabled="runs.length === 0">
                  Clear
                </button>
              </div>

              <div class="row g-2 mb-3">
                <div class="col-md-4">
                  <input v-model="monitorSearch" class="form-control form-control-sm" placeholder="Search run name..." />
                </div>
                <div class="col-md-3">
                  <select v-model="monitorStatus" class="form-select form-select-sm">
                    <option value="">All status</option>
                    <option value="queued">Queued</option>
                    <option value="running">Running</option>
                    <option value="done">Done</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div class="col-md-3">
                  <select v-model="monitorTool" class="form-select form-select-sm">
                    <option value="">All tools</option>
                    <option value="JupyterLab">JupyterLab</option>
                    <option value="RStudio">RStudio</option>
                    <option value="Script/Docker">Script/Docker</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <button class="btn btn-sm btn-outline-secondary w-100" type="button" @click="resetMonitorFilters">
                    Reset
                  </button>
                </div>
              </div>

              <div v-if="runs.length === 0" class="text-muted">
                No runs yet. Click <strong>Start analysis</strong> to create one.
              </div>

              <div v-else-if="filteredRuns.length === 0" class="text-muted">
                No runs match the current filters.
              </div>

              <div v-else class="table-responsive">
                <table class="table table-sm align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>Tool</th>
                      <th>Studies</th>
                      <th>Source</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="r in filteredRuns" :key="r.id" role="button"
                      :class="{ 'table-active': selectedRun?.id === r.id }" @click="selectRun(r)">
                      <td class="text-truncate" style="max-width: 260px;">
                        {{ r.name }}
                      </td>
                      <td>
                        <span class="badge" :class="statusBadgeClass(r.status)">
                          {{ r.status }}
                        </span>
                      </td>
                      <td>{{ r.tool }}</td>
                      <td>{{ r.studyIds?.length || 0 }}</td>
                      <td class="text-muted">{{ r.source || 'local' }}</td>
                      <td class="text-muted">{{ formatDateTime(r.createdAt) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-xl-4">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="mb-2">Run details</h6>

              <div v-if="!selectedRun" class="text-muted">
                Select a run to inspect details and payload context.
              </div>

              <div v-else>
                <div class="small"><strong>Name:</strong> {{ selectedRun.name }}</div>
                <div class="small"><strong>Status:</strong> {{ selectedRun.status }}</div>
                <div class="small"><strong>Tool:</strong> {{ selectedRun.tool }}</div>
                <div class="small"><strong>Project:</strong> {{ selectedRun.projectId || id }}</div>
                <div class="small"><strong>Created:</strong> {{ formatDateTime(selectedRun.createdAt) }}</div>
                <div class="small mb-2"><strong>Source:</strong> {{ selectedRun.source || 'local' }}</div>

                <div class="small fw-semibold mb-1">Study IDs</div>
                <div v-if="!selectedRun.studyIds?.length" class="text-muted small mb-2">
                  No studies attached.
                </div>
                <div v-else class="d-flex flex-wrap gap-1 mb-2">
                  <span v-for="sid in selectedRun.studyIds" :key="sid" class="badge text-bg-secondary">{{ sid }}</span>
                </div>

                <div class="small fw-semibold mb-1">Payload preview</div>
                <pre class="payload-preview mb-0">{{ selectedRunPayloadPreview }}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'visualize'">
      <div class="card">
        <div class="card-body">
          <h6 class="mb-2">Visualize</h6>
          <div class="text-muted">
            Placeholder for viewers/dashboards (UKB “Visualize”). We’ll connect this after we have real run outputs.
          </div>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'settings'">
      <div class="card">
        <div class="card-body">
          <h6 class="mb-2">Project settings</h6>
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label">Project ID</label>
              <input class="form-control" :value="id" disabled />
            </div>
            <div class="col-md-6">
              <label class="form-label">Display name (local)</label>
              <input v-model="localProjectName" class="form-control" placeholder="Optional name just for this browser" />
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-sm btn-primary" type="button" @click="saveLocalProjectName">
              Save
            </button>
            <button class="btn btn-sm btn-outline-secondary ms-2" type="button" @click="resetLocalProjectName"
              :disabled="!localProjectName">
              Reset
            </button>
          </div>
          <small class="text-muted d-block mt-2">
            Next: store project metadata in backend and allow sharing across users/orgs.
          </small>
        </div>
      </div>
    </section>

    <div class="modal fade" tabindex="-1" ref="startModalEl" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Start analysis</h5>
            <button type="button" class="btn-close" @click="closeStartAnalysis" aria-label="Close" />
          </div>
          <div class="modal-body">
            <div v-if="selectedStudies.length === 0" class="alert alert-warning">
              Select at least one study in the <strong>Manage</strong> tab before starting analysis.
            </div>

            <div class="mb-3">
              <label class="form-label">Tool</label>
              <select v-model="newRun.tool" class="form-select">
                <option value="JupyterLab">JupyterLab</option>
                <option value="RStudio">RStudio</option>
                <option value="Script/Docker">Script/Docker</option>
              </select>
            </div>

            <div class="mb-3">
              <label class="form-label">Run name</label>
              <input v-model="newRun.name" class="form-control" placeholder="e.g. cohort-selection" />
              <small class="text-muted">This will appear under Monitor.</small>
            </div>

            <div class="alert alert-light border mb-3">
              <div><strong>Project:</strong> {{ id }}</div>
              <div><strong>Studies selected:</strong> {{ selectedStudies.length }}</div>
            </div>

            <div class="alert alert-info mb-0">
              The app will try backend launch first, then fall back to local simulation if the endpoint is unavailable.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeStartAnalysis">Cancel</button>
            <button type="button" class="btn btn-primary" @click="createRun" :disabled="selectedStudies.length === 0">
              Start
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Modal } from 'bootstrap';

import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

const router = useRouter();
const route = useRoute();
const id = computed(() => String(route.params.id || ''));

const loading = ref(false);
const errorMessage = ref('');
const studies = ref([]);
const activeTab = ref('manage');
const studySearch = ref('');

const localProjectName = ref('');

const startModalEl = ref(null);
let startModal = null;

const newRun = ref({ tool: 'JupyterLab', name: '' });
const runs = ref([]);
const selectedRunId = ref('');
const monitorSearch = ref('');
const monitorStatus = ref('');
const monitorTool = ref('');

const selectedStudyIds = ref([]);
const selectedStudyIdsSet = computed(() => new Set(selectedStudyIds.value));
const selectedStudies = computed(() => studies.value.filter(s => selectedStudyIdsSet.value.has(s.id)));
const selectedRun = computed(() => runs.value.find(r => r.id === selectedRunId.value) || null);

const filteredRuns = computed(() => {
  const q = monitorSearch.value.trim().toLowerCase();
  return runs.value.filter((r) => {
    if (monitorStatus.value && r.status !== monitorStatus.value) return false;
    if (monitorTool.value && r.tool !== monitorTool.value) return false;
    if (q && !String(r.name || '').toLowerCase().includes(q)) return false;
    return true;
  });
});

const selectedRunPayloadPreview = computed(() => {
  if (!selectedRun.value) return '';
  const payload = {
    projectId: selectedRun.value.projectId || id.value,
    name: selectedRun.value.name,
    tool: selectedRun.value.tool,
    studyIds: selectedRun.value.studyIds || []
  };
  return JSON.stringify(payload, null, 2);
});

const projectTitle = computed(() => localProjectName.value?.trim() || id.value || 'Project');

function storageKey(suffix) {
  return `w4h.project.${id.value}.${suffix}`;
}

function loadLocalState() {
  try {
    const name = localStorage.getItem(storageKey('name')) || '';
    localProjectName.value = name;
  } catch {
    localProjectName.value = '';
  }

  try {
    const raw = localStorage.getItem(storageKey('selectedStudies'));
    selectedStudyIds.value = raw ? JSON.parse(raw) : [];
  } catch {
    selectedStudyIds.value = [];
  }

  try {
    const raw = localStorage.getItem(storageKey('runs'));
    runs.value = raw ? JSON.parse(raw) : [];
    if (runs.value.length > 0) {
      selectedRunId.value = runs.value[0].id;
    }
  } catch {
    runs.value = [];
    selectedRunId.value = '';
  }
}

function persistSelectedStudies() {
  localStorage.setItem(storageKey('selectedStudies'), JSON.stringify(selectedStudyIds.value));
}

function persistRuns() {
  localStorage.setItem(storageKey('runs'), JSON.stringify(runs.value));
}

function selectRun(run) {
  selectedRunId.value = run?.id || '';
}

function resetMonitorFilters() {
  monitorSearch.value = '';
  monitorStatus.value = '';
  monitorTool.value = '';
}

function toggleStudy(studyId) {
  const current = new Set(selectedStudyIds.value);
  if (current.has(studyId)) current.delete(studyId);
  else current.add(studyId);
  selectedStudyIds.value = Array.from(current);
  persistSelectedStudies();
}

const filteredStudies = computed(() => {
  const q = studySearch.value.trim().toLowerCase();
  if (!q) return studies.value;
  return studies.value.filter(s => String(s.name || '').toLowerCase().includes(q) || String(s.id || '').toLowerCase().includes(q));
});

function statusBadgeClass(status) {
  switch (status) {
    case 'running':
      return 'text-bg-primary';
    case 'queued':
      return 'text-bg-secondary';
    case 'failed':
      return 'text-bg-danger';
    case 'done':
      return 'text-bg-success';
    default:
      return 'text-bg-secondary';
  }
}

function formatDateTime(value) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString();
  } catch {
    return '';
  }
}

async function refreshProject() {
  await loadStudies();
}

async function loadStudies() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await api.get('datasets/studies', authHeaders());
    studies.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    studies.value = [];
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load project studies.';
  } finally {
    loading.value = false;
  }
}

function openStartAnalysis() {
  if (selectedStudies.value.length === 0) {
    activeTab.value = 'manage';
    return;
  }
  if (!startModal) return;
  newRun.value = { tool: 'JupyterLab', name: '' };
  startModal.show();
}

function closeStartAnalysis() {
  startModal?.hide();
}

function createRun() {
  if (selectedStudies.value.length === 0) {
    activeTab.value = 'manage';
    closeStartAnalysis();
    return;
  }

  const name = (newRun.value.name || '').trim() || `${newRun.value.tool} run`;
  const launchPayload = {
    projectId: id.value,
    name,
    tool: newRun.value.tool,
    studyIds: selectedStudies.value.map(s => s.id)
  };

  closeStartAnalysis();
  activeTab.value = 'monitor';
  launchRun(launchPayload);
}

async function launchRun(payload) {
  // Try backend first if endpoint exists.
  try {
    const res = await api.post(`projects/${encodeURIComponent(payload.projectId)}/runs`, payload, authHeaders());
    const run = normalizeRunFromApi(res.data, payload);
    runs.value = [run, ...runs.value];
    selectedRunId.value = run.id;
    persistRuns();
    return;
  } catch (error) {
    // Fallback to local simulation while backend endpoint is not implemented.
    console.info('Run launch API unavailable, using local simulation:', error?.response?.status || error.message);
  }

  const run = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    projectId: payload.projectId,
    name: payload.name,
    tool: payload.tool,
    studyIds: payload.studyIds,
    status: 'queued',
    createdAt: new Date().toISOString(),
    source: 'local'
  };
  runs.value = [run, ...runs.value];
  selectedRunId.value = run.id;
  persistRuns();

  // UI-only: simulate transitioning to "running" then "done"
  window.setTimeout(() => {
    const idx = runs.value.findIndex(r => r.id === run.id);
    if (idx === -1) return;
    runs.value[idx] = { ...runs.value[idx], status: 'running' };
    persistRuns();
  }, 500);

  window.setTimeout(() => {
    const idx = runs.value.findIndex(r => r.id === run.id);
    if (idx === -1) return;
    runs.value[idx] = { ...runs.value[idx], status: 'done' };
    persistRuns();
  }, 1800);
}

function normalizeRunFromApi(apiRun, payload) {
  const idValue = String(apiRun?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  return {
    id: idValue,
    projectId: apiRun?.projectId || payload.projectId,
    name: apiRun?.name || payload.name,
    tool: apiRun?.tool || payload.tool,
    studyIds: Array.isArray(apiRun?.studyIds) ? apiRun.studyIds : payload.studyIds,
    status: apiRun?.status || 'queued',
    createdAt: apiRun?.createdAt || new Date().toISOString(),
    source: 'api'
  };
}

function clearRuns() {
  runs.value = [];
  selectedRunId.value = '';
  persistRuns();
}

function saveLocalProjectName() {
  localStorage.setItem(storageKey('name'), localProjectName.value || '');
}

function resetLocalProjectName() {
  localProjectName.value = '';
  localStorage.removeItem(storageKey('name'));
}

onMounted(async () => {
  document.title = `${APP_NAME} Project`;

  if (!id.value) {
    router.replace({ name: 'studies' });
    return;
  }

  loadLocalState();
  await loadStudies();

  if (startModalEl.value) {
    startModal = new Modal(startModalEl.value);
  }
});
</script>

<style scoped>
.project-list {
  max-height: 520px;
  overflow: auto;
}
</style>

