<template>
  <div
    v-if="open"
    class="modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="aboutModalTitle"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 id="aboutModalTitle" class="modal-title">About W4H</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="$emit('close')" />
        </div>
        <div class="modal-body">
          <p class="mb-2">
            <strong>W4H Toolkit</strong> — Wearables for Health and Disease Knowledge.
            A research platform for wearable data workflows in clinical trials.
          </p>
          <dl class="row small mb-3">
            <dt class="text-end col-sm-4">Version</dt>
            <dd class="text-start col-sm-8">{{ appVersion }}</dd>
            <dt class="text-end col-sm-4">Funding</dt>
            <dd class="text-start col-sm-8">SC-CTSI Pilot Funding Program</dd>
            <dt class="text-end col-sm-4">Principal PI</dt>
            <dd class="text-start col-sm-8">Cyrus Shahabi, PhD</dd>
            <dt class="text-end col-sm-4">Co-Investigator</dt>
            <dd class="text-start col-sm-8">Luciano Nocera, PhD</dd>
          </dl>
          <p class="small text-muted mb-2">
            App users can <strong>Report an issue</strong> from their account menu to email platform administrators
            (do not include PHI or identifiable study data).
            Technical contributors may also open GitHub issues on the public repositories.
          </p>
          <ul class="list-unstyled small mb-0">
            <li class="mb-1">
              <a :href="repos.docs" target="_blank" rel="noopener noreferrer">w4h-docs</a>
              —
              <a :href="`${repos.docs}/issues`" target="_blank" rel="noopener noreferrer">Issues</a>
            </li>
            <li class="mb-1">
              <a :href="repos.app" target="_blank" rel="noopener noreferrer">w4h-app</a>
              —
              <a :href="`${repos.app}/issues`" target="_blank" rel="noopener noreferrer">Issues</a>
            </li>
            <li>
              <a :href="repos.api" target="_blank" rel="noopener noreferrer">w4h-api</a>
              —
              <a :href="`${repos.api}/issues`" target="_blank" rel="noopener noreferrer">Issues</a>
            </li>
          </ul>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" @click="$emit('close')">Close</button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="open" class="modal-backdrop fade show" @click="$emit('close')" />
</template>

<script setup>
import { formatReleaseLabel } from '@/utils/release';

defineProps({
  open: { type: Boolean, default: false },
});
defineEmits(['close']);

const appVersion = formatReleaseLabel();

const repos = {
  docs: 'https://github.com/USC-InfoLab/w4h-docs',
  app: 'https://github.com/USC-InfoLab/w4h-app',
  api: 'https://github.com/USC-InfoLab/w4h-api',
};
</script>
