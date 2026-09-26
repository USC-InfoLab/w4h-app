<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { Modal } from 'bootstrap';
import { api, authHeaders } from '@/utils/api';
import FitbitFileUpload from './FitbitFileUpload.vue';
import { contributionKinds } from '@/utils/contributionKinds';
import { resolveRunSlug, importerSlugForDataset, findLoadedLinkAlternative } from '@/utils/importerSlugForDataset';

const props = defineProps({
  variant: {
    type: String,
    default: 'import',
    validator: (v) => v === 'import' || v === 'analysis',
  },
  contributions: { type: Array, default: () => [] },
  localRunTargets: { type: Array, default: () => [] },
  catalogRunTargets: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
  projectId: { type: String, default: '' },
});

const emit = defineEmits(['run-complete', 'dataset-pick', 'link-existing']);

const router = useRouter();

// Setup instructions open in a new tab rather than an in-app <router-link> —
// this dialog is a modal over an in-progress import/run, so navigating the
// whole app away from it mid-flow is disruptive.
function setupInstructionsHref(slug) {
  return router.resolve({ name: 'contributionDetail', params: { slug } }).href;
}

const modalEl = ref(null);
let modal = null;

const runSlug = ref('');
const runDatasetId = ref('');
const runMode = ref('update');
const confirmFullReimport = ref(false);
const dependents = ref(null);
const dependentsLoading = ref(false);
const dependentsError = ref('');
const run = ref(null);
const runError = ref('');
const signalsLoading = ref(false);
const signalsError = ref('');
const signalsPayload = ref(null);
let pollTimer = null;

const runLogEl = ref(null);
const contextualRun = ref(false);
const contextualSlugPinned = ref(false);

const isAnalysis = computed(() => props.variant === 'analysis');

const activeContribution = computed(
  () => props.contributions.find((c) => c.slug === runSlug.value) || null
);

// ponytail: hardcoded slug, mirrors the API's UPLOAD_SLUGS; use a contribution.yaml `inputs: files` flag for a 2nd module
const fileUploadRef = ref(null);
const uploading = ref(false);
const needsFiles = computed(() => !isAnalysis.value && runSlug.value === 'w4h-fitbit-csv-file-importer');

const activeIsSql = computed(() => {
  const kinds = contributionKinds(activeContribution.value || {});
  return kinds.includes('sql');
});

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
          emit('run-complete', { datasetId: runDatasetId.value, slug: runSlug.value });
        }
      }
    } catch (e) {
      runError.value = e.response?.data?.error || e.message || 'Lost track of the run.';
      stopPolling();
    }
  }, isAnalysis.value ? 800 : 1500);
}

const runInFlight = computed(
  () => run.value && (run.value.status === 'queued' || run.value.status === 'running')
);

const runProgressPct = computed(() => {
  const p = run.value?.progress;
  if (!p || !p.rows_total) return null;
  return Math.max(0, Math.min(100, Math.round((p.rows_done / p.rows_total) * 100)));
});

// Must search both lists, not just localRunTargets -- the dataset picker
// (below) legitimately lets an admin target a dataset that's only in the
// team catalog, not yet linked to this project. Missing catalogRunTargets
// here meant runTargetEmpty/runTargetLoaded silently resolved to false for
// any catalog-only target, which suppressed the "Link X instead"/"Load a
// copy into..." UI even when findLoadedLinkAlternative() would have found a
// match. Matches the combined-list pattern already used elsewhere in this
// file (fixedDatasetLabel below, and useLinkAlternative()).
const runTargetLoaded = computed(() => {
  const all = [...props.localRunTargets, ...props.catalogRunTargets];
  const target = all.find((d) => d.id === runDatasetId.value);
  return Boolean(target && target.table_count > 0);
});

const runTargetEmpty = computed(() => {
  const all = [...props.localRunTargets, ...props.catalogRunTargets];
  const target = all.find((d) => d.id === runDatasetId.value);
  return Boolean(target && target.table_count === 0);
});

async function refreshDependents() {
  dependents.value = null;
  dependentsError.value = '';
  if (isAnalysis.value || runMode.value !== 'full' || !runTargetLoaded.value || !runDatasetId.value) {
    return;
  }
  dependentsLoading.value = true;
  try {
    const res = await api.get(
      `/datasets/${encodeURIComponent(runDatasetId.value)}/dependents`,
      { ...authHeaders(), params: props.projectId ? { exclude_project_id: props.projectId } : {} }
    );
    dependents.value = res.data;
  } catch (e) {
    dependentsError.value = e.response?.data?.error || e.message || 'Could not check what else uses this dataset.';
  } finally {
    dependentsLoading.value = false;
  }
}

async function refreshSignals() {
  signalsPayload.value = null;
  signalsError.value = '';
  if (!isAnalysis.value || !runDatasetId.value || !activeIsSql.value) return;
  signalsLoading.value = true;
  try {
    const res = await api.get(
      `/datasets/${encodeURIComponent(runDatasetId.value)}/signals`,
      authHeaders()
    );
    signalsPayload.value = res.data;
  } catch (e) {
    signalsError.value = e.response?.data?.error || e.message || 'Could not load signal mapping.';
  } finally {
    signalsLoading.value = false;
  }
}

watch([runMode, runDatasetId, runSlug], () => {
  confirmFullReimport.value = false;
  refreshDependents();
  refreshSignals();
});

function syncRunSlugToDataset() {
  if (isAnalysis.value || !runDatasetId.value) return;
  const matched = resolveRunSlug({
    datasetId: runDatasetId.value,
    localRunTargets: props.localRunTargets,
    catalogRunTargets: props.catalogRunTargets,
    contributions: props.contributions,
  });
  if (matched && matched !== runSlug.value) {
    runSlug.value = matched;
  }
}

watch(runDatasetId, () => {
  if (contextualRun.value) return;
  syncRunSlugToDataset();
});

const fullReimportBlocked = computed(() => {
  if (isAnalysis.value || runMode.value !== 'full' || !runTargetLoaded.value) return false;
  if (dependentsLoading.value) return true;
  if (dependentsError.value) return !confirmFullReimport.value;
  if (dependents.value === null) return true;
  return dependents.value.hasDependents && !confirmFullReimport.value;
});

const modalTitle = computed(() => {
  if (isAnalysis.value) return 'Run analysis';
  return contextualRun.value ? 'Run import' : 'Run a contribution';
});

const fixedDatasetLabel = computed(() => {
  const all = [...props.localRunTargets, ...props.catalogRunTargets];
  const row = all.find((d) => d.id === runDatasetId.value);
  return row?.name || runDatasetId.value || '';
});

const showContributionPicker = computed(() => {
  if (props.contributions.length <= 1) return false;
  if (!contextualRun.value) return true;
  // First import: let the admin pick Fitbit vs ICDE (or another runnable importer).
  if (runTargetEmpty.value) return true;
  return !contextualSlugPinned.value;
});

const showDatasetPicker = computed(() => !contextualRun.value && !isAnalysis.value);

const runButtonLabel = computed(() => {
  if (runInFlight.value) return 'Running…';
  if (runTargetEmpty.value && !isAnalysis.value) {
    const target = fixedDatasetLabel.value || 'this dataset';
    return linkAlternative.value ? `Load a copy into ${target}` : `Load into ${target}`;
  }
  if (activeContribution.value?.title) return `Run ${activeContribution.value.title}`;
  return isAnalysis.value ? 'Run analysis' : 'Run import';
});

const linkAlternative = computed(() => {
  if (isAnalysis.value || !runTargetEmpty.value || !runSlug.value) return null;
  return findLoadedLinkAlternative({
    targetDatasetId: runDatasetId.value,
    importerSlug: runSlug.value,
    localRunTargets: props.localRunTargets,
    catalogRunTargets: props.catalogRunTargets,
    contributions: props.contributions,
  });
});

function useLinkAlternative() {
  if (!linkAlternative.value || runInFlight.value) return;
  emit('link-existing', {
    linkId: linkAlternative.value.alreadyLinked ? null : linkAlternative.value.id,
    unlinkId: runDatasetId.value,
    selectId: linkAlternative.value.id,
  });
  close();
}

function open(options = {}) {
  fileUploadRef.value?.reset();
  runError.value = '';
  run.value = null;
  contextualRun.value = Boolean(options.contextual);
  runMode.value = options.mode === 'full' || options.mode === 'update' ? options.mode : 'update';
  confirmFullReimport.value = false;
  dependents.value = null;
  dependentsError.value = '';
  signalsPayload.value = null;
  signalsError.value = '';
  runDatasetId.value =
    options.datasetId ||
    props.localRunTargets.find((d) => d.loaded && !d.read_only)?.id ||
    props.localRunTargets[0]?.id ||
    props.catalogRunTargets[0]?.id ||
    '';
  const datasetRow = [...props.localRunTargets, ...props.catalogRunTargets].find(
    (d) => d.id === runDatasetId.value
  );
  const datasetEmpty = Boolean(datasetRow && datasetRow.table_count === 0);
  contextualSlugPinned.value = Boolean(
    options.slug ||
    (options.contextual &&
      !datasetEmpty &&
      importerSlugForDataset(datasetRow, props.contributions))
  );
  runSlug.value = resolveRunSlug({
    // An explicit contextual slug (e.g. a preselected importer
    // slug) is honoured even on an empty dataset — only the non-contextual
    // fallback (guessed from naming) is dropped when there's nothing to
    // guess from yet.
    slug: (options.contextual && options.slug) ? options.slug : (datasetEmpty ? undefined : options.slug),
    datasetId: runDatasetId.value,
    localRunTargets: props.localRunTargets,
    catalogRunTargets: props.catalogRunTargets,
    contributions: props.contributions,
  });
  modal?.show();
  refreshDependents();
  refreshSignals();
}

function close() {
  modal?.hide();
}

async function startRun() {
  if (!runSlug.value || !runDatasetId.value || runInFlight.value || uploading.value || fullReimportBlocked.value) return;
  runError.value = '';
  run.value = null;
  const isLocal = props.localRunTargets.some((d) => d.id === runDatasetId.value);
  if (!isLocal) emit('dataset-pick', runDatasetId.value);
  try {
    const body = { dataset_id: runDatasetId.value };
    if (!isAnalysis.value) body.mode = runMode.value;
    if (needsFiles.value) {
      if (!fileUploadRef.value?.hasFiles()) {
        runError.value = 'Choose your Fitbit CSV files first.';
        return;
      }
      uploading.value = true;
      try {
        body.upload_id = await fileUploadRef.value.upload(runSlug.value, runDatasetId.value);
      } finally {
        uploading.value = false;
      }
    }
    const res = await api.post(
      `/contributions/${runSlug.value}/run`,
      body,
      authHeaders()
    );
    run.value = res.data;
    if (res.data.status === 'succeeded' || res.data.status === 'failed') {
      if (res.data.status === 'succeeded') {
        emit('run-complete', { datasetId: runDatasetId.value, slug: runSlug.value });
      }
    } else {
      pollRun(res.data.id);
    }
  } catch (e) {
    runError.value =
      e.response?.data?.error ||
      e.message ||
      (isAnalysis.value ? 'Could not start the analysis.' : 'Could not start the import.');
  }
}

onMounted(() => {
  if (!modalEl.value) return;
  modal = new Modal(modalEl.value);
});

onBeforeUnmount(() => {
  stopPolling();
  modal?.dispose();
});

defineExpose({ open, close });
</script>

<template>
  <div class="modal fade" tabindex="-1" ref="modalEl" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">{{ modalTitle }}</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="close"></button>
        </div>
        <div class="modal-body">
          <div v-if="contextualRun && !isAnalysis" class="mb-3">
            <div class="small text-muted mb-0">Dataset</div>
            <div class="fw-semibold">{{ fixedDatasetLabel }}</div>
            <div
              v-if="activeContribution && !showContributionPicker"
              class="small text-muted mt-1"
            >
              {{ activeContribution.title || activeContribution.slug }}
            </div>
          </div>

          <div v-if="showContributionPicker" class="mb-3">
            <label class="form-label small mb-0">Sample / importer</label>
            <select v-model="runSlug" class="form-select form-select-sm" :disabled="runInFlight">
              <option v-for="c in contributions" :key="c.slug" :value="c.slug">
                {{ c.title || c.slug }}
              </option>
            </select>
            <p v-if="runTargetEmpty" class="small text-muted mt-1 mb-0">
              Pick the sample package and importer for a first load.
            </p>
          </div>

          <div
            v-if="linkAlternative && !isAnalysis"
            class="alert alert-info py-2 small mb-3"
          >
            <p class="mb-2">
              <strong>{{ linkAlternative.name }}</strong>
              already has this sample loaded
              {{ linkAlternative.alreadyLinked ? 'on this project' : 'in your team catalog' }}.
              Link that catalog row instead of loading a second copy into
              <strong>{{ fixedDatasetLabel }}</strong>
              — each catalog row owns its own tables, so running the importer here duplicates the data.
            </p>
            <button
              type="button"
              class="btn btn-sm btn-primary"
              :disabled="runInFlight"
              @click="useLinkAlternative"
            >
              Link {{ linkAlternative.name }} instead
            </button>
          </div>

          <div v-if="showDatasetPicker" class="mb-3">
            <label class="form-label small mb-0">{{ isAnalysis ? 'Dataset to analyze' : 'Dataset to populate' }}</label>
            <select v-model="runDatasetId" class="form-select form-select-sm" :disabled="runInFlight">
              <optgroup v-if="localRunTargets.length" label="Already in this project">
                <option v-for="d in localRunTargets" :key="d.id" :value="d.id">
                  {{ d.name }}{{ d.table_count > 0 ? ' (loaded)' : '' }}
                </option>
              </optgroup>
              <optgroup v-if="catalogRunTargets.length" label="From team catalog">
                <option v-for="d in catalogRunTargets" :key="d.id" :value="d.id">{{ d.name }}</option>
              </optgroup>
            </select>
            <p v-if="!localRunTargets.length && !catalogRunTargets.length" class="small text-muted mt-1 mb-0">
              No writable datasets are available. Create or link one first.
            </p>
          </div>

          <div v-if="isAnalysis && activeIsSql" class="mb-3">
            <div class="small fw-semibold mb-1">Signal mapping</div>
            <div v-if="signalsLoading" class="small text-muted">Loading mapped signals…</div>
            <div v-else-if="signalsError" class="alert alert-warning small mb-0">{{ signalsError }}</div>
            <ul v-else-if="signalsPayload?.signals?.length" class="small mb-0 ps-3">
              <li v-for="sig in signalsPayload.signals" :key="sig.name || sig.signal_type">
                {{ sig.signal_type || sig.name }}
                <span v-if="sig.physical_table" class="text-muted">→ {{ sig.physical_table }}</span>
              </li>
            </ul>
            <p v-else class="small text-muted mb-0">No mapped signals yet — load data on the Datasets tab first.</p>
          </div>

          <div v-if="!isAnalysis && runTargetEmpty" class="mb-3">
            <p class="small text-muted mb-0">
              This loads the sample into <strong>{{ fixedDatasetLabel }}</strong>
              (that catalog row’s own schema). It does
              <strong>not</strong> truncate or update
              <template v-if="linkAlternative">
                <strong>{{ linkAlternative.name }}</strong> or any other dataset.
              </template>
              <template v-else>any other catalog row.</template>
            </p>
          </div>

          <div v-else-if="!isAnalysis" class="mb-3">
            <label class="form-label small mb-0 d-block">Import mode</label>
            <div class="form-check form-check-inline">
              <input
                id="run-mode-update"
                v-model="runMode"
                class="form-check-input"
                type="radio"
                value="update"
                :disabled="runInFlight"
              />
              <label class="form-check-label small" for="run-mode-update">Update</label>
            </div>
            <div class="form-check form-check-inline">
              <input
                id="run-mode-full"
                v-model="runMode"
                class="form-check-input"
                type="radio"
                value="full"
                :disabled="runInFlight"
              />
              <label class="form-check-label small" for="run-mode-full">Full</label>
            </div>
            <p class="small text-muted mb-0">
              <span v-if="runMode === 'full'">
                Truncates and reloads every table <strong>in this dataset</strong> from source —
                use to fix a partial or failed import. Other catalog rows are not changed.
              </span>
              <span v-else>Adds missing rows/tables without touching data already there. Safe to re-run.</span>
            </p>
          </div>

          <div v-if="!isAnalysis && runMode === 'full' && runTargetLoaded" class="mb-3">
            <div v-if="dependentsLoading" class="small text-muted">Checking what else uses this dataset…</div>
            <div v-else-if="dependentsError" class="alert alert-warning small mb-0">
              <p class="mb-1">
                <strong>Could not verify what else uses this dataset</strong> ({{ dependentsError }}).
              </p>
              <div class="form-check">
                <input
                  id="confirm-full-reimport"
                  v-model="confirmFullReimport"
                  class="form-check-input"
                  type="checkbox"
                />
                <label class="form-check-label" for="confirm-full-reimport">
                  I understand and want to proceed anyway.
                </label>
              </div>
            </div>
            <div v-else-if="dependents?.hasDependents" class="alert alert-warning small mb-0">
              <p class="mb-1"><strong>This dataset is used elsewhere.</strong> Full reload replaces its data for everyone.</p>
              <div class="form-check">
                <input
                  id="confirm-full-reimport"
                  v-model="confirmFullReimport"
                  class="form-check-input"
                  type="checkbox"
                />
                <label class="form-check-label" for="confirm-full-reimport">
                  I understand this replaces data other projects/teams depend on.
                </label>
              </div>
            </div>
            <div v-else class="small text-muted">Nothing else is linked to or shares this dataset.</div>
          </div>

          <p v-if="isAnalysis && activeIsSql" class="small text-muted mb-3">
            The API binds roles from this dataset’s mapping and materializes a derived table per the contribution manifest.
          </p>

          <FitbitFileUpload v-if="needsFiles" ref="fileUploadRef" />

          <button
            type="button"
            class="btn btn-sm"
            :class="linkAlternative && !isAnalysis ? 'btn-outline-secondary' : 'btn-primary'"
            :disabled="!runSlug || !runDatasetId || runInFlight || uploading || fullReimportBlocked || !canManage"
            @click="startRun"
          >
            <span v-if="runInFlight">
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
              Running…
            </span>
            <span v-else-if="uploading">Uploading files…</span>
            <span v-else>{{ runButtonLabel }}</span>
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

            <div v-if="run.progress?.inserted != null" class="mt-1 text-muted">
              {{ run.progress.inserted }} row(s) materialized
              <span v-if="run.progress.physical_table"> → {{ run.progress.physical_table }}</span>
            </div>

            <div v-if="run.progress?.rows_total" class="mt-2">
              <div class="d-flex justify-content-between small text-muted mb-1">
                <span>
                  Table {{ run.progress.signal_index }}/{{ run.progress.signal_count }}:
                  {{ run.progress.signal }}
                </span>
                <span>
                  {{ run.progress.rows_done }}/{{ run.progress.rows_total || '?' }} rows
                  <template v-if="runProgressPct != null"> ({{ runProgressPct }}%)</template>
                </span>
              </div>
              <div class="progress" style="height: 8px" role="progressbar">
                <div
                  class="progress-bar"
                  :class="{ 'progress-bar-striped progress-bar-animated': runInFlight && runProgressPct == null }"
                  :style="{ width: `${runProgressPct ?? 100}%` }"
                />
              </div>
            </div>

            <pre v-if="run.log" ref="runLogEl" class="run-log mt-2 mb-0 p-2 border rounded small">{{ run.log }}</pre>
          </div>

          <details v-if="activeContribution && !isAnalysis" class="small mt-3">
            <summary class="text-muted" style="cursor: pointer">Prefer the command line?</summary>
            <p class="text-muted mb-1 mt-2">
              Runnable importers ship <code>run.sh</code> — same API key and access checks.
            </p>
            <pre class="run-log mb-1 p-2 border rounded small">W4H_DATASET_ID={{ runDatasetId || '&lt;dataset-id&gt;' }} ./run.sh import --mode {{ runMode === 'full' ? 'replace' : 'append' }}</pre>
            <a :href="setupInstructionsHref(activeContribution.slug)" target="_blank" rel="noopener">
              View setup instructions →
            </a>
          </details>

          <details v-else-if="activeContribution && isAnalysis" class="small mt-3">
            <summary class="text-muted" style="cursor: pointer">Prefer a notebook or CLI?</summary>
            <p class="text-muted mb-1 mt-2">
              Notebooks call
              <code>POST /datasets/:id/contributions/{{ activeContribution.slug }}/sql</code>
              for a direct sync result, or use the contribution repo’s notebook/CLI.
            </p>
            <a :href="setupInstructionsHref(activeContribution.slug)" target="_blank" rel="noopener">
              View {{ activeContribution.title }} setup instructions →
            </a>
          </details>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary btn-sm" @click="close">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.run-log {
  max-height: 220px;
  overflow-y: auto;
  white-space: pre-wrap;
  font-family: var(--bs-font-monospace);
  background: var(--bs-tertiary-bg, #f8f9fa);
}
</style>
