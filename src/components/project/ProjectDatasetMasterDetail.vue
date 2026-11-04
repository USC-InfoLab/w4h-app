<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Modal } from 'bootstrap';
import { api, authHeaders } from '@/utils/api';
import { contributionKinds } from '@/utils/contributionKinds';
import { importerSlugForDataset, findLoadedLinkAlternative } from '@/utils/importerSlugForDataset';
import DatasetsEdit from '@/views/admin/DatasetsEdit.vue';
import RunContributionDialog from '@/components/project/RunContributionDialog.vue';

const props = defineProps({
  datasets: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
  addableDatasets: { type: Array, default: () => [] },
  datasetToAdd: { type: String, default: '' },
  newDatasetName: { type: String, default: '' },
  savingDatasets: { type: Boolean, default: false },
  hasTeam: { type: Boolean, default: true },
  projectId: { type: String, default: '' },
});

const emit = defineEmits([
  'unlink-dataset',
  'replace-linked-datasets',
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
    runnableContributions.value = (res.data || []).filter(
      (c) => c.runnable && !contributionKinds(c).includes('sql')
    );
  } catch {
    runnableContributions.value = [];
  }
});

const detailsModalEl = ref(null);
let detailsModal = null;
const unlinkModalEl = ref(null);
let unlinkModal = null;
const pendingUnlink = ref(null);
// Tracks actual shown/hidden state (via Bootstrap's own events) so the embedded
// DatasetsEdit only mounts — and fetches — while the modal is really visible.
const detailsDialogOpen = ref(false);

function openDetailsDialog() {
  detailsModal?.show();
}

function closeDetailsDialog() {
  detailsModal?.hide();
}

function openUnlinkModal() {
  if (!selected.value?.id) return;
  pendingUnlink.value = {
    id: selected.value.id,
    name: selected.value.name || 'this dataset',
    empty: selected.value.table_count === 0,
  };
  unlinkModal?.show();
}

function confirmUnlink() {
  const id = pendingUnlink.value?.id;
  unlinkModal?.hide();
  if (id) emit('unlink-dataset', id);
}

const runDialogRef = ref(null);

onMounted(() => {
  if (detailsModalEl.value) {
    detailsModal = new Modal(detailsModalEl.value);
    detailsModalEl.value.addEventListener('show.bs.modal', () => {
      detailsDialogOpen.value = true;
    });
    detailsModalEl.value.addEventListener('hidden.bs.modal', () => {
      detailsDialogOpen.value = false;
    });
  }
  if (unlinkModalEl.value) {
    unlinkModal = new Modal(unlinkModalEl.value);
  }
});

onBeforeUnmount(() => {
  detailsModal?.dispose();
  unlinkModal?.dispose();
});

function openRunDialog() {
  if (!selected.value || selected.value.read_only) return;
  const isFirstImport = selected.value.table_count === 0;
  runDialogRef.value?.open({
    datasetId: selected.value.id,
    slug:
      isFirstImport
        ? undefined
        : importerSlugForDataset(selected.value, runnableContributions.value) || undefined,
    mode: isFirstImport ? 'full' : 'update',
    contextual: true,
  });
}

function onRunComplete({ datasetId }) {
  if (datasetId) selectedId.value = datasetId;
  emit('dataset-run-complete');
}

function onLinkExisting({ linkId, unlinkId, selectId }) {
  emit('replace-linked-datasets', {
    linkId: linkId || null,
    unlinkId: unlinkId || null,
    archiveUnlinkIfEmpty: true,
  });
  if (selectId) selectedId.value = selectId;
}

const loadedLinkHint = computed(() => {
  if (!selected.value || selected.value.table_count > 0 || !runnableContributions.value.length) {
    return null;
  }
  const slug = importerSlugForDataset(selected.value, runnableContributions.value);
  if (!slug) return null;
  return findLoadedLinkAlternative({
    targetDatasetId: selected.value.id,
    importerSlug: slug,
    localRunTargets: localRunTargets.value,
    catalogRunTargets: catalogRunTargets.value,
    contributions: runnableContributions.value,
  });
});

function linkLoadedAlternative() {
  const alt = loadedLinkHint.value;
  if (!alt || !selected.value) return;
  onLinkExisting({
    linkId: alt.alreadyLinked ? null : alt.id,
    unlinkId: selected.value.id,
    selectId: alt.id,
  });
}

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

const aggregateSummary = computed(() => {
  const rows = orderedDatasets.value;
  const summary = {
    dataset_count: rows.length,
    table_count: rows.reduce((total, row) => total + Number(row.table_count || 0), 0),
    observations: 0,
    observations_approx: true,
    participants: 0,
    participant_days: 0,
    summary_updated_at: null,
  };
  let hasObservations = false;
  let hasParticipants = false;
  let hasParticipantDays = false;
  let latestUpdatedAt = 0;

  for (const row of rows) {
    const rowSummary = row.summary || {};
    if (rowSummary.observations != null) {
      summary.observations += Number(rowSummary.observations || 0);
      hasObservations = true;
      if (rowSummary.observations_approx === false) summary.observations_approx = false;
    }
    if (rowSummary.participants != null) {
      summary.participants += Number(rowSummary.participants || 0);
      hasParticipants = true;
    }
    if (rowSummary.participant_days != null) {
      summary.participant_days += Number(rowSummary.participant_days || 0);
      hasParticipantDays = true;
    }
    if (row.summary_updated_at) {
      const updatedAt = new Date(row.summary_updated_at).getTime();
      if (Number.isFinite(updatedAt) && updatedAt > latestUpdatedAt) latestUpdatedAt = updatedAt;
    }
  }

  if (!hasObservations) delete summary.observations;
  if (!hasParticipants) delete summary.participants;
  if (!hasParticipantDays) delete summary.participant_days;
  if (latestUpdatedAt > 0) summary.summary_updated_at = new Date(latestUpdatedAt).toISOString();
  return summary;
});

const linkedDropdownDatasets = computed(() =>
  orderedDatasets.value.map((d) => ({
    id: d.id,
    name: d.name || d.id,
    table_count: d.table_count,
    read_only: d.read_only,
  }))
);

const selected = computed(() => {
  const id = selectedId.value;
  return orderedDatasets.value.find((d) => d.id === id) || null;
});

const selectedSummary = computed(() => {
  if (showingAllDatasets.value) return aggregateSummary.value;
  return selected.value?.summary || {};
});

const showingAllDatasets = computed(() => !selectedId.value);

function showCombinedSummary() {
  selectedId.value = '';
}

// Run targets: any non-read-only dataset
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
    .map((d) => ({
      id: String(d.id),
      name: d.name || d.id,
      description: d.description || '',
      table_count: Number(d.table_count ?? d.summary?.table_count ?? 0),
      read_only: Boolean(d.read_only),
    }))
);

const cohorts = computed(() => {
  const list = selectedSummary.value?.cohorts;
  return Array.isArray(list) && list.length ? list : [];
});

const coverage = computed(() => {
  const list = selectedSummary.value?.coverage;
  return Array.isArray(list) && list.length ? list : [];
});

const importActionLabel = computed(() =>
  selected.value && Number(selected.value.table_count) === 0 ? 'Select importer…' : 'Run import…'
);

const canRunImportOnSelected = computed(
  () =>
    props.canManage &&
    runnableContributions.value.length &&
    selected.value &&
    !selected.value.read_only &&
    localRunTargets.value.some((d) => d.id === selected.value.id)
);

const hasStats = computed(() => {
  const s = selectedSummary.value;
  return Boolean(
    s.dataset_count != null ||
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
  if (!selectedId.value) {
    return;
  }
  if (!rows.some((r) => r.id === selectedId.value)) {
    selectedId.value = '';
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
    <p class="text-muted mb-0">None yet. A project Admin adds them.</p>
  </div>

  <div v-else class="card" :class="{ 'overflow-hidden dataset-master-detail': orderedDatasets.length }">
    <div class="row g-0">
      <div v-if="orderedDatasets.length" class="col-12 col-xl-5 border-end dataset-master-detail__list">
        <div class="p-3 border-bottom dataset-master-detail__list-header">
          <h5 class="mb-0">Datasets on this project</h5>
          <div class="d-flex flex-wrap gap-2 dataset-master-detail__list-actions">
            <button type="button" class="btn btn-sm btn-outline-secondary flex-shrink-0"
              :class="{ active: showingAllDatasets }" @click="showCombinedSummary">
              All datasets
            </button>
            <button v-if="canManage" type="button" class="btn btn-sm btn-outline-primary flex-shrink-0"
              :class="{ active: selectedId === ADD_ID }" @click="selectedId = ADD_ID">
              <i class="bi bi-plus-lg" aria-hidden="true"></i> Add dataset
            </button>
          </div>
        </div>
        <div class="list-group list-group-flush dataset-selector">
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
            Team catalog →
          </router-link>
          <span class="small text-muted"> Rename a dataset, or share it with another team.</span>
        </div>
      </div>

      <div class="dataset-master-detail__detail" :class="orderedDatasets.length ? 'col-12 col-xl-7' : 'col-12'">
        <div v-if="!orderedDatasets.length || (canManage && selectedId === ADD_ID)" class="p-3 h-100">
          <template v-if="!orderedDatasets.length">
            <h5 class="mb-2">Datasets on this project</h5>
            <p class="text-muted mb-3">
              None yet. Choose a dataset your team already has, or create a new empty one.
              That attaches it to this project. Tables are loaded afterward: select an importer,
              or use a Contribution.
            </p>
          </template>
          <template v-else>
            <div class="small text-muted text-uppercase mb-1">Add to this project</div>
            <h5 class="mb-2">Add a dataset</h5>
            <p class="small text-muted mb-3">
              Choosing one attaches it to this project. Tables are loaded afterward.
              Sample datasets are read-only.
            </p>
          </template>
          <div v-if="!hasTeam" class="alert alert-warning small mb-0">
            Set an owning team before assigning datasets.
          </div>
          <template v-else>
            <div class="row g-2 align-items-end">
              <div class="col">
                <label class="form-label small mb-0">Dataset</label>
                <select class="form-select form-select-sm" :value="datasetToAdd" :disabled="savingDatasets"
                  @change="onDatasetSelect">
                  <option value="">Choose a dataset…</option>
                  <optgroup v-if="linkedDropdownDatasets.length" label="Already on this project">
                    <option v-for="d in linkedDropdownDatasets" :key="`linked-${d.id}`" disabled>
                      {{ d.name || d.id
                      }}{{
                        Number(d.table_count ?? 0) > 0
                          ? ' · loaded'
                          : ' · empty'
                      }}{{ d.read_only ? ' (read-only sample)' : '' }}
                    </option>
                  </optgroup>
                  <option v-for="d in addableDatasets" :key="d.id" :value="String(d.id)">
                    {{ d.name || d.id
                    }}{{
                      Number(d.table_count ?? d.summary?.table_count ?? 0) > 0
                        ? ' · loaded'
                        : ' · empty'
                    }}{{ d.read_only ? ' (read-only sample)' : '' }}
                  </option>
                  <option value="__new__">Create a new dataset…</option>
                </select>
              </div>
            </div>
            <div v-if="datasetToAdd === '__new__'" class="row g-2 align-items-end mt-2">
              <div class="col">
                <input class="form-control form-control-sm" placeholder="Dataset name" :value="newDatasetName"
                  :disabled="savingDatasets" @input="emit('update:newDatasetName', $event.target.value)"
                  @keyup.enter="emit('create-dataset')" />
              </div>
              <div class="col-auto">
                <button type="button" class="btn btn-sm btn-primary" :disabled="savingDatasets || !newDatasetName"
                  @click="emit('create-dataset')">
                  Create
                </button>
              </div>
            </div>
            <p v-if="!orderedDatasets.length" class="small text-muted mt-3 mb-0">
              <router-link :to="{ name: 'adminDatasets' }">Team catalog</router-link>
              is where you rename a dataset or share it with another team.
            </p>
          </template>
        </div>
        <div v-else-if="showingAllDatasets || selected" class="p-3 h-100 d-flex flex-column">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
            <div class="min-w-0">
              <div class="small text-muted text-uppercase">Dataset overview</div>
              <h5 class="mb-0 text-truncate">{{ showingAllDatasets ? 'All datasets' : selected.name }}</h5>
              <div v-if="!showingAllDatasets && (selected.read_only || selected.source_label)"
                class="small text-muted mt-1">
                {{ selected.source_label || selected.origin || 'W4H Samples' }}
              </div>
              <div v-else-if="showingAllDatasets" class="small text-muted mt-1">
                Counts across every dataset on this project.
              </div>
            </div>
            <div class="d-flex flex-column align-items-end gap-2">
              <button v-if="canRunImportOnSelected" type="button" class="btn btn-sm btn-primary flex-shrink-0"
                @click="openRunDialog">
                <i class="bi" :class="selected.table_count === 0 ? 'bi-ui-checks' : 'bi-play-fill'" aria-hidden="true"></i>
                {{ importActionLabel }}
              </button>
              <small v-if="selectedSummary.summary_updated_at" class="text-muted">
                {{ relativeFreshness(selectedSummary.summary_updated_at) }}
              </small>
            </div>
          </div>

          <template v-if="hasStats">
            <div class="row g-2 mb-3">
              <div v-if="showingAllDatasets" class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value">{{ aggregateSummary.dataset_count }}</div>
                  <div class="stat-label">
                    {{ aggregateSummary.dataset_count === 1 ? 'Dataset' : 'Datasets' }}
                  </div>
                </div>
              </div>
              <div class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value">{{ showingAllDatasets ? aggregateSummary.table_count : selected.table_count }}
                  </div>
                  <div class="stat-label">
                    {{ (showingAllDatasets ? aggregateSummary.table_count : selected.table_count) === 1 ? 'Table' :
                      'Tables' }}
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

            <p v-if="!showingAllDatasets && selected.read_only" class="small mb-3">
              Super admin seeded this sample. It is read-only — do not re-ingest.
            </p>
            <template v-else-if="!showingAllDatasets && selected.table_count === 0">
              <p v-if="canRunImportOnSelected" class="small text-muted mb-3">
                Not loaded yet. <strong>Select importer…</strong> to choose what fills this dataset:
                your own files, or a sample package.
              </p>
              <div v-if="loadedLinkHint" class="alert alert-info py-2 small mb-3">
                <strong>{{ loadedLinkHint.name }}</strong> already has this sample loaded
                {{ loadedLinkHint.alreadyLinked ? 'on this project' : 'in your team catalog' }}.
                <button type="button" class="btn btn-link btn-sm p-0 align-baseline" @click="linkLoadedAlternative">
                  Link it instead
                </button>
                — that uses the existing tables. This empty row will be unlinked and archived.
              </div>
              <p v-else-if="!canRunImportOnSelected" class="small text-muted mb-3">
                Not loaded yet. Adapt a notebook or deploy a CLI from a Contributions example
                into your team catalog. Tables and stats appear here after that.
              </p>
            </template>
            <p v-else-if="!showingAllDatasets && selected.physical_table_count === 0" class="small text-muted mb-3">
              Catalog exists but no tables are in the database yet.
            </p>
            <p v-else-if="!showingAllDatasets && Number(selectedSummary.observations) === 0"
              class="small text-muted mb-3">
              The registered tables exist and currently report 0 observations.
            </p>
            <p v-else-if="showingAllDatasets" class="small text-muted mb-3">
              Select a dataset on the left for dataset-specific details, ingest actions, and unlink controls.
            </p>
          </template>

          <div v-else class="text-muted small mb-3 flex-grow-1">
            <p v-if="!showingAllDatasets && selected.description" class="mb-2">{{ selected.description }}</p>
            <p v-if="!showingAllDatasets && selected.table_count === 0 && canRunImportOnSelected" class="mb-2">
              Not loaded yet. <strong>Select importer…</strong> above to choose what fills this dataset:
              your own files, or a sample package.
            </p>
            <p class="mb-0">
              Summary statistics are not available yet for {{ showingAllDatasets ? 'these datasets' : 'this dataset' }}.
              They
              appear here from a
              cached metadata layer after ingestion — this page does not run live full-table counts.
            </p>
          </div>

          <div class="mt-auto pt-2 d-flex flex-wrap align-items-center justify-content-between gap-2">
            <button v-if="!showingAllDatasets && selected.id" type="button"
              class="btn btn-link btn-sm small text-decoration-none px-0" @click="openDetailsDialog">
              Dataset details →
            </button>
            <button v-if="canManage && !showingAllDatasets && selected.id" type="button"
              class="btn btn-sm btn-outline-danger"
              @click="openUnlinkModal">
              Unlink from project
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <RunContributionDialog ref="runDialogRef" variant="import" :contributions="runnableContributions"
    :local-run-targets="localRunTargets" :catalog-run-targets="catalogRunTargets" :can-manage="canManage"
    :project-id="projectId" @run-complete="onRunComplete" @dataset-pick="emit('dataset-pick', $event)"
    @link-existing="onLinkExisting" />

  <div class="modal fade" tabindex="-1" ref="unlinkModalEl" aria-labelledby="unlinkDatasetTitle" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="unlinkDatasetTitle">Unlink {{ pendingUnlink?.name || 'this dataset' }}?</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p v-if="pendingUnlink?.empty" class="mb-0">
            It leaves this project. This dataset has no tables, so it is archived and drops out of the add list.
          </p>
          <p v-else class="mb-0">
            It leaves this project. The dataset and its tables stay in the team catalog, and Add dataset can put it back.
          </p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-danger" @click="confirmUnlink">Unlink</button>
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
.dataset-master-detail__list-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.dataset-master-detail__list-actions {
  margin-left: auto;
}

@media (min-width: 1200px) {
  .dataset-master-detail__list {
    max-width: 420px;
  }
}

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

.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}
</style>
