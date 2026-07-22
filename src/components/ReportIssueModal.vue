<template>
  <div
    v-if="open"
    class="modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="reportIssueTitle"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 id="reportIssueTitle" class="modal-title">Report an issue</h5>
          <button type="button" class="btn-close" aria-label="Close" :disabled="sending" @click="close" />
        </div>
        <form @submit.prevent="submit">
          <div class="modal-body">
            <p class="small text-muted">
              Sends an email to the platform help address (configured by Super admin).
              Do not include PHI or identifiable patient data.
            </p>
            <div v-if="error" class="alert alert-danger py-2">{{ error }}</div>
            <div v-if="success" class="alert alert-success py-2">{{ success }}</div>
            <div class="mb-3">
              <label class="form-label" for="report-subject">Subject</label>
              <input
                id="report-subject"
                v-model="subject"
                class="form-control"
                required
                maxlength="200"
                :disabled="sending || !!success"
              />
            </div>
            <div class="mb-0">
              <label class="form-label" for="report-message">Message</label>
              <textarea
                id="report-message"
                v-model="message"
                class="form-control"
                rows="5"
                required
                maxlength="8000"
                :disabled="sending || !!success"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" :disabled="sending" @click="close">
              {{ success ? 'Close' : 'Cancel' }}
            </button>
            <button v-if="!success" type="submit" class="btn btn-primary" :disabled="sending">
              <span v-if="sending" class="spinner-border spinner-border-sm me-1" />
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
  <div v-if="open" class="modal-backdrop fade show" @click="close" />
</template>

<script setup>
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { api, authHeaders } from '@/utils/api';

const props = defineProps({
  open: { type: Boolean, default: false },
});
const emit = defineEmits(['close']);

const route = useRoute();
const subject = ref('');
const message = ref('');
const sending = ref(false);
const error = ref('');
const success = ref('');

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      subject.value = '';
      message.value = '';
      error.value = '';
      success.value = '';
    }
  }
);

function close() {
  if (sending.value) return;
  emit('close');
}

async function submit() {
  sending.value = true;
  error.value = '';
  success.value = '';
  try {
    const res = await api.post(
      'config/report-issue',
      {
        subject: subject.value.trim(),
        message: message.value.trim(),
        page_url: typeof window !== 'undefined' ? window.location.href : route.fullPath,
      },
      authHeaders()
    );
    success.value = res.data?.message || 'Report sent.';
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to send report.';
  } finally {
    sending.value = false;
  }
}
</script>
