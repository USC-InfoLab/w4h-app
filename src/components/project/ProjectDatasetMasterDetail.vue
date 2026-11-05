<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';
import { contributionKinds } from '@/utils/contributionKinds';
import { importerSlugForDataset, findLoadedLinkAlternative } from '@/utils/importerSlugForDataset';
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
  'replace-linked-datasets',
  'update:datasetToAdd',
  'update:newDatasetName',
  'dataset-pick',
  'create-dataset',
  'dataset-run-complete',
]);

const ADD_ID = '__add__';

const selectedId = ref('');
const pendingSelectId = ref('');

function onCreateNameInput(event) {
  emit('update:newDatasetName', event.target.value);
}

function onCreateSelect(event) {
  const value = event.target.value;
  emit('update:datasetToAdd', value);
  if (value && value !== '__new__') {
    linkCatalogDataset(value);
  }
}

const runnableContributions = ref([]);

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

const runDialogRef = ref(null);

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

function signalLabel(name) {
  return String(name || '').replace(/[_-]+/g, ' ');
}

function mapDatasetRow(d) {
  const summary = summaryOf(d);
  const tableCount = Number(d.table_count ?? summary?.table_count ?? 0);
  const physicalTableCount = Number(d.physical_table_count ?? summary?.physical_table_count ?? 0);
  return {
    id: String(d.id || d.dataset_id || ''),
    name: d.name || d.id || 'Dataset',
    description: d.description || '',
    summary,
    summary_updated_at: d.summary_updated_at || null,
    table_count: tableCount,
    physical_table_count: physicalTableCount,
    read_only: Boolean(d.read_only),
    origin: d.origin || '',
    source_label: d.source_label || '',
    last_importer_slug: d.last_importer_slug || null,
    last_importer_title: d.last_importer_title || null,
    signals: Array.isArray(d.signals) ? d.signals : [],
    loaded: physicalTableCount > 0 || tableCount > 0,
  };
}

const orderedDatasets = computed(() => {
  const rows = [...(props.datasets || [])].map(mapDatasetRow);
  rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return rows;
});

const catalogRows = computed(() => {
  const rows = [...(props.addableDatasets || [])].map(mapDatasetRow);
  rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return rows;
});

const selected = computed(() => {
  const id = selectedId.value;
  return orderedDatasets.value.find((d) => d.id === id) || null;
});

const selectedSummary = computed(() => selected.value?.summary || {});

const localRunTargets = computed(
  () => orderedDatasets.value.filter((d) => !d.read_only)
);

const catalogRunTargets = computed(() =>
  catalogRows.value
    .filter((d) => !d.read_only)
    .map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      table_count: d.table_count,
      read_only: d.read_only,
      last_importer_slug: d.last_importer_slug,
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

function rowIndicators(row) {
  const s = row?.summary || {};
  const items = [];
  const tables = Number(row?.table_count || 0);
  items.push({
    key: 'tables',
    value: String(tables),
    label: tables === 1 ? 'table' : 'tables',
  });
  if (s.participants != null) {
    const n = Number(s.participants);
    items.push({
      key: 'participants',
      value: formatApproxNumber(s.participants),
      label: n === 1 ? 'participant' : 'participants',
    });
  }
  if (s.observations != null) {
    items.push({
      key: 'observations',
      value: formatApproxNumber(s.observations, s.observations_approx !== false),
      label: 'obs',
    });
  }
  if (s.participant_days != null) {
    items.push({
      key: 'days',
      value: formatApproxNumber(s.participant_days),
      label: 'days',
    });
  }
  const range = formatDateRange(s);
  if (range) {
    items.push({ key: 'range', value: range, label: '' });
  }
  return items;
}

function toggleOpen(id) {
  selectedId.value = selectedId.value === id ? '' : id;
}

function linkCatalogDataset(id) {
  const nextId = String(id || '');
  if (!nextId || nextId === '__new__') return;
  pendingSelectId.value = nextId;
  emit('dataset-pick', nextId);
  emit('update:datasetToAdd', '');
}

let knownIds = new Set();

function selectDefault() {
  const rows = orderedDatasets.value;
  const nextIds = new Set(rows.map((r) => r.id));

  if (pendingSelectId.value) {
    const pending = pendingSelectId.value;
    if (rows.some((r) => r.id === pending)) {
      selectedId.value = pending;
      pendingSelectId.value = '';
      knownIds = nextIds;
      return;
    }
  }

  if (selectedId.value === ADD_ID) {
    const addedId = rows.find((r) => !knownIds.has(r.id))?.id;
    knownIds = nextIds;
    if (addedId) selectedId.value = addedId;
    return;
  }

  knownIds = nextIds;
  if (!rows.length) {
    selectedId.value = props.canManage ? ADD_ID : '';
    return;
  }
  if (selectedId.value && rows.some((r) => r.id === selectedId.value)) {
    return;
  }
  selectedId.value = rows[0].id;
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

  <div v-else class="card overflow-hidden">
    <div class="p-3 border-bottom">
      <h5 class="mb-1">Datasets on this project</h5>
      <p class="small text-muted mb-0">
        Open a dataset for import and coverage. Counts sit on each heading.
      </p>
    </div>

    <div class="dataset-accordion">
      <div
        v-for="row in orderedDatasets"
        :key="row.id"
        class="dataset-accordion__item"
        :class="{ 'dataset-accordion__item--open': selectedId === row.id }"
      >
        <button
          type="button"
          class="dataset-accordion__heading"
          :aria-expanded="selectedId === row.id ? 'true' : 'false'"
          :aria-controls="`dataset-tray-${row.id}`"
          @click="toggleOpen(row.id)"
        >
          <i class="bi bi-database text-muted flex-shrink-0" aria-hidden="true"></i>
          <div class="min-w-0 flex-grow-1">
            <div class="d-flex flex-wrap align-items-center gap-2">
              <span class="fw-semibold text-truncate">{{ row.name }}</span>
              <span v-if="row.read_only" class="badge text-bg-info">Read-only sample</span>
              <span v-else-if="row.loaded" class="badge text-bg-success">Loaded</span>
              <span v-else class="badge text-bg-warning">Needs ingest</span>
            </div>
            <div v-if="rowIndicators(row).length" class="dataset-indicators">
              <span
                v-for="item in rowIndicators(row)"
                :key="item.key"
                class="dataset-indicator"
              >
                <span class="dataset-indicator__value">{{ item.value }}</span>
                <span v-if="item.label" class="dataset-indicator__label">{{ item.label }}</span>
              </span>
            </div>
          </div>
          <i
            class="bi flex-shrink-0 dataset-accordion__chevron"
            :class="selectedId === row.id ? 'bi-chevron-up' : 'bi-chevron-down'"
            aria-hidden="true"
          ></i>
        </button>

        <div
          v-if="selectedId === row.id && selected"
          :id="`dataset-tray-${row.id}`"
          class="dataset-accordion__tray"
        >
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
            <div class="min-w-0">
              <div v-if="selected.read_only || selected.source_label" class="small text-muted">
                {{ selected.source_label || selected.origin || 'W4H Samples' }}
              </div>
              <p v-if="selected.description" class="small mb-0 mt-1">{{ selected.description }}</p>
              <p v-if="selected.last_importer_title" class="small mb-0 mt-1">
                Loaded with <strong>{{ selected.last_importer_title }}</strong>
              </p>
              <div v-if="selected.signals.length" class="dataset-signals mt-2">
                <span
                  v-for="sig in selected.signals"
                  :key="sig.name"
                  class="badge rounded-pill text-bg-secondary fw-normal"
                  :title="sig.description || sig.name"
                >{{ signalLabel(sig.name) }}</span>
              </div>
            </div>
            <div class="d-flex flex-column align-items-end gap-1">
              <button
                v-if="canRunImportOnSelected"
                type="button"
                class="btn btn-sm btn-primary"
                @click="openRunDialog"
              >
                <i
                  class="bi"
                  :class="selected.table_count === 0 ? 'bi-ui-checks' : 'bi-play-fill'"
                  aria-hidden="true"
                ></i>
                {{ importActionLabel }}
              </button>
              <small v-if="selected.summary_updated_at" class="text-muted">
                {{ relativeFreshness(selected.summary_updated_at) }}
              </small>
            </div>
          </div>

          <div v-if="cohorts.length" class="mb-3">
            <div class="small fw-semibold mb-2">Cohorts</div>
            <div class="row g-2">
              <div v-for="(c, idx) in cohorts" :key="idx" class="col-6 col-md-4">
                <div class="d-flex justify-content-between small border rounded px-2 py-1">
                  <span>{{ c.name || c.label || 'Cohort' }}</span>
                  <strong>{{ formatApproxNumber(c.count ?? c.n) }}</strong>
                </div>
              </div>
            </div>
          </div>

          <div v-if="coverage.length" class="mb-3">
            <div class="small fw-semibold mb-2">Data coverage</div>
            <div v-for="(c, idx) in coverage" :key="idx" class="mb-2">
              <div class="d-flex justify-content-between small mb-1">
                <span>{{ c.label || c.name || c.modality }}</span>
                <span>{{ Number(c.pct ?? c.percent ?? 0) }}%</span>
              </div>
              <div class="progress" style="height: 6px">
                <div
                  class="progress-bar"
                  role="progressbar"
                  :style="{ width: `${Math.max(0, Math.min(100, Number(c.pct ?? c.percent ?? 0)))}%` }"
                />
              </div>
            </div>
          </div>

          <p v-if="selected.read_only" class="small mb-3">
            Super admin seeded this sample. It is read-only — do not re-ingest.
          </p>
          <template v-else-if="selected.table_count === 0">
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
              Not loaded yet. Adapt a notebook or deploy a CLI from a Contributions example.
              Tables appear here after that.
            </p>
          </template>
          <p v-else-if="selected.physical_table_count === 0" class="small text-muted mb-3">
            Catalog exists but no tables are in the database yet.
          </p>
          <p v-else-if="Number(selectedSummary.observations) === 0" class="small text-muted mb-3">
            The registered tables exist and currently report 0 observations.
          </p>
          <p v-if="canManage && projectId" class="small text-muted mb-0">
            Unlink this dataset in
            <router-link
              :to="{ name: 'adminProjectsEdit', params: { id: projectId }, query: { tab: 'settings' } }"
            >project Settings</router-link>.
          </p>
        </div>
      </div>

      <div
        v-if="canManage"
        class="dataset-accordion__item"
        :class="{ 'dataset-accordion__item--open': selectedId === ADD_ID }"
      >
        <button
          type="button"
          class="dataset-accordion__heading"
          :aria-expanded="selectedId === ADD_ID ? 'true' : 'false'"
          aria-controls="dataset-tray-add"
          @click="toggleOpen(ADD_ID)"
        >
          <i class="bi bi-plus-lg text-primary flex-shrink-0" aria-hidden="true"></i>
          <div class="min-w-0 flex-grow-1 text-start">
            <span class="fw-semibold">Add a dataset</span>
            <div class="small text-muted">Link one you can use, or create an empty row for this project.</div>
          </div>
          <i
            class="bi flex-shrink-0 dataset-accordion__chevron"
            :class="selectedId === ADD_ID ? 'bi-chevron-up' : 'bi-chevron-down'"
            aria-hidden="true"
          ></i>
        </button>
        <div v-if="selectedId === ADD_ID" id="dataset-tray-add" class="dataset-accordion__tray">
          <div v-if="!hasTeam" class="alert alert-warning small mb-0">
            Set an owning team before assigning datasets.
          </div>
          <template v-else>
            <p class="small text-muted mb-3">
              Link a dataset your team owns or that was shared with you. Discoverable datasets from
              other teams are on the Datasets catalog — they are not linkable until shared.
            </p>
            <div class="row g-2 align-items-end">
              <div class="col">
                <label class="form-label small mb-0">Dataset</label>
                <select
                  class="form-select form-select-sm"
                  :value="datasetToAdd"
                  :disabled="savingDatasets"
                  @change="onCreateSelect"
                >
                  <option value="">Choose a dataset…</option>
                  <option v-for="d in catalogRows" :key="d.id" :value="d.id">
                    {{ d.name }}{{ d.loaded ? ' · loaded' : ' · empty' }}{{ d.read_only ? ' (read-only sample)' : '' }}
                  </option>
                  <option value="__new__">Create a new dataset…</option>
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
                  @input="onCreateNameInput"
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
      </div>
    </div>
  </div>

  <RunContributionDialog
    ref="runDialogRef"
    variant="import"
    :contributions="runnableContributions"
    :local-run-targets="localRunTargets"
    :catalog-run-targets="catalogRunTargets"
    :can-manage="canManage"
    :project-id="projectId"
    @run-complete="onRunComplete"
    @dataset-pick="emit('dataset-pick', $event)"
    @link-existing="onLinkExisting"
  />
</template>

<style scoped>
.dataset-signals {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.dataset-accordion__item {
  border-bottom: 1px solid var(--bs-border-color);
}

.dataset-accordion__item:last-child {
  border-bottom: 0;
}

.dataset-accordion__heading {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border: 0;
  background: transparent;
  text-align: left;
}

.dataset-accordion__item--open > .dataset-accordion__heading {
  background: rgba(13, 110, 253, 0.06);
}

.dataset-accordion__chevron {
  margin-top: 0.2rem;
  color: var(--bs-secondary-color);
}

.dataset-accordion__tray {
  padding: 0 1rem 1rem 2.75rem;
  background: rgba(13, 110, 253, 0.03);
}

.dataset-indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  margin-top: 0.25rem;
}

.dataset-indicator {
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;
}

.dataset-indicator__value {
  font-weight: 600;
  color: var(--bs-body-color);
}

.dataset-indicator__label {
  margin-left: 0.2rem;
}
</style>
