<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Modal } from 'bootstrap';
import { api, authHeaders } from '@/utils/api';
import DatasetsEdit from '@/views/admin/DatasetsEdit.vue';

const route = useRoute();

const props = defineProps({
  datasets: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
  addableDatasets: { type: Array, default: () => [] },
  datasetToAdd: { type: String, default: '' },
  newDatasetName: { type: String, default: '' },
  savingDatasets: { type: Boolean, default: false },
  hasTeam: { type: Boolean, default: true },
});

const emit = defineEmits([
  'unlink-dataset',
  'update:datasetToAdd',
  'update:newDatasetName',
  'dataset-pick',
  'create-dataset',
  'dataset-run-complete',
]);

const ADD_ID = '__add__';

const selectedId = ref('');

function onDatasetSelect(event) {
  const value = event.target.value;
  emit('update:datasetToAdd', value);
  emit('dataset-pick', value);
}

// Any Super-admin-curated `runnable` contribution can be offered here (ADR-022) —
// not just the fitbit importer. Loaded once on mount.
const runnableContributions = ref([]); // [{ slug, title, ... }]

onMounted(async () => {
  try {
    const res = await api.get('/contributions', authHeaders());
    runnableContributions.value = (res.data || []).filter((c) => c.runnable);
  } catch {
    runnableContributions.value = [];
  }
});

const detailsModalEl = ref(null);
let detailsModal = null;
// Tracks actual shown/hidden state (via Bootstrap's own events) so the embedded
// DatasetsEdit only mounts — and fetches — while the modal is really visible.
const detailsDialogOpen = ref(false);

function openDetailsDialog() {
  detailsModal?.show();
}

function closeDetailsDialog() {
  detailsModal?.hide();
}

const runDialogModalEl = ref(null);
let runDialogModal = null;

onMounted(() => {
  if (!detailsModalEl.value) return;
  detailsModal = new Modal(detailsModalEl.value);
  detailsModalEl.value.addEventListener('show.bs.modal', () => {
    detailsDialogOpen.value = true;
  });
  detailsModalEl.value.addEventListener('hidden.bs.modal', () => {
    detailsDialogOpen.value = false;
  });
});

// Real Bootstrap Modal (not a hand-rolled `v-if` + `.show`/backdrop toggle) so the
// dialog actually receives and traps keyboard focus and restores it on close.
onMounted(() => {
  if (!runDialogModalEl.value) return;
  runDialogModal = new Modal(runDialogModalEl.value);
});

onBeforeUnmount(() => {
  detailsModal?.dispose();
  runDialogModal?.dispose();
});

const runSlug = ref('');
const runDatasetId = ref('');
const runMode = ref('update'); // 'update' (append/fill) | 'full' (truncate + reload)
const confirmFullReimport = ref(false);
const dependents = ref(null); // { linkedProjectCount, otherProjects, shareCount, hasDependents }
const dependentsLoading = ref(false);
const dependentsError = ref(''); // set when the check itself failed — never fabricate a dependents result
const run = ref(null); // { id, status, log, exit_code }
const runError = ref('');
let pollTimer = null;

// Keep the log pane scrolled to its latest line — a long-running import can
// scroll well past view, and the current line is what tells you it isn't stuck.
const runLogEl = ref(null);
watch(
  () => run.value?.log,
  () => {
    nextTick(() => {
      if (runLogEl.value) runLogEl.value.scrollTop = runLogEl.value.scrollHeight;
    });
  }
);

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function pollRun(runId) {
  stopPolling();
  pollTimer = setInterval(async () => {
    try {
      const res = await api.get(`/contributions/runs/${runId}`, authHeaders());
      run.value = res.data;
      if (res.data.status === 'succeeded' || res.data.status === 'failed') {
        stopPolling();
        if (res.data.status === 'succeeded') {
          // The run's target dataset may not have been the one showing in the
          // detail panel (e.g. it came from the team catalog) — select it so
          // its freshly-populated stats are visible once the dialog closes.
          selectedId.value = runDatasetId.value;
          emit('dataset-run-complete');
        }
      }
    } catch (e) {
      runError.value = e.response?.data?.error || e.message || 'Lost track of the run.';
      stopPolling();
    }
  }, 1500);
}

const runInFlight = computed(() => run.value && (run.value.status === 'queued' || run.value.status === 'running'));

// Progress from the script's own `@@PROGRESS@@` lines (see w4h-api's
// contribution-runner.js) — null until the first one arrives, or if a
// contribution's script doesn't emit them at all.
const runProgressPct = computed(() => {
  const p = run.value?.progress;
  if (!p || !p.rows_total) return null;
  return Math.max(0, Math.min(100, Math.round((p.rows_done / p.rows_total) * 100)));
});

function openRunDialog() {
  runError.value = '';
  run.value = null;
  runMode.value = 'update';
  confirmFullReimport.value = false;
  dependents.value = null;
  dependentsError.value = '';
  runSlug.value = runnableContributions.value[0]?.slug || '';
  const preselect = selected.value && !selected.value.read_only && selected.value.table_count === 0
    ? selected.value.id
    : '';
  runDatasetId.value = preselect || localRunTargets.value[0]?.id || catalogRunTargets.value[0]?.id || '';
  runDialogModal?.show();
}

function closeRunDialog() {
  runDialogModal?.hide();
}

// Target dataset already has data — a 'full' run truncates and reloads it, so this
// is when the dependents check (and its confirm gate) applies. Empty targets have
// nothing to lose either way.
const runTargetLoaded = computed(() => {
  const local = orderedDatasets.value.find((d) => d.id === runDatasetId.value);
  return Boolean(local && local.table_count > 0);
});

async function refreshDependents() {
  dependents.value = null;
  dependentsError.value = '';
  if (runMode.value !== 'full' || !runTargetLoaded.value || !runDatasetId.value) return;
  dependentsLoading.value = true;
  try {
    const projectId = route.params.id ? String(route.params.id) : '';
    const res = await api.get(
      `/datasets/${encodeURIComponent(runDatasetId.value)}/dependents`,
      { ...authHeaders(), params: projectId ? { exclude_project_id: projectId } : {} }
    );
    dependents.value = res.data;
  } catch (e) {
    // The check itself failed — still block until explicitly confirmed, but say so
    // honestly instead of fabricating a "this has other dependents" result.
    dependentsError.value = e.response?.data?.error || e.message || 'Could not check what else uses this dataset.';
  } finally {
    dependentsLoading.value = false;
  }
}

watch([runMode, runDatasetId], () => {
  confirmFullReimport.value = false;
  refreshDependents();
});

// Blocks Run for a full re-import on a loaded dataset until the dependents check
// has actually resolved (not just while it's still in flight) and, if it found
// dependents, until the user has explicitly confirmed.
const fullReimportBlocked = computed(() => {
  if (runMode.value !== 'full' || !runTargetLoaded.value) return false;
  if (dependentsLoading.value) return true;
  if (dependentsError.value) return !confirmFullReimport.value;
  if (dependents.value === null) return true;
  return dependents.value.hasDependents && !confirmFullReimport.value;
});

async function startRun() {
  if (!runSlug.value || !runDatasetId.value || runInFlight.value || fullReimportBlocked.value) return;
  runError.value = '';
  run.value = null;
  const isLocal = orderedDatasets.value.some((d) => d.id === runDatasetId.value);
  if (!isLocal) emit('dataset-pick', runDatasetId.value);
  try {
    const res = await api.post(
      `/contributions/${runSlug.value}/run`,
      { dataset_id: runDatasetId.value, mode: runMode.value },
      authHeaders()
    );
    run.value = res.data;
    pollRun(res.data.id);
  } catch (e) {
    runError.value = e.response?.data?.error || e.message || 'Could not start the import.';
  }
}

onBeforeUnmount(stopPolling);

function summaryOf(row) {
  const raw = row?.summary;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? raw : null;
}

function formatApproxNumber(value, approx = false) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const abs = Math.abs(n);
  let text;
  if (abs >= 1e9) text = `${(n / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  else if (abs >= 1e6) text = `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  else if (abs >= 1e3) text = `${(n / 1e3).toFixed(0)}k`;
  else text = String(Math.round(n));
  return (approx || abs >= 1e6) && abs > 0 ? `~${text}` : text;
}

function formatDateRange(summary) {
  if (!summary) return '';
  if (summary.date_range) return String(summary.date_range);
  const start = summary.date_start || summary.start_date;
  const end = summary.date_end || summary.end_date;
  if (!start && !end) return '';
  const fmt = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start || end);
}

function relativeFreshness(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'Updated just now';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `Updated ${mins <= 1 ? 'just now' : `${mins} minutes ago`}`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `Updated ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `Updated ${days} day${days === 1 ? '' : 's'} ago`;
}

const orderedDatasets = computed(() => {
  const rows = [...(props.datasets || [])].map((d) => ({
    id: String(d.id || d.dataset_id || ''),
    name: d.name || d.id || 'Dataset',
    description: d.description || '',
    summary: summaryOf(d),
    summary_updated_at: d.summary_updated_at || null,
    table_count: Number(d.table_count ?? summaryOf(d)?.table_count ?? 0),
    physical_table_count: Number(
      d.physical_table_count ?? summaryOf(d)?.physical_table_count ?? 0
    ),
    read_only: Boolean(d.read_only),
    origin: d.origin || '',
    source_label: d.source_label || '',
    loaded: Number(d.physical_table_count ?? summaryOf(d)?.physical_table_count ?? d.table_count ?? 0) > 0,
  }));
  // Stable alphabetical default until projects support an explicit primary dataset.
  rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return rows;
});

const selected = computed(() => {
  const id = selectedId.value;
  return orderedDatasets.value.find((d) => d.id === id) || null;
});

const selectedSummary = computed(() => selected.value?.summary || {});

const activeContribution = computed(
  () => runnableContributions.value.find((c) => c.slug === runSlug.value) || null
);

// Run targets: any non-read-only dataset — either already linked to this project
// ("local") or still only in the team catalog ("from catalog"), e.g. a sample
// dataset an admin created but hasn't added to a project yet. Includes datasets
// that already have data (not just empty ones) so a partial/failed prior import
// can be fixed via "Update" or "Full re-import" instead of only a first load.
const localRunTargets = computed(
  () => orderedDatasets.value.filter((d) => !d.read_only)
);

const catalogRunTargets = computed(() =>
  (props.addableDatasets || [])
    .filter((d) => !d.read_only)
    .map((d) => ({ id: String(d.id), name: d.name || d.id }))
);

const cohorts = computed(() => {
  const list = selectedSummary.value?.cohorts;
  return Array.isArray(list) && list.length ? list : [];
});

const coverage = computed(() => {
  const list = selectedSummary.value?.coverage;
  return Array.isArray(list) && list.length ? list : [];
});

const hasStats = computed(() => {
  const s = selectedSummary.value;
  return Boolean(
    selected.value?.table_count != null ||
    s.observations != null ||
    s.participants != null ||
    s.participant_days != null ||
    formatDateRange(s) ||
    cohorts.value.length ||
    coverage.value.length
  );
});

function rowMeta(row) {
  const s = row.summary;
  const parts = [];
  if (s?.modality || s?.type) parts.push(s.modality || s.type);
  if (s?.participants != null) {
    parts.push(`${formatApproxNumber(s.participants)} participants`);
  }
  const range = formatDateRange(s);
  if (range) parts.push(range);
  return parts.join(' · ');
}

let knownIds = new Set();

function selectDefault() {
  const rows = orderedDatasets.value;
  const nextIds = new Set(rows.map((r) => r.id));

  if (selectedId.value === ADD_ID) {
    const addedId = rows.find((r) => !knownIds.has(r.id))?.id;
    knownIds = nextIds;
    if (addedId) selectedId.value = addedId;
    return;
  }

  knownIds = nextIds;
  if (!rows.length) {
    selectedId.value = '';
    return;
  }
  if (!selectedId.value || !rows.some((r) => r.id === selectedId.value)) {
    selectedId.value = rows[0].id;
  }
}

watch(
  () => props.datasets,
  () => selectDefault(),
  { immediate: true, deep: true }
);
</script>

<template>
  <div v-if="orderedDatasets.length === 0 && !canManage" class="card p-3">
    <h5 class="card-title mb-2">Datasets on this project</h5>
    <p class="text-muted mb-0">No datasets are currently assigned to this project.</p>
  </div>

  <div v-else class="card overflow-hidden">
    <div class="row g-0">
      <div class="col-12 col-lg-5 border-end">
        <div class="p-3 border-bottom d-flex align-items-center justify-content-between gap-2">
          <h5 class="mb-0">Datasets on this project</h5>
          <div class="d-flex gap-2">
            <button
              v-if="canManage && runnableContributions.length && (localRunTargets.length || catalogRunTargets.length)"
              type="button"
              class="btn btn-sm btn-outline-primary flex-shrink-0"
              @click="openRunDialog"
            >
              <i class="bi bi-play-fill" aria-hidden="true"></i> Run import…
            </button>
            <button
              v-if="canManage"
              type="button"
              class="btn btn-sm btn-outline-primary flex-shrink-0"
              :class="{ active: selectedId === ADD_ID }"
              @click="selectedId = ADD_ID"
            >
              <i class="bi bi-plus-lg" aria-hidden="true"></i> Add
            </button>
          </div>
        </div>
        <div v-if="orderedDatasets.length === 0" class="p-3 small text-muted">
          No datasets are currently assigned to this project.
        </div>
        <div v-else class="list-group list-group-flush dataset-selector">
          <button v-for="row in orderedDatasets" :key="row.id" type="button"
            class="list-group-item list-group-item-action dataset-row text-start"
            :class="{ 'dataset-row--selected': row.id === selectedId }" @click="selectedId = row.id">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div class="d-flex align-items-start gap-2 min-w-0">
                <i class="bi bi-database text-muted flex-shrink-0" aria-hidden="true"></i>
                <div class="min-w-0">
                  <div class="fw-semibold text-truncate">{{ row.name }}</div>
                  <div class="small">
                    <span v-if="row.read_only" class="badge text-bg-info me-1">Read-only sample</span>
                    <span v-else-if="row.loaded" class="badge text-bg-success me-1">Loaded</span>
                    <span v-else class="badge text-bg-warning me-1">Needs ingest</span>
                  </div>
                  <div v-if="rowMeta(row)" class="small text-muted text-truncate">{{ rowMeta(row) }}</div>
                </div>
              </div>
              <i class="bi bi-chevron-right text-muted flex-shrink-0 mt-1" aria-hidden="true"></i>
            </div>
          </button>
        </div>
        <div v-if="canManage" class="p-3 border-top">
          <router-link :to="{ name: 'adminDatasets' }" class="small text-decoration-none">
            Manage full team catalog →
          </router-link>
        </div>
      </div>

      <div class="col-12 col-lg-7">
        <div v-if="canManage && selectedId === ADD_ID" class="p-3 h-100">
          <div class="small text-muted text-uppercase mb-1">Add to this project</div>
          <h5 class="mb-2">Create or link a dataset</h5>
          <p class="small text-muted mb-3">
            Linking a catalog row does not load tables. Load data by adapting a notebook or
            deploying a CLI from a Contributions example against <em>your</em> team, with your
            personal API key. Sample / demonstration datasets are read-only.
          </p>
          <div v-if="!hasTeam" class="alert alert-warning small mb-0">
            Set an owning team before assigning datasets.
          </div>
          <template v-else>
            <div class="row g-2 align-items-end">
              <div class="col">
                <label class="form-label small mb-0">Add existing</label>
                <select
                  class="form-select form-select-sm"
                  :value="datasetToAdd"
                  :disabled="savingDatasets"
                  @change="onDatasetSelect"
                >
                  <option value="">Select…</option>
                  <option v-for="d in addableDatasets" :key="d.id" :value="String(d.id)">
                    {{ d.name || d.id }}{{ d.read_only ? ' (read-only sample)' : '' }}
                  </option>
                  <option value="__new__">Create new catalog dataset…</option>
                </select>
              </div>
            </div>
            <div v-if="datasetToAdd === '__new__'" class="row g-2 align-items-end mt-2">
              <div class="col">
                <input
                  class="form-control form-control-sm"
                  placeholder="Dataset name"
                  :value="newDatasetName"
                  :disabled="savingDatasets"
                  @input="emit('update:newDatasetName', $event.target.value)"
                  @keyup.enter="emit('create-dataset')"
                />
              </div>
              <div class="col-auto">
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  :disabled="savingDatasets || !newDatasetName"
                  @click="emit('create-dataset')"
                >
                  Create
                </button>
              </div>
            </div>
          </template>
        </div>
        <div v-else-if="selected" class="p-3 h-100 d-flex flex-column">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
            <div class="min-w-0">
              <div class="small text-muted text-uppercase">Dataset overview</div>
              <h5 class="mb-0 text-truncate">{{ selected.name }}</h5>
              <div v-if="selected.read_only || selected.source_label" class="small text-muted mt-1">
                {{ selected.source_label || selected.origin || 'W4H Samples' }}
              </div>
            </div>
            <small v-if="selected.summary_updated_at" class="text-muted">
              {{ relativeFreshness(selected.summary_updated_at) }}
            </small>
          </div>

          <template v-if="hasStats">
            <div class="row g-2 mb-3">
              <div class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value">{{ selected.table_count }}</div>
                  <div class="stat-label">
                    {{ selected.table_count === 1 ? 'Table' : 'Tables' }}
                  </div>
                </div>
              </div>
              <div v-if="selectedSummary.observations != null" class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value">
                    {{
                      formatApproxNumber(
                        selectedSummary.observations,
                        selectedSummary.observations_approx !== false
                      )
                    }}
                  </div>
                  <div class="stat-label">Observations</div>
                </div>
              </div>
              <div v-if="selectedSummary.participants != null" class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value">{{ formatApproxNumber(selectedSummary.participants) }}</div>
                  <div class="stat-label">Participants</div>
                </div>
              </div>
              <div v-if="selectedSummary.participant_days != null" class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value">{{ formatApproxNumber(selectedSummary.participant_days) }}</div>
                  <div class="stat-label">Participant-days</div>
                </div>
              </div>
              <div v-if="formatDateRange(selectedSummary)" class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value stat-value--sm">{{ formatDateRange(selectedSummary) }}</div>
                  <div class="stat-label">Date range</div>
                </div>
              </div>
            </div>

            <div v-if="cohorts.length" class="mb-3">
              <div class="small fw-semibold mb-2">Cohorts</div>
              <div class="row g-2">
                <div v-for="(c, idx) in cohorts" :key="idx" class="col-6">
                  <div class="d-flex justify-content-between small border rounded px-2 py-1">
                    <span>{{ c.name || c.label || 'Cohort' }}</span>
                    <strong>{{ formatApproxNumber(c.count ?? c.n) }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="coverage.length" class="mb-3 flex-grow-1">
              <div class="small fw-semibold mb-2">Data coverage</div>
              <div v-for="(c, idx) in coverage" :key="idx" class="mb-2">
                <div class="d-flex justify-content-between small mb-1">
                  <span>{{ c.label || c.name || c.modality }}</span>
                  <span>{{ Number(c.pct ?? c.percent ?? 0) }}%</span>
                </div>
                <div class="progress" style="height: 6px">
                  <div class="progress-bar" role="progressbar"
                    :style="{ width: `${Math.max(0, Math.min(100, Number(c.pct ?? c.percent ?? 0)))}%` }" />
                </div>
              </div>
            </div>

            <p v-if="selected.read_only" class="small mb-3">
              Super admin seeded this sample. It is read-only — do not re-ingest.
            </p>
            <div v-else-if="selected.table_count === 0 && runnableContributions.length && canManage" class="mb-3">
              <p class="small text-muted mb-2">
                Not loaded yet. Run a catalog-curated contribution to populate it.
              </p>
              <button type="button" class="btn btn-sm btn-primary" @click="openRunDialog">
                <i class="bi bi-play-fill" aria-hidden="true"></i> Run import…
              </button>
            </div>
            <p v-else-if="selected.table_count === 0" class="small text-muted mb-3">
              Not loaded yet. Adapt a notebook or deploy a CLI from a Contributions example
              into your team catalog. Tables and stats appear here after that.
            </p>
            <p v-else-if="selected.physical_table_count === 0" class="small text-muted mb-3">
              Catalog exists but no tables are in the database yet.
            </p>
            <p v-else-if="Number(selectedSummary.observations) === 0" class="small text-muted mb-3">
              The registered tables exist and currently report 0 observations.
            </p>
          </template>

          <div v-else class="text-muted small mb-3 flex-grow-1">
            <p v-if="selected.description" class="mb-2">{{ selected.description }}</p>
            <p class="mb-0">
              Summary statistics are not available yet for this dataset. They appear here from a
              cached metadata layer after ingestion — this page does not run live full-table counts.
            </p>
          </div>

          <div class="mt-auto pt-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <button
              v-if="selected.id"
              type="button"
              class="btn btn-link btn-sm small text-decoration-none px-0"
              @click="openDetailsDialog"
            >
              Dataset details →
            </button>
            <button
              v-if="canManage && selected.id"
              type="button"
              class="btn btn-sm btn-outline-danger"
              @click="emit('unlink-dataset', selected.id)"
            >
              Unlink
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" tabindex="-1" ref="runDialogModalEl" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Run a contribution</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="closeRunDialog"></button>
        </div>
        <div class="modal-body">
          <div v-if="runnableContributions.length > 1" class="mb-3">
            <label class="form-label small mb-0">Contribution to run</label>
            <select v-model="runSlug" class="form-select form-select-sm" :disabled="runInFlight">
              <option v-for="c in runnableContributions" :key="c.slug" :value="c.slug">
                {{ c.title || c.slug }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label small mb-0">Dataset to populate</label>
            <select v-model="runDatasetId" class="form-select form-select-sm" :disabled="runInFlight">
              <optgroup label="Already in this project" v-if="localRunTargets.length">
                <option v-for="d in localRunTargets" :key="d.id" :value="d.id">
                  {{ d.name }}{{ d.table_count > 0 ? ' (loaded)' : '' }}
                </option>
              </optgroup>
              <optgroup label="From team catalog" v-if="catalogRunTargets.length">
                <option v-for="d in catalogRunTargets" :key="d.id" :value="d.id">{{ d.name }}</option>
              </optgroup>
            </select>
            <p v-if="!localRunTargets.length && !catalogRunTargets.length" class="small text-muted mt-1 mb-0">
              No writable datasets are available to run against. Create or link one first.
            </p>
          </div>

          <div class="mb-3">
            <label class="form-label small mb-0 d-block">Import mode</label>
            <div class="form-check form-check-inline">
              <input
                id="run-mode-update" v-model="runMode" class="form-check-input" type="radio"
                value="update" :disabled="runInFlight"
              />
              <label class="form-check-label small" for="run-mode-update">Update</label>
            </div>
            <div class="form-check form-check-inline">
              <input
                id="run-mode-full" v-model="runMode" class="form-check-input" type="radio"
                value="full" :disabled="runInFlight"
              />
              <label class="form-check-label small" for="run-mode-full">Full re-import</label>
            </div>
            <p class="small text-muted mb-0">
              <span v-if="runMode === 'full'">Truncates and reloads every table from source — use this to fix a partial or failed import (e.g. missing tables).</span>
              <span v-else>Adds missing rows/tables without touching data already there. Safe to re-run.</span>
            </p>
          </div>

          <div v-if="runMode === 'full' && runTargetLoaded" class="mb-3">
            <div v-if="dependentsLoading" class="small text-muted">Checking what else uses this dataset…</div>
            <div v-else-if="dependentsError" class="alert alert-warning small mb-0">
              <p class="mb-1">
                <strong>Could not verify what else uses this dataset</strong> ({{ dependentsError }}).
                A full re-import truncates and reloads it for everyone that does, if anyone.
              </p>
              <div class="form-check">
                <input id="confirm-full-reimport" v-model="confirmFullReimport" class="form-check-input" type="checkbox" />
                <label class="form-check-label" for="confirm-full-reimport">
                  I understand I could not confirm whether other projects/teams depend on this dataset, and want to proceed anyway.
                </label>
              </div>
            </div>
            <div v-else-if="dependents?.hasDependents" class="alert alert-warning small mb-0">
              <p class="mb-1">
                <strong>This dataset is not just used here.</strong> A full re-import replaces its data for everyone:
              </p>
              <ul class="mb-2">
                <li v-if="dependents.otherProjects?.length">
                  Linked to {{ dependents.otherProjects.length }} other project{{ dependents.otherProjects.length === 1 ? '' : 's' }}:
                  {{ dependents.otherProjects.map((p) => p.name).join(', ') }}
                </li>
                <li v-if="dependents.shareCount">
                  Shared with {{ dependents.shareCount }} other team{{ dependents.shareCount === 1 ? '' : 's' }}
                </li>
              </ul>
              <div class="form-check">
                <input id="confirm-full-reimport" v-model="confirmFullReimport" class="form-check-input" type="checkbox" />
                <label class="form-check-label" for="confirm-full-reimport">
                  I understand this replaces data other projects/teams depend on.
                </label>
              </div>
            </div>
            <div v-else class="small text-muted">
              Nothing else is linked to or shares this dataset — safe to fully re-import.
            </div>
          </div>

          <button
            type="button"
            class="btn btn-sm btn-primary"
            :disabled="!runSlug || !runDatasetId || runInFlight || fullReimportBlocked"
            @click="startRun"
          >
            <span v-if="runInFlight">
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Running…
            </span>
            <span v-else>Run {{ activeContribution?.title || 'import' }}</span>
          </button>

          <div v-if="runError" class="alert alert-danger small mt-2 mb-0">{{ runError }}</div>
          <div v-if="run" class="small mt-2">
            <span
              class="badge me-1"
              :class="{
                'text-bg-secondary': run.status === 'queued',
                'text-bg-primary': run.status === 'running',
                'text-bg-success': run.status === 'succeeded',
                'text-bg-danger': run.status === 'failed',
              }"
            >{{ run.status }}</span>

            <div v-if="run.progress" class="mt-2">
              <div class="d-flex justify-content-between small text-muted mb-1">
                <span>Table {{ run.progress.signal_index }}/{{ run.progress.signal_count }}: {{ run.progress.signal }}</span>
                <span>
                  {{ run.progress.rows_done }}/{{ run.progress.rows_total || '?' }} rows<template v-if="runProgressPct != null"> ({{ runProgressPct }}%)</template>
                </span>
              </div>
              <div
                class="progress" style="height: 8px" role="progressbar"
                :aria-valuenow="runProgressPct ?? 0" aria-valuemin="0" aria-valuemax="100"
              >
                <div
                  class="progress-bar"
                  :class="{ 'progress-bar-striped progress-bar-animated': runInFlight && runProgressPct == null }"
                  :style="{ width: `${runProgressPct ?? 100}%` }"
                ></div>
              </div>
            </div>

            <pre v-if="run.log" ref="runLogEl" class="run-log mt-2 mb-0 p-2 border rounded small">{{ run.log }}</pre>
          </div>

          <details v-if="activeContribution" class="small mt-3">
            <summary class="text-muted" style="cursor: pointer">Prefer the command line?</summary>
            <p class="text-muted mb-1 mt-2">
              Every runnable contribution ships a one-command <code>run.sh</code> entrypoint you can run
              yourself instead — same personal API key, same access checks, no button required.
            </p>
            <pre class="run-log mb-1 p-2 border rounded small">W4H_DATASET_ID={{ runDatasetId || '<dataset-id>' }} ./run.sh import --mode {{ runMode === 'full' ? 'replace' : 'append' }}</pre>
            <router-link :to="{ name: 'contributionDetail', params: { slug: activeContribution.slug } }">
              View {{ activeContribution.title }} setup instructions →
            </router-link>
          </details>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" @click="closeRunDialog">Close</button>
        </div>
      </div>
    </div>
  </div>

  <div class="modal fade" tabindex="-1" ref="detailsModalEl" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Dataset details</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="closeDetailsDialog"></button>
        </div>
        <div class="modal-body">
          <DatasetsEdit v-if="detailsDialogOpen && selected" :id="selected.id" embedded />
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-sm" @click="closeDetailsDialog">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dataset-row {
  border-left: 3px solid transparent;
}

.dataset-row--selected {
  background: rgba(13, 110, 253, 0.06);
  border-left-color: var(--bs-primary);
}

.stat-tile {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  padding: 0.65rem 0.75rem;
  height: 100%;
}

.stat-value {
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1.2;
}

.stat-value--sm {
  font-size: 0.95rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
  margin-top: 0.15rem;
}

.run-log {
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: var(--bs-font-monospace);
  background: var(--bs-tertiary-bg, #f8f9fa);
}

.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}
</style>
