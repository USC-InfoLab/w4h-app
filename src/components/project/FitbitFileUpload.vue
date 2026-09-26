<script setup>
// File chooser for the "W4H Fitbit CSV File Importer" catalog module. Fitbit-only:
// every chosen file is profiled locally and must classify as Fitbit (same
// classifier as "Fitbit CSV files"; read-only reuse of utils/csvProfile.js).
import { ref } from 'vue';
import { api, authHeaders } from '@/utils/api';
import { buildFileProfile, checkFileLimits, classifyVendor } from '@/utils/csvProfile';

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
  const limit = checkFileLimits(picked);
  if (limit) {
    error.value = limit;
    return;
  }
  const profiles = await Promise.all(picked.map((f) => buildFileProfile(f)));
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
  try {
    const { data } = await api.post(`/contributions/${slug}/uploads`, { dataset_id: datasetId }, authHeaders());
    for (const f of files.value) {
      await api.put(
        `/contributions/uploads/${data.upload_id}/files/${encodeURIComponent(f.name)}`,
        f,
        { headers: { ...authHeaders().headers, 'content-type': 'application/octet-stream' } }
      );
    }
    return data.upload_id;
  } finally {
    busy.value = false;
  }
}

defineExpose({ upload, hasFiles: () => files.value.length > 0 });
</script>

<template>
  <div class="mb-3">
    <label class="form-label small fw-semibold">Fitbit CSV files</label>
    <input type="file" class="form-control form-control-sm" accept=".csv" multiple :disabled="busy" @change="onPick" />
    <div v-if="files.length" class="form-text">{{ files.length }} Fitbit file(s) ready.</div>
    <div v-if="error" class="text-danger small mt-1">{{ error }}</div>
  </div>
</template>
