<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { Modal } from 'bootstrap';
import { api, authHeaders } from '@/utils/api';
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
const pickedFiles = ref([]);
const skippedNote = ref('');
const dropBlocked = ref(false);
const fileError = ref('');
const uploading = ref('');
const runUsesFiles = ref(false);
const dragDepth = ref(0);
const fileInputEl = ref(null);
const folderInputEl = ref(null);

const isAnalysis = computed(() => props.variant === 'analysis');

const activeContribution = computed(
  () => props.contributions.find((c) => c.slug === runSlug.value) || null
);

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
const busy = computed(() => runInFlight.value || Boolean(uploading.value));
const dragOver = computed(() => dragDepth.value > 0);

const runProgressPct = computed(() => {
  const p = run.value?.progress;
  if (!p || !p.rows_total) return null;
  return Math.max(0, Math.min(100, Math.round((p.rows_done / p.rows_total) * 100)));
});

const runTargetLoaded = computed(() => {
  const local = props.localRunTargets.find((d) => d.id === runDatasetId.value);
  return Boolean(local && local.table_count > 0);
});

const runTargetEmpty = computed(() => {
  const local = props.localRunTargets.find((d) => d.id === runDatasetId.value);
  return Boolean(local && local.table_count === 0);
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

watch(runSlug, () => {
  if (!pickedFiles.value.length) {
    dropBlocked.value = false;
    skippedNote.value = '';
  }
});

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

const MAX_PICKED_FILES = 10000;

function acceptedExtensions(fileInput) {
  const raw = fileInput?.accept;
  const list = Array.isArray(raw) && raw.length ? raw : ['csv'];
  return list
    .map((item) => String(item || '').toLowerCase().replace(/^\./, ''))
    .filter((item) => item === 'csv' || item === 'zip');
}

function isFileImporter(contribution) {
  return Boolean(contribution?.file_input);
}

const fileImporters = computed(() => props.contributions.filter(isFileImporter));
const sampleImporters = computed(() => props.contributions.filter((c) => !isFileImporter(c)));

const activeIsFileImporter = computed(() => isFileImporter(activeContribution.value));

const filePrompt = computed(() => activeContribution.value?.file_input || null);

const fileAccept = computed(() => {
  const parts = [];
  const exts = acceptedExtensions(filePrompt.value);
  if (exts.includes('csv')) parts.push('.csv', 'text/csv');
  if (exts.includes('zip')) parts.push('.zip', 'application/zip');
  return parts.join(',');
});

const filesButtonLabel = computed(() => {
  if (filePrompt.value?.files_button) return filePrompt.value.files_button;
  return acceptedExtensions(filePrompt.value).includes('zip') ? 'Choose zip files' : 'Choose files';
});

const folderButtonLabel = computed(() => filePrompt.value?.folder_button || 'Choose folder');

const importerBlurb = computed(() => {
  const c = activeContribution.value;
  if (!c) return '';
  return filePrompt.value?.summary || c.summary || '';
});

// Loaded dataset + an importer other than the one that loaded it.
const importerMismatch = computed(() => {
  if (isAnalysis.value || runTargetEmpty.value || !runSlug.value) return '';
  const row = [...props.localRunTargets, ...props.catalogRunTargets].find(
    (d) => d.id === runDatasetId.value
  );
  const last = row?.last_importer_slug;
  if (!last || last === runSlug.value) return '';
  const c = props.contributions.find((x) => x.slug === last);
  return c?.title || row?.last_importer_title || last;
});

const modalTitle = computed(() => {
  if (isAnalysis.value) return 'Run analysis';
  if (contextualRun.value && runTargetEmpty.value) return 'Select importer';
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
  // First load: the admin picks the importer (their files, or a sample package).
  if (runTargetEmpty.value) return true;
  return !contextualSlugPinned.value;
});

const showDatasetPicker = computed(() => !contextualRun.value && !isAnalysis.value);

const runButtonLabel = computed(() => {
  if (runInFlight.value) return 'Running…';
  if (runTargetEmpty.value && !isAnalysis.value) {
    const target = fixedDatasetLabel.value || 'this dataset';
    if (linkAlternative.value) return `Load a copy into ${target}`;
    return activeIsFileImporter.value ? `Load example into ${target}` : `Load sample into ${target}`;
  }
  if (activeContribution.value?.title) return `Run ${activeContribution.value.title}`;
  return isAnalysis.value ? 'Run analysis' : 'Run import';
});

function withDatasetName(text) {
  const target = fixedDatasetLabel.value || 'this dataset';
  return String(text || '').replaceAll('{dataset}', target);
}

const firstLoadNote = computed(() => {
  const target = fixedDatasetLabel.value || 'this dataset';
  if (activeIsFileImporter.value) {
    return filePrompt.value?.note
      ? withDatasetName(filePrompt.value.note)
      : `Drop your CSV export below to load it into ${target}. The command line is optional. Other datasets stay as they are.`;
  }
  return `This copies that sample package into ${target}. Other datasets stay as they are.`;
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
  clearPickedFiles();
  runSlug.value = resolveRunSlug({
    slug: datasetEmpty ? undefined : options.slug,
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

function clearPickedFiles() {
  pickedFiles.value = [];
  skippedNote.value = '';
  dropBlocked.value = false;
  fileError.value = '';
  dragDepth.value = 0;
}

function entryPath(entry) {
  const file = entry?.file || entry;
  return String(entry?.relativePath || file?.webkitRelativePath || file?.name || '').replace(/\\/g, '/').replace(/^\/+/, '');
}

function pathMatches(rel, hints) {
  const lower = String(rel || '').toLowerCase();
  return (hints || []).some((hint) => hint && lower.includes(String(hint).toLowerCase()));
}

function addPickedFiles(fileList) {
  const entries = [...(fileList || [])];
  const paths = entries.map(entryPath);
  const detected = props.contributions.find((c) => paths.some((rel) => pathMatches(rel, c.file_input?.detect)));
  const hasZip = paths.some((rel) => rel.toLowerCase().endsWith('.zip'));
  let target = detected;
  if (!target && hasZip) {
    const current = props.contributions.find((c) => c.slug === runSlug.value);
    if (!acceptedExtensions(current?.file_input).includes('zip')) {
      const zipImporters = props.contributions.filter((c) => acceptedExtensions(c.file_input).includes('zip'));
      if (zipImporters.length === 1) target = zipImporters[0];
    }
  }
  let switchedTitle = '';
  if (target && target.slug !== runSlug.value) {
    runSlug.value = target.slug;
    switchedTitle = target.title || target.slug;
  }
  const prompt = props.contributions.find((c) => c.slug === runSlug.value)?.file_input || {};
  const include = prompt.include || [];
  const keepIncluded = include.length > 0 && paths.some((rel) => pathMatches(rel, include));
  const next = [...pickedFiles.value];
  let skippedZip = 0;
  let skippedOther = 0;
  let sizeError = '';
  for (const entry of entries) {
    const file = entry?.file || entry;
    const rel = entryPath(entry);
    const parts = rel.split('/').filter(Boolean);
    const name = (parts[parts.length - 1] || '').toLowerCase();
    if (!file || parts.some((part) => part === '.' || part === '..' || part.startsWith('.'))) {
      skippedOther += 1;
      continue;
    }
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.') + 1) : '';
    const allowed = acceptedExtensions(prompt);
    if (!allowed.includes(ext)) {
      if (ext === 'zip') skippedZip += 1;
      else skippedOther += 1;
      continue;
    }
    if (ext === 'csv' && keepIncluded && !pathMatches(rel, include)) {
      skippedOther += 1;
      continue;
    }
    if (file.size > 200 * 1024 * 1024) {
      sizeError = `"${parts[parts.length - 1]}" exceeds the 200MB per-file limit.`;
      continue;
    }
    const item = { file, relativePath: parts.join('/') };
    const existing = next.findIndex((row) => row.relativePath === item.relativePath);
    if (existing >= 0) next.splice(existing, 1, item);
    else next.push(item);
  }
  if (next.length > MAX_PICKED_FILES) {
    pickedFiles.value = [];
    dropBlocked.value = true;
    fileError.value = '';
    skippedNote.value = `This folder has ${next.length} files, over the limit of ${MAX_PICKED_FILES}.`;
    return;
  }
  pickedFiles.value = next;
  fileError.value = sizeError;
  const rejected = skippedZip + skippedOther;
  dropBlocked.value = next.length === 0 && rejected > 0;
  const lead = switchedTitle ? `Switched to ${switchedTitle}. ` : '';
  if (!rejected) {
    skippedNote.value = lead;
    return;
  }
  const bits = [];
  if (skippedZip) bits.push(`${skippedZip} zip ${skippedZip === 1 ? 'file' : 'files'}`);
  if (skippedOther) bits.push(`${skippedOther} ${skippedOther === 1 ? 'file that is' : 'files that are'} not CSV`);
  const why = `Skipped ${bits.join(' and ')}.`;
  if (next.length === 0) {
    const extra = prompt.empty ? ` ${prompt.empty}` : (skippedZip ? ' Unzip the export and drop the folder of CSVs.' : '');
    skippedNote.value = `${lead}${why}${extra}`.trim();
    return;
  }
  skippedNote.value = prompt.ignored && skippedOther
    ? `${lead}Ignoring ${skippedOther} ${skippedOther === 1 ? 'file' : 'files'}. ${prompt.ignored}`
    : `${lead}${why}`;
}

function readAllEntries(dirEntry) {
  return new Promise((resolve, reject) => {
    const reader = dirEntry.createReader();
    const all = [];
    const read = () => {
      reader.readEntries((batch) => {
        if (!batch.length) {
          resolve(all);
          return;
        }
        all.push(...batch);
        read();
      }, reject);
    };
    read();
  });
}

async function filesFromEntry(entry, prefix) {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [{ file, relativePath: prefix ? `${prefix}/${file.name}` : file.name }];
  }
  if (!entry.isDirectory) return [];
  const relDir = prefix ? `${prefix}/${entry.name}` : entry.name;
  const children = await readAllEntries(entry);
  const out = [];
  for (const child of children) {
    out.push(...await filesFromEntry(child, relDir));
  }
  return out;
}

async function onDrop(event) {
  dragDepth.value = 0;
  const items = [...(event.dataTransfer?.items || [])];
  const entries = items.map((item) => item.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.length) {
    const collected = [];
    for (const entry of entries) {
      const nested = await filesFromEntry(entry, '');
      collected.push(...nested);
    }
    if (collected.length) {
      addPickedFiles(collected);
      return;
    }
  }
  addPickedFiles(event.dataTransfer?.files);
}

function onFilePick(event) {
  addPickedFiles(event.target.files);
  event.target.value = '';
}

function removePickedFile(index) {
  pickedFiles.value = pickedFiles.value.filter((_, i) => i !== index);
}

async function stagePickedFiles() {
  const created = await api.post(
    `/contributions/${encodeURIComponent(runSlug.value)}/uploads`,
    { dataset_id: runDatasetId.value },
    authHeaders()
  );
  const uploadId = created.data?.upload_id;
  if (!uploadId) throw new Error('Could not start the upload.');
  const total = pickedFiles.value.length;
  try {
    for (let i = 0; i < total; i += 1) {
      const item = pickedFiles.value[i];
      uploading.value = `Uploading ${i + 1} of ${total}…`;
      await api.put(
        `/contributions/uploads/${encodeURIComponent(uploadId)}/body`,
        item.file,
        {
          ...authHeaders(),
          headers: {
            ...authHeaders().headers,
            'Content-Type': 'application/octet-stream',
          },
          params: { name: item.relativePath },
          transformRequest: [(data) => data],
          maxBodyLength: Infinity,
          maxContentLength: Infinity,
        }
      );
    }
  } catch (e) {
    try {
      await api.delete(`/contributions/uploads/${encodeURIComponent(uploadId)}`, authHeaders());
    } catch {
      /* the staged folder expires on its own */
    }
    throw e;
  }
  return uploadId;
}

async function startRun(useFiles = false) {
  if (!runSlug.value || !runDatasetId.value || busy.value || fullReimportBlocked.value) return;
  if (useFiles && !pickedFiles.value.length) return;
  runUsesFiles.value = Boolean(useFiles);
  runError.value = '';
  fileError.value = '';
  run.value = null;
  const isLocal = props.localRunTargets.some((d) => d.id === runDatasetId.value);
  if (!isLocal) emit('dataset-pick', runDatasetId.value);
  let uploadId = null;
  try {
    if (useFiles) uploadId = await stagePickedFiles();
    uploading.value = '';
    const body = { dataset_id: runDatasetId.value };
    if (!isAnalysis.value) body.mode = runMode.value;
    if (uploadId) body.upload_id = uploadId;
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
    uploading.value = '';
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
              <button
                v-if="contributions.length > 1"
                type="button"
                class="btn btn-link btn-sm p-0 ms-2 align-baseline"
                :disabled="runInFlight"
                @click="contextualSlugPinned = false"
              >
                Change importer
              </button>
            </div>
          </div>

          <div v-if="showContributionPicker" class="mb-3">
            <label class="form-label small mb-0">Importer</label>
            <select v-model="runSlug" class="form-select form-select-sm" :disabled="runInFlight">
              <optgroup v-if="fileImporters.length" label="Your files">
                <option v-for="c in fileImporters" :key="c.slug" :value="c.slug">
                  {{ c.title || c.slug }}
                </option>
              </optgroup>
              <optgroup v-if="sampleImporters.length" label="Sample package">
                <option v-for="c in sampleImporters" :key="c.slug" :value="c.slug">
                  {{ c.title || c.slug }}
                </option>
              </optgroup>
            </select>
            <p v-if="runTargetEmpty" class="small text-muted mt-1 mb-0">
              Choose the importer that matches the files for this dataset.
            </p>
            <div v-else-if="importerMismatch" class="alert alert-warning py-2 small mt-2 mb-0">
              This dataset was loaded with <strong>{{ importerMismatch }}</strong>.
              A different importer adds its own tables next to the existing ones and leaves those in place.
              If those tables are wrong, load into a new dataset and unlink this one in project Settings.
            </div>
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
            <p v-if="importerBlurb" class="small mb-2">{{ importerBlurb }}</p>
            <p class="small text-muted mb-0">{{ firstLoadNote }}</p>
          </div>

          <p v-if="!isAnalysis && !runTargetEmpty && activeIsFileImporter && importerBlurb" class="small mb-3">
            {{ importerBlurb }}
          </p>

          <div v-if="!isAnalysis && !runTargetEmpty" class="mb-3">
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
                Empties and reloads the tables <strong>this importer writes</strong> in this dataset —
                use to fix a partial or failed import. Other tables and catalog rows are not changed.
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

          <div v-if="activeIsFileImporter" class="mb-3">
            <div
              class="file-drop"
              :class="{ 'file-drop--over': dragOver, 'file-drop--disabled': busy }"
              @dragenter.prevent="dragDepth += 1"
              @dragover.prevent="dragDepth = Math.max(dragDepth, 1)"
              @dragleave.prevent="dragDepth = Math.max(0, dragDepth - 1)"
              @drop.prevent="onDrop"
            >
              <input
                ref="fileInputEl"
                type="file"
                class="visually-hidden"
                multiple
                :accept="fileAccept"
                :disabled="busy"
                @change="onFilePick"
              />
              <input
                ref="folderInputEl"
                type="file"
                class="visually-hidden"
                multiple
                webkitdirectory
                :disabled="busy"
                @change="onFilePick"
              />
              <p class="mb-2">{{ filePrompt?.drop_label || 'Drop files or a folder here' }}</p>
              <div class="d-flex flex-wrap justify-content-center gap-2">
                <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="fileInputEl?.click()">
                  {{ filesButtonLabel }}
                </button>
                <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="folderInputEl?.click()">
                  {{ folderButtonLabel }}
                </button>
              </div>
              <p v-if="pickedFiles.length > 8" class="small text-start mb-0 mt-2">
                {{ pickedFiles.length }} files ready.
                <button type="button" class="btn btn-link btn-sm p-0 align-baseline" :disabled="busy" @click="clearPickedFiles">Clear</button>
              </p>
              <ul v-else-if="pickedFiles.length" class="file-drop-list list-unstyled mb-0 mt-2 text-start small">
                <li v-for="(item, index) in pickedFiles" :key="item.relativePath" class="d-flex align-items-center gap-2">
                  <span class="text-truncate">{{ item.relativePath }}</span>
                  <button
                    type="button"
                    class="btn btn-link btn-sm p-0 ms-auto flex-shrink-0"
                    :disabled="busy"
                    @click="removePickedFile(index)"
                  >
                    Remove
                  </button>
                </li>
              </ul>
            </div>
            <div v-if="dropBlocked" class="alert alert-warning small mt-2 mb-0" role="status">
              <strong>No files to load.</strong>
              {{ skippedNote }}
            </div>
            <p v-else-if="skippedNote" class="small text-muted mt-1 mb-0">{{ skippedNote }}</p>
            <p v-if="fileError" class="small text-danger mt-1 mb-0">{{ fileError }}</p>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <button
              v-if="activeIsFileImporter && pickedFiles.length"
              type="button"
              class="btn btn-sm btn-primary"
              :disabled="!runSlug || !runDatasetId || busy || fullReimportBlocked || !canManage"
              @click="startRun(true)"
            >
              <span v-if="uploading">{{ uploading }}</span>
              <span v-else-if="runInFlight && runUsesFiles">
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Running…
              </span>
              <span v-else>Load {{ pickedFiles.length }} {{ pickedFiles.length === 1 ? 'file' : 'files' }} into {{ fixedDatasetLabel || 'this dataset' }}</span>
            </button>
            <button
              v-if="!dropBlocked && !pickedFiles.length"
              type="button"
              class="btn btn-sm"
              :class="activeIsFileImporter && pickedFiles.length ? 'btn-outline-secondary' : (linkAlternative && !isAnalysis ? 'btn-outline-secondary' : 'btn-primary')"
              :disabled="!runSlug || !runDatasetId || busy || fullReimportBlocked || !canManage"
              @click="startRun(false)"
            >
              <span v-if="runInFlight && !runUsesFiles">
                <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                Running…
              </span>
              <span v-else>{{ runButtonLabel }}</span>
            </button>
          </div>

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
              <template v-if="activeIsFileImporter">
                Point <code>--data-dir</code> at your export. Same API key and access checks.
              </template>
              <template v-else>
                Runnable importers ship <code>run.sh</code> — same API key and access checks.
              </template>
            </p>
            <pre class="run-log mb-1 p-2 border rounded small">W4H_DATASET_ID={{ runDatasetId || '&lt;dataset-id&gt;' }} ./run.sh import --mode {{ runMode === 'full' ? 'replace' : 'append' }}<template v-if="activeIsFileImporter"> --data-dir /path/to/your/export</template></pre>
            <router-link :to="{ name: 'contributionDetail', params: { slug: activeContribution.slug } }">
              View setup instructions →
            </router-link>
          </details>

          <details v-else-if="activeContribution && isAnalysis" class="small mt-3">
            <summary class="text-muted" style="cursor: pointer">Prefer a notebook or CLI?</summary>
            <p class="text-muted mb-1 mt-2">
              Notebooks call
              <code>POST /datasets/:id/contributions/{{ activeContribution.slug }}/sql</code>
              for a direct sync result, or use the contribution repo’s notebook/CLI.
            </p>
            <router-link :to="{ name: 'contributionDetail', params: { slug: activeContribution.slug } }">
              View {{ activeContribution.title }} setup instructions →
            </router-link>
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

.file-drop {
  border: 1px dashed var(--bs-border-color);
  border-radius: 0.375rem;
  padding: 0.9rem 0.75rem;
  text-align: center;
  background: var(--bs-tertiary-bg);
}

.file-drop--over {
  border-color: var(--w4h-gold, var(--bs-primary));
}

.file-drop--disabled {
  opacity: 0.65;
  pointer-events: none;
}

.file-drop-list {
  max-height: 8rem;
  overflow: auto;
}
</style>
