<script setup>
// File chooser for the "W4H Fitbit CSV File Importer" catalog module. Fitbit-only:
// every chosen file is profiled locally and must classify as Fitbit, using the
// same detection logic the retired "Fitbit CSV files" ingest assistant used
// (carried over into utils/csvProfile.js).
import { ref } from 'vue';
import { api, authHeaders } from '@/utils/api';
import { buildFileProfile, checkFileLimits, classifyVendor } from '@/utils/csvProfile';

// Mirrors the server's SAFE_NAME_RE (w4h-api/lib/contribution-uploads.js) so a
// bad filename is rejected here instead of after a round-trip to the API.
const SAFE_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9 ._()-]*\.csv$/i;

const files = ref([]);
const error = ref('');
const busy = ref(false);

async function onPick(e) {
  error.value = '';
  files.value = [];
  const picked = Array.from(e.target.files || []).filter((f) => /\.csv$/i.test(f.name));
  if (!picked.length) {
    error.value = 'Choose one or more .csv files.';
    return;
  }
  const badName = picked.find((f) => !SAFE_NAME_RE.test(f.name));
  if (badName) {
    error.value = `"${badName.name}" has characters the importer can't accept — use letters, digits, spaces, . _ ( ) -.`;
    return;
  }
  const limit = checkFileLimits(picked);
  if (limit) {
    error.value = limit;
    return;
  }
  let profiles;
  try {
    profiles = await Promise.all(picked.map((f) => buildFileProfile(f)));
  } catch (err) {
    error.value = `Could not read the chosen files: ${err.message || err}`;
    return;
  }
  const gate = classifyVendor(profiles);
  if (gate.band !== 'detected' || gate.top?.vendor !== 'fitbit') {
    error.value = 'These files do not look like Fitbit exports. This importer accepts Fitbit CSV files only.';
    return;
  }
  files.value = picked;
}

/** Stages the chosen files on the API; resolves to the upload id used by POST /contributions/:slug/run. */
async function upload(slug, datasetId) {
  busy.value = true;
  let uploadId;
  try {
    const { data } = await api.post(`/contributions/${slug}/uploads`, { dataset_id: datasetId }, authHeaders());
    uploadId = data.upload_id;
    for (const f of files.value) {
      await api.put(
        `/contributions/uploads/${uploadId}/files/${encodeURIComponent(f.name)}`,
        f,
        { headers: { ...authHeaders().headers, 'content-type': 'application/octet-stream' } }
      );
    }
    return uploadId;
  } catch (err) {
    // A failed file PUT leaves a staged-but-incomplete upload record on the
    // server; clean it up now instead of waiting on the server's 24h sweep.
    if (uploadId) {
      await api.delete(`/contributions/uploads/${uploadId}`, authHeaders())
        .catch((cleanupErr) => console.warn('upload cleanup failed', uploadId, cleanupErr));
    }
    throw err;
  } finally {
    busy.value = false;
  }
}

function reset() {
  files.value = [];
  error.value = '';
}

defineExpose({ upload, reset, busy, hasFiles: () => files.value.length > 0 });
</script>

<template>
  <div class="mb-3">
    <label class="form-label small fw-semibold">Fitbit CSV files</label>
    <input type="file" class="form-control form-control-sm" accept=".csv" multiple :disabled="busy" @change="onPick" />
    <div v-if="files.length" class="form-text">{{ files.length }} Fitbit file(s) ready.</div>
    <div v-if="error" class="text-danger small mt-1">{{ error }}</div>
  </div>
</template>
