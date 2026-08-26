<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { Modal } from 'bootstrap';
import { api, authHeaders } from '@/utils/api';
import { contributionKinds } from '@/utils/contributionKinds';
import ContributionKindBadges from '@/components/contributions/ContributionKindBadges.vue';
import RunContributionDialog from '@/components/project/RunContributionDialog.vue';
import CohortAnalyticsPanel from '@/components/project/CohortAnalyticsPanel.vue';

const props = defineProps({
  datasets: { type: Array, default: () => [] },
  selectedDatasetId: { type: String, default: '' },
  canManage: { type: Boolean, default: false },
  projectId: { type: String, default: '' },
  jupyterUrl: { type: String, default: '' },
});

const emit = defineEmits(['update:selectedDatasetId', 'run-complete', 'go-datasets']);

const catalogContributions = ref([]);
const signalsByDataset = ref({});
const signalsLoading = ref(false);
const runDialogRef = ref(null);

const instructModalEl = ref(null);
let instructModal = null;
const instructRow = ref(null);

const ANALYSIS_KINDS = new Set(['sql', 'notebook', 'cli', 'postgres_extension']);

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

const orderedDatasets = computed(() => {
  const rows = [...(props.datasets || [])].map((d) => ({
    id: String(d.id || d.dataset_id || ''),
    name: d.name || d.id || 'Dataset',
    summary: summaryOf(d),
    table_count: Number(d.table_count ?? summaryOf(d)?.table_count ?? 0),
    physical_table_count: Number(
      d.physical_table_count ?? summaryOf(d)?.physical_table_count ?? 0
    ),
    read_only: Boolean(d.read_only),
    loaded:
      Number(d.physical_table_count ?? summaryOf(d)?.physical_table_count ?? d.table_count ?? 0) > 0,
  }));
  rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return rows;
});

const selectedDataset = computed(
  () => orderedDatasets.value.find((d) => d.id === props.selectedDatasetId) || null
);

const selectedSummary = computed(() => selectedDataset.value?.summary || {});

const runnableSqlContributions = computed(() =>
  catalogContributions.value.filter(
    (c) => c.runnable && contributionKinds(c).includes('sql')
  )
);

const analysisCatalogRows = computed(() =>
  catalogContributions.value.filter((c) => {
    const kinds = contributionKinds(c);
    return kinds.some((k) => ANALYSIS_KINDS.has(k)) && !kinds.includes('dataset');
  })
);

function toolReadiness(row) {
  const kinds = contributionKinds(row);
  if (kinds.includes('postgres_extension')) {
    return { state: 'extension', label: 'Install on Postgres' };
  }
  if (kinds.includes('sql') && row.runnable) {
    if (!selectedDataset.value?.loaded) {
      return { state: 'needs_data', label: 'Load data first' };
    }
    const sigs = signalsByDataset.value[props.selectedDatasetId];
    if (sigs === undefined) return { state: 'checking', label: 'Checking signals…' };
    const signalTypes = new Set(
      (sigs?.signals || []).map((s) => String(s.signal_type || s.name || '').toLowerCase())
    );
    if (row.slug === 'w4h-sql-compute-mets') {
      const ok = signalTypes.has('calories') && signalTypes.has('weight');
      return ok
        ? { state: 'ready', label: 'Ready' }
        : { state: 'missing', label: 'Missing calories or weight' };
    }
    return signalTypes.size
      ? { state: 'ready', label: 'Ready' }
      : { state: 'missing', label: 'No mapped signals' };
  }
  if (kinds.includes('notebook') || kinds.includes('cli')) {
    return selectedDataset.value?.loaded
      ? { state: 'manual', label: 'Notebook / CLI' }
      : { state: 'needs_data', label: 'Load data first' };
  }
  return { state: 'manual', label: 'See catalog' };
}

function showReadinessBadge(row) {
  const readiness = toolReadiness(row);
  if (readiness.state === 'manual') return false;
  return true;
}

async function loadCatalog() {
  try {
    const res = await api.get('/contributions', authHeaders());
    catalogContributions.value = res.data || [];
  } catch {
    catalogContributions.value = [];
  }
}

async function loadSignals(datasetId) {
  if (!datasetId) return;
  signalsLoading.value = true;
  try {
    const res = await api.get(`/datasets/${encodeURIComponent(datasetId)}/signals`, authHeaders());
    signalsByDataset.value = { ...signalsByDataset.value, [datasetId]: res.data };
  } catch {
    signalsByDataset.value = { ...signalsByDataset.value, [datasetId]: { signals: [] } };
  } finally {
    signalsLoading.value = false;
  }
}

watch(
  () => props.selectedDatasetId,
  (id) => {
    if (id && signalsByDataset.value[id] === undefined) loadSignals(id);
  },
  { immediate: true }
);

watch(
  orderedDatasets,
  (rows) => {
    if (!rows.length) {
      emit('update:selectedDatasetId', '');
      return;
    }
    if (!rows.some((r) => r.id === props.selectedDatasetId)) {
      emit('update:selectedDatasetId', rows[0].id);
    }
  },
  { immediate: true }
);

onMounted(loadCatalog);

onMounted(() => {
  if (!instructModalEl.value) return;
  instructModal = new Modal(instructModalEl.value);
});

function onDatasetChange(event) {
  emit('update:selectedDatasetId', event.target.value);
}

function openRunDialog(slug) {
  if (!props.canManage) return;
  runDialogRef.value?.open({
    slug,
    datasetId: props.selectedDatasetId,
  });
}

function openRunDialogGeneric() {
  if (!props.canManage || !runnableSqlContributions.value.length) return;
  openRunDialog(runnableSqlContributions.value[0]?.slug);
}

function openInstructions(row) {
  instructRow.value = row;
  instructModal?.show();
}

function onRunComplete(payload) {
  emit('run-complete', payload);
  if (payload?.datasetId) loadSignals(payload.datasetId);
}

const localRunTargets = computed(() => orderedDatasets.value.filter((d) => !d.read_only));

const metsSummary = computed(() => selectedSummary.value?.mets_summary || null);
const wearSummary = computed(() => selectedSummary.value?.wear_compliance || null);
</script>

<template>
  <div class="card p-3">
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div>
        <h5 class="card-title mb-1">Analytics</h5>
        <p class="small text-muted mb-0">
          Compare a selected cohort to a control group, then run curated analysis contributions
          against the same dataset. SQL jobs use the same
          <code>POST /contributions/:slug/run</code> entry as imports.
        </p>
      </div>
      <button
        v-if="canManage && runnableSqlContributions.length && selectedDataset?.loaded"
        type="button"
        class="btn btn-sm btn-primary flex-shrink-0"
        @click="openRunDialogGeneric"
      >
        <i class="bi bi-play-fill" aria-hidden="true"></i> Run analysis…
      </button>
    </div>

    <div v-if="orderedDatasets.length === 0" class="alert alert-light border small mb-3">
      No datasets linked to this project.
      <button type="button" class="btn btn-link btn-sm p-0 align-baseline" @click="emit('go-datasets')">
        Add a dataset on the Datasets tab →
      </button>
    </div>
    <div v-else class="row g-2 align-items-end mb-3">
      <div class="col-md-8">
        <label class="form-label small mb-0">Dataset</label>
        <select
          class="form-select form-select-sm"
          :value="selectedDatasetId"
          @change="onDatasetChange"
        >
          <option v-for="d in orderedDatasets" :key="d.id" :value="d.id">
            {{ d.name }}{{ d.loaded ? ' · loaded' : ' · needs data' }}
          </option>
        </select>
      </div>
      <div class="col-md-4 small text-muted">
        <span v-if="selectedDataset?.loaded">{{ selectedDataset.table_count }} table(s)</span>
        <span v-else>Load tables on the Datasets tab first.</span>
      </div>
    </div>

    <CohortAnalyticsPanel
      :dataset-id="selectedDatasetId"
      :loaded="Boolean(selectedDataset?.loaded)"
    />

    <div v-if="selectedDataset?.loaded && (metsSummary || wearSummary)" class="mb-3">
      <div class="small fw-semibold mb-2">Cached cohort summary</div>
      <div class="row g-2">
        <div v-if="wearSummary" class="col-md-6">
          <div class="border rounded p-2 small">
            <div class="text-muted">Wear compliance</div>
            <div class="fw-semibold">
              {{ wearSummary.subjects_compliant ?? '—' }} /
              {{ wearSummary.subjects_total ?? '—' }} subjects
            </div>
          </div>
        </div>
        <div v-if="metsSummary" class="col-md-6">
          <div class="border rounded p-2 small">
            <div class="text-muted">METs summary</div>
            <div class="fw-semibold">
              Cohort mean {{ metsSummary.cohort_mean_mets ?? '—' }} MET
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="mb-2 d-flex align-items-center justify-content-between gap-2">
      <div class="small fw-semibold mb-0">Contributions for this dataset</div>
      <router-link :to="{ name: 'contributions' }" class="small text-decoration-none">
        Browse full catalog →
      </router-link>
    </div>

    <div v-if="!analysisCatalogRows.length" class="small text-muted">Loading contributions…</div>
    <ul v-else class="list-group list-group-flush border rounded">
      <li
        v-for="row in analysisCatalogRows"
        :key="row.slug"
        class="list-group-item"
      >
        <div class="d-flex flex-wrap align-items-start justify-content-between gap-2">
          <div class="flex-grow-1 min-w-0">
            <div class="fw-semibold">{{ row.title || row.slug }}</div>
            <div class="d-flex flex-wrap align-items-center gap-1 mt-1">
              <ContributionKindBadges :row="row" />
              <span
                v-if="showReadinessBadge(row)"
                class="badge rounded-pill"
                :class="{
                  'text-bg-success': toolReadiness(row).state === 'ready',
                  'text-bg-secondary': toolReadiness(row).state === 'extension',
                  'text-bg-warning': toolReadiness(row).state === 'missing' || toolReadiness(row).state === 'needs_data',
                  'text-bg-light text-dark': toolReadiness(row).state === 'checking',
                }"
              >{{ toolReadiness(row).label }}</span>
            </div>
            <p v-if="row.summary" class="small text-muted mb-0 mt-2">{{ row.summary }}</p>
          </div>
          <div class="d-flex gap-1 flex-shrink-0">
          <button
            v-if="canManage && row.runnable && contributionKinds(row).includes('sql') && toolReadiness(row).state === 'ready'"
            type="button"
            class="btn btn-sm btn-primary"
            @click="openRunDialog(row.slug)"
          >
            Run
          </button>
          <button
            v-else-if="contributionKinds(row).includes('postgres_extension') || contributionKinds(row).includes('notebook') || contributionKinds(row).includes('cli')"
            type="button"
            class="btn btn-sm btn-outline-secondary"
            @click="openInstructions(row)"
          >
            Instructions
          </button>
          <router-link
            :to="{ name: 'contributionDetail', params: { slug: row.slug } }"
            class="btn btn-sm btn-outline-secondary"
          >
            Details
          </router-link>
          </div>
        </div>
      </li>
    </ul>
  </div>

  <RunContributionDialog
    ref="runDialogRef"
    variant="analysis"
    :contributions="runnableSqlContributions"
    :local-run-targets="localRunTargets"
    :catalog-run-targets="[]"
    :can-manage="canManage"
    :project-id="projectId"
    @run-complete="onRunComplete"
  />

  <div class="modal fade" tabindex="-1" ref="instructModalEl" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ instructRow?.title || 'Run instructions' }}</h5>
          <button type="button" class="btn-close" aria-label="Close" data-bs-dismiss="modal"></button>
        </div>
        <div class="modal-body small">
          <template v-if="instructRow && contributionKinds(instructRow).includes('postgres_extension')">
            <p>
              <strong>{{ instructRow.title }}</strong> is a PostgreSQL extension — install it on your
              institution’s Postgres (<code>CREATE EXTENSION</code>), then query mapped dataset tables
              from a notebook or SQL client.
            </p>
            <p class="mb-0">W4H lists the extension in Contributions; it does not run it per dataset from the app.</p>
          </template>
          <template v-else-if="instructRow">
            <p>
              Run this tool from the contribution repo’s notebook or CLI against
              <strong>{{ selectedDataset?.name || 'your dataset' }}</strong>.
            </p>
            <p v-if="jupyterUrl" class="mb-2">
              <a :href="jupyterUrl" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-primary">
                Open JupyterLab
                <i class="bi bi-box-arrow-up-right ms-1" aria-hidden="true"></i>
              </a>
            </p>
            <pre class="p-2 border rounded bg-light mb-2">W4H_DATASET_ID={{ selectedDatasetId || '&lt;dataset-id&gt;' }} # see contribution README</pre>
            <router-link :to="{ name: 'contributionDetail', params: { slug: instructRow.slug } }">
              View full setup in Contributions →
            </router-link>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
