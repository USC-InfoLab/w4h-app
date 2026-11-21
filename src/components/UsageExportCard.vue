<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { Modal } from 'bootstrap';
import { api, authHeaders } from '@/utils/api';

// ADR-031 §7 pseudonymous usage export: Download (CSV/JSON) and Send to the W4H team after a
// preview of exactly what is sent. Super admin = whole platform; Admin = members of own teams.

const props = defineProps({
  // Link target for "set up email" (Super admin only; Admins cannot open Settings).
  settingsLink: { type: Boolean, default: false },
});

const days = ref(30);
const format = ref('csv');
const mailConfigured = ref(false);
const telemetryConfigured = ref(false);
const statusError = ref('');
const downloading = ref(false);
const previewLoading = ref(false);
const sending = ref(false);
const message = ref('');
const messageType = ref('success');
const preview = ref(null);
const previewError = ref('');
const sendResult = ref('');
const previewModalEl = ref(null);
let previewModal = null;
let modalTrigger = null; // Bootstrap restores focus only for data-bs-toggle triggers

const sendDisabledReason = computed(() => {
  if (statusError.value) return statusError.value;
  if (telemetryConfigured.value) return '';
  if (mailConfigured.value) return 'Sending is not set up on this installation';
  return props.settingsLink ? 'Set up email in Settings' : 'Email is not set up on this installation';
});

const scopeLabel = computed(() =>
  preview.value?.meta?.scope === 'teams'
    ? 'Members of the teams you administer'
    : 'All users on this installation'
);

const previewRows = computed(() => (preview.value?.rows || []).slice(0, 5));

function showMessage(text, type = 'success') {
  message.value = text;
  messageType.value = type;
}

/** Axios errors for `responseType: 'blob'` carry the JSON error body as a Blob. */
async function errorMessage(err, fallback) {
  const data = err.response?.data;
  const withStatus = `${fallback} (${err.response?.status ? `HTTP ${err.response.status}` : 'no response'})`;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text()).error || withStatus;
    } catch {
      return withStatus; // e.g. a proxy HTML error page
    }
  }
  return data?.error || withStatus;
}

async function loadStatus() {
  try {
    const res = await api.get('config/status');
    mailConfigured.value = !!res.data?.mail_configured;
    telemetryConfigured.value = !!res.data?.telemetry_configured;
    statusError.value = '';
  } catch (err) {
    mailConfigured.value = false;
    telemetryConfigured.value = false;
    statusError.value = `Couldn't check whether sending is set up (${err.response?.status ? `HTTP ${err.response.status}` : 'no response'})`;
  }
}

async function download() {
  downloading.value = true;
  message.value = '';
  try {
    const res = await api.get('config/usage-export', {
      ...authHeaders(),
      params: { days: days.value, format: format.value },
      responseType: 'blob',
    });
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match
      ? match[1]
      : `w4h-usage-${days.value}d-${new Date().toISOString().slice(0, 10)}.${format.value}`;
    const url = window.URL.createObjectURL(res.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    showMessage(`Downloaded ${filename}.`);
  } catch (err) {
    showMessage(await errorMessage(err, 'Failed to export usage.'), 'error');
  } finally {
    downloading.value = false;
  }
}

async function loadPreview() {
  previewLoading.value = true;
  previewError.value = '';
  try {
    const res = await api.get('config/usage-export', {
      ...authHeaders(),
      params: { days: days.value, format: 'json' },
    });
    preview.value = res.data;
  } catch (err) {
    preview.value = null;
    previewError.value = await errorMessage(err, 'Failed to load the preview.');
  } finally {
    previewLoading.value = false;
  }
}

async function openPreview() {
  message.value = '';
  sendResult.value = '';
  preview.value = null;
  modalTrigger = document.activeElement;
  previewModal?.show();
  await loadPreview();
}

async function send() {
  const meta = preview.value?.meta;
  if (!meta) return;
  sending.value = true;
  previewError.value = '';
  try {
    const res = await api.post(
      'config/usage-export/send',
      {
        days: days.value,
        format: format.value,
        window_end: meta.window.to,
        expected_row_count: meta.row_count,
      },
      authHeaders()
    );
    sendResult.value = `Sent ${res.data?.row_count ?? meta.row_count} rows (${res.data?.format || format.value}).`;
    showMessage(sendResult.value);
  } catch (err) {
    previewError.value = await errorMessage(err, 'Failed to send usage.');
    if (err.response?.status === 503) loadStatus(); // mail or TELEMETRY_TO changed: disable Send
    if (err.response?.status === 409) {
      // Rows changed since the preview: show the new preview before another send.
      await loadPreview();
      if (!previewError.value) {
        previewError.value = 'The usage data changed since the preview. Check the new preview, then send again.';
      }
    }
  } finally {
    sending.value = false;
  }
}

function closePreview() {
  previewModal?.hide();
}

function onPreviewHidden() {
  modalTrigger?.focus?.();
  modalTrigger = null;
}

onMounted(() => {
  if (previewModalEl.value) {
    previewModal = new Modal(previewModalEl.value);
    previewModalEl.value.addEventListener('hidden.bs.modal', onPreviewHidden);
  }
  loadStatus();
});

onBeforeUnmount(() => {
  previewModalEl.value?.removeEventListener('hidden.bs.modal', onPreviewHidden);
  previewModal?.dispose();
  previewModal = null;
});
</script>

<template>
  <div>
    <p class="small text-muted mb-3">
      Pseudonymous usage rows (event, time, duration, route template). No names, emails, IDs or file paths.
    </p>
    <div class="d-flex flex-wrap align-items-end gap-2">
      <div>
        <label class="form-label small mb-1" for="usage-export-days">Period</label>
        <select id="usage-export-days" v-model.number="days" class="form-select form-select-sm">
          <option :value="7">7 days</option>
          <option :value="14">14 days</option>
          <option :value="30">30 days</option>
          <option :value="90">90 days</option>
          <option :value="365">365 days</option>
        </select>
      </div>
      <div>
        <label class="form-label small mb-1" for="usage-export-format">Format</label>
        <select id="usage-export-format" v-model="format" class="form-select form-select-sm">
          <option value="csv">CSV</option>
          <option value="json">JSON</option>
        </select>
      </div>
      <button type="button" class="btn btn-sm btn-outline-primary" :disabled="downloading" @click="download">
        <span v-if="downloading" class="spinner-border spinner-border-sm me-1" aria-hidden="true" />
        <i v-else class="bi bi-download me-1" aria-hidden="true" />
        Download usage
      </button>
      <span v-tooltip="sendDisabledReason || null" :tabindex="sendDisabledReason ? 0 : null">
        <button type="button" class="btn btn-sm btn-primary" :disabled="!!sendDisabledReason"
          @click="openPreview">
          <i class="bi bi-send me-1" aria-hidden="true" />
          Send to W4H team…
        </button>
      </span>
    </div>
    <p v-if="sendDisabledReason" class="small text-muted mt-2 mb-0">
      Sending is off: {{ sendDisabledReason }}<template
        v-if="settingsLink && !mailConfigured">
        (<router-link :to="{ name: 'adminSettings' }">Settings</router-link>)</template>.
    </p>
    <div v-if="message" :class="['small mt-2', messageType === 'success' ? 'text-success' : 'text-danger']"
      :role="messageType === 'success' ? 'status' : 'alert'">
      {{ message }}
    </div>

    <div ref="previewModalEl" class="modal fade" tabindex="-1" aria-labelledby="usage-preview-title"
      aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 id="usage-preview-title" class="modal-title">Send usage to the W4H team</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="closePreview" />
          </div>
          <div class="modal-body">
            <div v-if="previewLoading" class="text-muted small">
              <span class="spinner-border spinner-border-sm me-1" aria-hidden="true" />Loading preview…
            </div>
            <template v-else-if="preview?.meta">
              <p class="small mb-2">This is exactly what will be sent, as {{ format.toUpperCase() }}.</p>
              <dl class="row small mb-3">
                <dt class="col-sm-3 text-muted fw-normal">Scope</dt>
                <dd class="col-sm-9">{{ scopeLabel }}</dd>
                <dt class="col-sm-3 text-muted fw-normal">Window</dt>
                <dd class="col-sm-9">{{ preview.meta.window.from }} – {{ preview.meta.window.to }}
                  ({{ preview.meta.window.days }} days)</dd>
                <dt class="col-sm-3 text-muted fw-normal">Rows</dt>
                <dd class="col-sm-9">{{ preview.meta.row_count }}</dd>
                <dt class="col-sm-3 text-muted fw-normal">Install ID</dt>
                <dd class="col-sm-9 font-monospace text-break">{{ preview.meta.install_id }}</dd>
                <dt class="col-sm-3 text-muted fw-normal">Version</dt>
                <dd class="col-sm-9">{{ preview.meta.version }}</dd>
              </dl>
              <p class="small text-muted mb-2">
                Contains no names, emails, IDs or file paths. First {{ previewRows.length }} of
                {{ preview.meta.row_count }} rows:
              </p>
              <div class="table-responsive">
                <table class="table table-sm small mb-0">
                  <thead>
                    <tr>
                      <th v-for="col in preview.columns" :key="col" scope="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="!previewRows.length">
                      <td :colspan="preview.columns.length" class="text-muted">No rows in this period.</td>
                    </tr>
                    <tr v-for="(row, i) in previewRows" :key="i">
                      <td v-for="col in preview.columns" :key="col">{{ row[col] ?? '' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </template>
            <div v-if="previewError" class="alert alert-danger small mt-3 mb-0" role="alert">{{ previewError }}</div>
            <div v-if="sendResult" class="alert alert-success small mt-3 mb-0" role="status">{{ sendResult }}</div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closePreview">
              {{ sendResult ? 'Close' : 'Cancel' }}
            </button>
            <button v-if="!sendResult" type="button" class="btn btn-primary"
              :disabled="sending || previewLoading || !preview?.meta" @click="send">
              <span v-if="sending" class="spinner-border spinner-border-sm me-1" aria-hidden="true" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
