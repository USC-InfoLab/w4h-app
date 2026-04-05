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
        <div class="d-flex align-items-center flex-wrap gap-2 mt-1">
          <small class="text-muted">Project workspace</small>
          <span class="badge text-bg-secondary">ID: {{ id }}</span>
          <span class="badge text-bg-secondary">Selected studies: {{ selectedStudies.length }}</span>
          <span class="badge text-bg-secondary">Runs: {{ runs.length }}</span>
        </div>
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
        <button class="nav-link" :class="{ active: activeTab === 'visualize' }" @click="openVisualizeTab">
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
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">Selected studies</h6>
                <span class="badge text-bg-secondary">
                  {{ selectedStudies.length }} / {{ studies.length }}
                </span>
              </div>
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
                      <th>
                        <button class="btn btn-link btn-sm p-0 table-sort-btn" type="button" @click="setRunSort('name')">
                          Name
                          <i v-if="runSortBy === 'name'" class="bi ms-1" :class="sortIconClass('name')"></i>
                        </button>
                      </th>
                      <th>Status</th>
                      <th>Tool</th>
                      <th>Studies</th>
                      <th>Source</th>
                      <th>
                        <button class="btn btn-link btn-sm p-0 table-sort-btn" type="button" @click="setRunSort('createdAt')">
                          Created
                          <i v-if="runSortBy === 'createdAt'" class="bi ms-1" :class="sortIconClass('createdAt')"></i>
                        </button>
                      </th>
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
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">Run details</h6>
                <div v-if="selectedRun" class="dropdown">
                  <button ref="runActionsToggleEl" type="button" class="btn btn-sm btn-outline-secondary dropdown-toggle"
                    data-bs-toggle="dropdown" aria-expanded="false">
                    Actions
                  </button>
                  <ul class="dropdown-menu dropdown-menu-end">
                    <li>
                      <button class="dropdown-item" type="button" @click="duplicateRun(selectedRun)">
                        <i class="bi bi-files me-2"></i>Duplicate
                      </button>
                    </li>
                    <li>
                      <button class="dropdown-item" type="button" @click="openEditRun(selectedRun)">
                        <i class="bi bi-pencil me-2"></i>Edit
                      </button>
                    </li>
                    <li><hr class="dropdown-divider" /></li>
                    <li>
                      <button class="dropdown-item text-danger" type="button" @click="openDeleteRun(selectedRun)">
                        <i class="bi bi-trash me-2"></i>Delete
                      </button>
                    </li>
                  </ul>
                </div>
              </div>

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
      <div class="row g-3">
        <div class="col-12 col-lg-3">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="mb-2">Workspace viewers</h6>

              <div class="list-group small">
                <button v-for="viewer in viewers" :key="viewer.id" type="button"
                  class="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                  :class="{ active: selectedViewer?.id === viewer.id }" @click="selectViewer(viewer.id)">
                  <span class="text-truncate">{{ viewer.name }}</span>
                  <i class="bi bi-chevron-right"></i>
                </button>
              </div>

              <div class="alert alert-light border mt-3 mb-0">
                <small>
                  Only run trusted viewers on validated outputs.
                </small>
              </div>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-9">
          <div class="card h-100">
            <div class="card-body">
              <div class="d-flex align-items-center justify-content-between mb-2">
                <h6 class="mb-0">Visualize</h6>
                <button class="btn btn-sm btn-outline-secondary" type="button" @click="activeTab = 'monitor'">
                  Open Monitor
                </button>
              </div>

              <div class="mb-3">
                <label class="form-label">Run output source</label>
                <select v-model="selectedVisualizeRunId" class="form-select form-select-sm">
                  <option v-if="visualizeRunOptions.length === 0" value="">Select a run...</option>
                  <option v-for="run in visualizeRunOptions" :key="run.id" :value="run.id">
                    {{ run.name }} ({{ run.status }}) - {{ formatDateTime(run.createdAt) }}
                  </option>
                </select>
                <small class="text-muted">
                  Visualize consumes outputs from a run created in Manage/Monitor.
                </small>
              </div>

              <div v-if="selectedViewer" class="border rounded p-3 mb-3">
                <div class="d-flex align-items-start justify-content-between gap-2">
                  <div>
                    <div class="fw-semibold">{{ selectedViewer.name }}</div>
                    <div class="text-muted small">{{ selectedViewer.description }}</div>
                    <div class="text-muted small mt-1">
                      Supported: {{ selectedViewer.supported }}
                    </div>
                    <div class="text-muted small mt-1">
                      Run: {{ selectedVisualizeRun?.name || 'none selected' }}
                    </div>
                  </div>
                  <button class="btn btn-sm btn-primary" type="button" disabled title="Coming soon">
                    Select run output (coming soon)
                  </button>
                </div>
              </div>

              <div class="alert alert-light border mb-0">
                <small>
                  Output browsing is a frontend prototype right now and is not yet connected to backend artifact storage.
                </small>
              </div>
            </div>
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
            <div class="col-md-6">
              <label class="form-label">Default launch tool</label>
              <select v-model="workspaceSettings.defaultTool" class="form-select">
                <option value="JupyterLab">JupyterLab</option>
                <option value="RStudio">RStudio</option>
                <option value="Script/Docker">Script/Docker</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Run name prefix (optional)</label>
              <input v-model="workspaceSettings.runNamePrefix" class="form-control" placeholder="e.g. cohort-" />
            </div>
            <div class="col-12">
              <div class="form-check">
                <input id="autoOpenMonitorOnStart" v-model="workspaceSettings.autoOpenMonitorOnStart" class="form-check-input"
                  type="checkbox" />
                <label for="autoOpenMonitorOnStart" class="form-check-label">
                  Auto-open Monitor after starting analysis
                </label>
              </div>
            </div>
          </div>
          <div class="mt-3">
            <button class="btn btn-sm btn-primary" type="button" @click="saveSettings">
              Save settings
            </button>
            <button class="btn btn-sm btn-outline-secondary ms-2" type="button" @click="resetSettings">
              Reset
            </button>
          </div>
          <small class="text-muted d-block mt-2">
            Next: persist metadata in backend and support sharing/collaboration.
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

    <div class="modal fade" tabindex="-1" ref="editRunModalEl" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Edit run</h5>
            <button type="button" class="btn-close" @click="closeEditRun" aria-label="Close" />
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Run name</label>
              <input v-model="editRunForm.name" class="form-control" placeholder="Run name" />
            </div>
            <div class="mb-2">
              <label class="form-label">Tool</label>
              <select v-model="editRunForm.tool" class="form-select">
                <option value="JupyterLab">JupyterLab</option>
                <option value="RStudio">RStudio</option>
                <option value="Script/Docker">Script/Docker</option>
              </select>
            </div>
            <small class="text-muted">Status and study selection are immutable in this phase.</small>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeEditRun">Cancel</button>
            <button type="button" class="btn btn-primary" @click="saveRunEdits" :disabled="!editRunTargetId">
              Save changes
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" tabindex="-1" ref="deleteRunModalEl" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Delete run</h5>
            <button type="button" class="btn-close" @click="closeDeleteRun" aria-label="Close" />
          </div>
          <div class="modal-body">
            <p class="mb-2">Are you sure you want to delete this run?</p>
            <div class="alert alert-light border mb-0">
              <strong>{{ deleteRunTarget?.name || 'Run' }}</strong>
              <div class="text-muted small">This cannot be undone.</div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeDeleteRun">Cancel</button>
            <button type="button" class="btn btn-danger" @click="confirmDeleteRun" :disabled="!deleteRunTarget">
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Dropdown, Modal } from 'bootstrap';

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
const editRunModalEl = ref(null);
let editRunModal = null;
const deleteRunModalEl = ref(null);
let deleteRunModal = null;
const runActionsToggleEl = ref(null);

const newRun = ref({ tool: 'JupyterLab', name: '' });
const runs = ref([]);
const selectedRunId = ref('');
const monitorSearch = ref('');
const monitorStatus = ref('');
const monitorTool = ref('');
const runSortBy = ref('createdAt');
const runSortDir = ref('desc');
const viewers = ref([
  {
    id: 'notebook',
    name: 'Jupyter Notebook Preview',
    description: 'Open and preview notebook outputs linked to a run.',
    supported: '.ipynb'
  },
  {
    id: 'table',
    name: 'Table/Data Preview',
    description: 'Preview CSV/TSV/parquet style tabular outputs.',
    supported: '.csv, .tsv, .parquet'
  },
  {
    id: 'file',
    name: 'General File Viewer',
    description: 'Inspect logs and text outputs from analyses.',
    supported: '.txt, .log, .json'
  }
]);
const selectedViewerId = ref('notebook');
const selectedVisualizeRunId = ref('');
const workspaceSettings = ref({
  defaultTool: 'JupyterLab',
  runNamePrefix: '',
  autoOpenMonitorOnStart: true
});

const selectedStudyIds = ref([]);
const selectedStudyIdsSet = computed(() => new Set(selectedStudyIds.value));
const selectedStudies = computed(() => studies.value.filter(s => selectedStudyIdsSet.value.has(s.id)));
const selectedRun = computed(() => runs.value.find(r => r.id === selectedRunId.value) || null);

const filteredRuns = computed(() => {
  const q = monitorSearch.value.trim().toLowerCase();
  const result = runs.value.filter((r) => {
    if (monitorStatus.value && r.status !== monitorStatus.value) return false;
    if (monitorTool.value && r.tool !== monitorTool.value) return false;
    if (q && !String(r.name || '').toLowerCase().includes(q)) return false;
    return true;
  });

  result.sort((a, b) => compareRuns(a, b, runSortBy.value, runSortDir.value));
  return result;
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
const selectedViewer = computed(() => viewers.value.find(v => v.id === selectedViewerId.value) || null);
const visualizeRunOptions = computed(() =>
  [...runs.value].sort((a, b) => compareRuns(a, b, 'createdAt', 'desc'))
);
const selectedVisualizeRun = computed(() =>
  runs.value.find(r => r.id === selectedVisualizeRunId.value) || null
);
const editRunTargetId = ref('');
const editRunForm = ref({ name: '', tool: 'JupyterLab' });
const deleteRunTargetId = ref('');
const deleteRunTarget = computed(() => runs.value.find(r => r.id === deleteRunTargetId.value) || null);

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
      selectedVisualizeRunId.value = runs.value[0].id;
    }
  } catch {
    runs.value = [];
    selectedRunId.value = '';
    selectedVisualizeRunId.value = '';
  }

  try {
    const raw = localStorage.getItem(storageKey('settings'));
    const parsed = raw ? JSON.parse(raw) : {};
    workspaceSettings.value = {
      defaultTool: parsed.defaultTool || 'JupyterLab',
      runNamePrefix: parsed.runNamePrefix || '',
      autoOpenMonitorOnStart: parsed.autoOpenMonitorOnStart !== false
    };
  } catch {
    workspaceSettings.value = {
      defaultTool: 'JupyterLab',
      runNamePrefix: '',
      autoOpenMonitorOnStart: true
    };
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
  runSortBy.value = 'createdAt';
  runSortDir.value = 'desc';
}

function selectViewer(viewerId) {
  selectedViewerId.value = viewerId;
}

function openVisualizeTab() {
  activeTab.value = 'visualize';
  if (!selectedVisualizeRunId.value && selectedRunId.value) {
    selectedVisualizeRunId.value = selectedRunId.value;
    return;
  }
  if (!selectedVisualizeRunId.value && runs.value.length > 0) {
    selectedVisualizeRunId.value = runs.value[0].id;
  }
}

function setRunSort(field) {
  if (runSortBy.value === field) {
    runSortDir.value = runSortDir.value === 'asc' ? 'desc' : 'asc';
    return;
  }
  runSortBy.value = field;
  runSortDir.value = field === 'name' ? 'asc' : 'desc';
}

function sortIconClass(field) {
  if (runSortBy.value !== field) return '';
  return runSortDir.value === 'asc' ? 'bi-caret-up-fill' : 'bi-caret-down-fill';
}

function compareRuns(a, b, field, dir) {
  const factor = dir === 'asc' ? 1 : -1;

  if (field === 'name') {
    const av = String(a?.name || '').toLowerCase();
    const bv = String(b?.name || '').toLowerCase();
    return av.localeCompare(bv) * factor;
  }

  if (field === 'createdAt') {
    const at = new Date(a?.createdAt || 0).getTime();
    const bt = new Date(b?.createdAt || 0).getTime();
    return (at - bt) * factor;
  }

  return 0;
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
  newRun.value = { tool: workspaceSettings.value.defaultTool || 'JupyterLab', name: '' };
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

  const customName = (newRun.value.name || '').trim();
  const prefix = (workspaceSettings.value.runNamePrefix || '').trim();
  const fallbackName = `${newRun.value.tool} run`;
  const baseName = customName || fallbackName;
  const name = prefix ? `${prefix}${baseName}` : baseName;
  const launchPayload = {
    projectId: id.value,
    name,
    tool: newRun.value.tool,
    studyIds: selectedStudies.value.map(s => s.id)
  };

  closeStartAnalysis();
  activeTab.value = workspaceSettings.value.autoOpenMonitorOnStart ? 'monitor' : activeTab.value;
  launchRun(launchPayload);
}

async function launchRun(payload) {
  // Try backend first if endpoint exists.
  try {
    const res = await api.post(`projects/${encodeURIComponent(payload.projectId)}/runs`, payload, authHeaders());
    const run = normalizeRunFromApi(res.data, payload);
    runs.value = [run, ...runs.value];
    selectedRunId.value = run.id;
    selectedVisualizeRunId.value = run.id;
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
  selectedVisualizeRunId.value = run.id;
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
  selectedVisualizeRunId.value = '';
  persistRuns();
}

function openEditRun(run) {
  editRunTargetId.value = run?.id || '';
  editRunForm.value = {
    name: run?.name || '',
    tool: run?.tool || 'JupyterLab'
  };
  editRunModal?.show();
}

function closeEditRun() {
  editRunModal?.hide();
}

async function saveRunEdits() {
  const runId = editRunTargetId.value;
  if (!runId) return;
  const nextName = (editRunForm.value.name || '').trim();
  const nextTool = editRunForm.value.tool || 'JupyterLab';

  if (!nextName) return;

  // Try backend patch first if endpoint exists.
  try {
    await api.patch(
      `projects/${encodeURIComponent(id.value)}/runs/${encodeURIComponent(runId)}`,
      { name: nextName, tool: nextTool },
      authHeaders()
    );
  } catch (error) {
    console.info('Run edit API unavailable, applying local edit:', error?.response?.status || error.message);
  }

  const idx = runs.value.findIndex(r => r.id === runId);
  if (idx !== -1) {
    runs.value[idx] = {
      ...runs.value[idx],
      name: nextName,
      tool: nextTool
    };
    persistRuns();
  }

  closeEditRun();
}

function openDeleteRun(run) {
  deleteRunTargetId.value = run?.id || '';
  deleteRunModal?.show();
}

function closeDeleteRun() {
  deleteRunModal?.hide();
}

async function confirmDeleteRun() {
  const run = deleteRunTarget.value;
  if (!run) return;

  // Try backend delete first if endpoint exists.
  try {
    await api.delete(
      `projects/${encodeURIComponent(id.value)}/runs/${encodeURIComponent(run.id)}`,
      authHeaders()
    );
  } catch (error) {
    console.info('Run delete API unavailable, applying local delete:', error?.response?.status || error.message);
  }

  runs.value = runs.value.filter(r => r.id !== run.id);
  if (selectedRunId.value === run.id) {
    selectedRunId.value = runs.value[0]?.id || '';
  }
  if (selectedVisualizeRunId.value === run.id) {
    selectedVisualizeRunId.value = runs.value[0]?.id || '';
  }
  persistRuns();
  closeDeleteRun();
}

async function duplicateRun(run) {
  if (!run) return;

  // Try backend duplicate first if endpoint exists.
  try {
    const res = await api.post(
      `projects/${encodeURIComponent(id.value)}/runs/${encodeURIComponent(run.id)}/duplicate`,
      {},
      authHeaders()
    );
    const duplicated = normalizeRunFromApi(res.data, {
      projectId: run.projectId || id.value,
      name: `${run.name} (copy)`,
      tool: run.tool,
      studyIds: Array.isArray(run.studyIds) ? run.studyIds : []
    });
    runs.value = [duplicated, ...runs.value];
    selectedRunId.value = duplicated.id;
    selectedVisualizeRunId.value = duplicated.id;
    persistRuns();
    return;
  } catch (error) {
    console.info('Run duplicate API unavailable, applying local duplicate:', error?.response?.status || error.message);
  }

  const duplicated = {
    ...run,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: `${run.name} (copy)`,
    status: 'queued',
    createdAt: new Date().toISOString(),
    source: 'local'
  };
  runs.value = [duplicated, ...runs.value];
  selectedRunId.value = duplicated.id;
  selectedVisualizeRunId.value = duplicated.id;
  persistRuns();
}

function saveLocalProjectName() {
  localStorage.setItem(storageKey('name'), localProjectName.value || '');
}

function resetLocalProjectName() {
  localProjectName.value = '';
  localStorage.removeItem(storageKey('name'));
}

function saveSettings() {
  saveLocalProjectName();
  localStorage.setItem(storageKey('settings'), JSON.stringify(workspaceSettings.value));
}

function resetSettings() {
  resetLocalProjectName();
  workspaceSettings.value = {
    defaultTool: 'JupyterLab',
    runNamePrefix: '',
    autoOpenMonitorOnStart: true
  };
  localStorage.removeItem(storageKey('settings'));
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
  if (editRunModalEl.value) {
    editRunModal = new Modal(editRunModalEl.value);
  }
  if (deleteRunModalEl.value) {
    deleteRunModal = new Modal(deleteRunModalEl.value);
  }
  if (runActionsToggleEl.value) {
    new Dropdown(runActionsToggleEl.value);
  }
});

// Keep Monitor and Visualize selections fully linked.
watch(
  () => selectedRunId.value,
  (next) => {
    if (selectedVisualizeRunId.value !== next) {
      selectedVisualizeRunId.value = next || '';
    }
  }
);

watch(
  () => selectedVisualizeRunId.value,
  (next) => {
    if (selectedRunId.value !== next) {
      selectedRunId.value = next || '';
    }
  }
);
</script>

<style scoped>
.project-list {
  max-height: 520px;
  overflow: auto;
}

.table-sort-btn {
  text-decoration: none;
  color: inherit;
  font-weight: 600;
}

.table-sort-btn:hover {
  text-decoration: none;
}
</style>

