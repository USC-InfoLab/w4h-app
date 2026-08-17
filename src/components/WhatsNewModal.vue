<template>
  <div
    v-if="open"
    class="modal fade show d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="whatsNewTitle"
  >
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 id="whatsNewTitle" class="modal-title">{{ doc?.title || "What's New" }}</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="close" />
        </div>
        <div class="modal-body">
          <div v-if="doc" v-html="renderedHtml" class="md-preview" />
        </div>
        <div class="modal-footer">
          <router-link
            :to="{ name: 'docs', params: { slug: 'whats-new' } }"
            class="btn btn-link me-auto"
            @click="close"
          >
            Open in Help
          </router-link>
          <button type="button" class="btn btn-outline-secondary" @click="dontShowAgain">
            Don't show again
          </button>
          <button type="button" class="btn btn-primary" @click="close">Got it</button>
        </div>
      </div>
    </div>
  </div>
  <div v-if="open" class="modal-backdrop fade show" @click="close" />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api, { authHeaders } from '@/utils/api';
import { rewriteDocMediaUrls } from '@/utils/docMedia';

// Per-browser, like VS Code's "what's new" — not synced across devices.
// Closing (X / backdrop / "Got it") does NOT suppress it — it reopens on the
// next load until the user explicitly picks "Don't show again", which stamps
// this key with the doc's updated_at. A fresh Import Docs publish changes
// updated_at, so a new release reopens it even for users who opted out of
// the previous one.
const SEEN_KEY = 'w4h.whatsNewSeenAt';

const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
const apiUrl = import.meta.env.VITE_API_URL || '';

const open = ref(false);
const doc = ref(null);

const renderedHtml = computed(() => {
  if (!doc.value?.html) return '';
  const html = doc.value.html
    .replace(/(?<!\\)\{\{APP_URL\}\}/g, appUrl)
    .replace(/\\(\{\{APP_URL\}\})/g, '{{APP_URL}}')
    .replace(/(?<!\\)\{\{API_URL\}\}/g, apiUrl)
    .replace(/\\(\{\{API_URL\}\})/g, '{{API_URL}}');
  return rewriteDocMediaUrls(html);
});

onMounted(async () => {
  try {
    const res = await api.get('/docs/whats-new', authHeaders());
    const d = res.data;
    if (!d?.updated_at) return;
    doc.value = d;
    if (localStorage.getItem(SEEN_KEY) !== d.updated_at) {
      open.value = true;
    }
  } catch {
    // Not imported on this instance yet, or user can't read docs — stay silent.
  }
});

function close() {
  open.value = false;
}

function dontShowAgain() {
  if (doc.value?.updated_at) {
    localStorage.setItem(SEEN_KEY, doc.value.updated_at);
  }
  open.value = false;
}
</script>

<style scoped>
/* This modal renders outside <main>, so it inherits #app's global
   text-align: center (style.css) instead of main's left-align override. */
.modal-body {
  text-align: left;
}

/* DocsView.vue's full .md-preview rules live in a route chunk that may not
   be loaded yet the first time this modal fires, so this repeats just the
   essentials for readable rendering here. */
.modal-body :deep(.md-preview img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

.modal-body :deep(.md-preview img[src*="/docs-media/whats-new/"]),
.modal-body :deep(.md-preview img[src*="media/whats-new/"]) {
  max-height: 520px;
}

.modal-body :deep(.md-preview pre) {
  overflow-x: auto;
  padding: 0.75rem;
  border-radius: 6px;
  background: var(--bs-tertiary-bg, #f6f6f6);
}

.modal-body :deep(.md-preview table) {
  width: 100%;
  border-collapse: collapse;
}

.modal-body :deep(.md-preview th),
.modal-body :deep(.md-preview td) {
  border: 1px solid var(--bs-border-color-translucent, rgba(0, 0, 0, 0.15));
  padding: 0.4rem 0.6rem;
}
</style>
