<template>
  <div v-if="show" class="modal fade show" style="display: block;" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Refresh documentation</h5>
          <button type="button" class="btn-close" :disabled="applying" @click="$emit('close')"></button>
        </div>

        <div class="modal-body">
          <div v-if="loading" class="text-center py-4">
            <span class="spinner-border spinner-border-sm me-2" />
            Comparing platform docs to source…
          </div>

          <div v-else-if="error" class="alert alert-danger mb-0">{{ error }}</div>

          <template v-else-if="preview">
            <p class="text-muted small mb-3">
              Matching pages are re-imported from the source.
              Choose per-file actions where platform and source diverge.
              Export is unchanged — “Use platform” only skips overwrite.
            </p>

            <div v-if="preview.uncommitted?.length" class="alert alert-warning">
              <strong>Uncommitted source files</strong> (warn only — working-tree content will be used if imported):
              <ul class="mb-0 mt-2 small">
                <li v-for="f in preview.uncommitted" :key="f.path">
                  <code>{{ f.path }}</code>
                  <span class="text-muted"> ({{ f.status }})</span>
                </li>
              </ul>
            </div>

            <div v-if="!hasDecisions" class="alert alert-success">
              Platform and source are aligned
              ({{ preview.counts.matching }} matching page{{ preview.counts.matching === 1 ? '' : 's' }}).
              You can still re-import to refresh rendered HTML.
            </div>

            <section v-if="preview.conflicts?.length" class="mb-4">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Differ ({{ preview.conflicts.length }})</h6>
                <div class="btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-secondary" @click="setAllConflicts('repo')">
                    All source
                  </button>
                  <button type="button" class="btn btn-outline-secondary" @click="setAllConflicts('platform')">
                    All platform
                  </button>
                </div>
              </div>
              <div
                v-for="doc in preview.conflicts"
                :key="'c-' + doc.slug"
                class="border rounded p-2 mb-2"
              >
                <div class="fw-semibold">{{ doc.title || doc.slug }}</div>
                <div class="small text-muted mb-2">
                  <code>{{ doc.path || doc.slug }}</code>
                </div>
                <div class="d-flex flex-wrap gap-3">
                  <label class="form-check">
                    <input
                      v-model="decisions.conflicts[doc.slug]"
                      class="form-check-input"
                      type="radio"
                      :name="'conflict-' + doc.slug"
                      value="repo"
                    />
                    <span class="form-check-label">Use source</span>
                  </label>
                  <label class="form-check">
                    <input
                      v-model="decisions.conflicts[doc.slug]"
                      class="form-check-input"
                      type="radio"
                      :name="'conflict-' + doc.slug"
                      value="platform"
                    />
                    <span class="form-check-label">Use platform (skip overwrite)</span>
                  </label>
                </div>
              </div>
            </section>

            <section v-if="preview.dbOnly?.length" class="mb-4">
              <h6 class="mb-2">Platform only ({{ preview.dbOnly.length }})</h6>
              <p class="small text-muted">Not in the source repo. Keep, or delete from the platform.</p>
              <div
                v-for="doc in preview.dbOnly"
                :key="'d-' + doc.slug"
                class="border rounded p-2 mb-2"
              >
                <div class="fw-semibold">{{ doc.title || doc.slug }}</div>
                <div class="small text-muted mb-2"><code>{{ doc.slug }}</code></div>
                <div class="d-flex flex-wrap gap-3">
                  <label class="form-check">
                    <input
                      v-model="decisions.dbOnly[doc.slug]"
                      class="form-check-input"
                      type="radio"
                      :name="'dbOnly-' + doc.slug"
                      value="keep"
                    />
                    <span class="form-check-label">Keep</span>
                  </label>
                  <label class="form-check">
                    <input
                      v-model="decisions.dbOnly[doc.slug]"
                      class="form-check-input"
                      type="radio"
                      :name="'dbOnly-' + doc.slug"
                      value="delete"
                    />
                    <span class="form-check-label text-danger">Delete</span>
                  </label>
                </div>
              </div>
            </section>

            <section v-if="preview.repoOnly?.length" class="mb-2">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <h6 class="mb-0">Source only ({{ preview.repoOnly.length }})</h6>
                <div class="btn-group btn-group-sm">
                  <button type="button" class="btn btn-outline-secondary" @click="setAllRepoOnly('import')">
                    Import all
                  </button>
                  <button type="button" class="btn btn-outline-secondary" @click="setAllRepoOnly('skip')">
                    Skip all
                  </button>
                </div>
              </div>
              <div
                v-for="doc in preview.repoOnly"
                :key="'r-' + doc.slug"
                class="border rounded p-2 mb-2"
              >
                <div class="fw-semibold">{{ doc.title || doc.slug }}</div>
                <div class="small text-muted mb-2"><code>{{ doc.path || doc.slug }}</code></div>
                <div class="d-flex flex-wrap gap-3">
                  <label class="form-check">
                    <input
                      v-model="decisions.repoOnly[doc.slug]"
                      class="form-check-input"
                      type="radio"
                      :name="'repoOnly-' + doc.slug"
                      value="import"
                    />
                    <span class="form-check-label">Import</span>
                  </label>
                  <label class="form-check">
                    <input
                      v-model="decisions.repoOnly[doc.slug]"
                      class="form-check-input"
                      type="radio"
                      :name="'repoOnly-' + doc.slug"
                      value="skip"
                    />
                    <span class="form-check-label">Skip</span>
                  </label>
                </div>
              </div>
            </section>

            <p v-if="preview.counts?.matching" class="small text-muted mb-0">
              {{ preview.counts.matching }} matching page{{ preview.counts.matching === 1 ? '' : 's' }}
              will be re-imported from source.
            </p>
          </template>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" :disabled="applying" @click="$emit('close')">
            Cancel
          </button>
          <button
            type="button"
            class="btn btn-warning"
            :disabled="loading || !!error || !preview || applying"
            @click="apply"
          >
            <span v-if="applying" class="spinner-border spinner-border-sm me-1" />
            Apply refresh
          </button>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show"></div>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['close', 'applied']);

const loading = ref(false);
const applying = ref(false);
const error = ref('');
const preview = ref(null);
const decisions = reactive({
  conflicts: {},
  dbOnly: {},
  repoOnly: {},
});

const hasDecisions = computed(() => {
  const p = preview.value;
  if (!p) return false;
  return (p.conflicts?.length || 0) + (p.dbOnly?.length || 0) + (p.repoOnly?.length || 0) > 0;
});

function resetDecisions(data) {
  decisions.conflicts = {};
  decisions.dbOnly = {};
  decisions.repoOnly = {};
  for (const doc of data.conflicts || []) {
    decisions.conflicts[doc.slug] = 'repo';
  }
  for (const doc of data.dbOnly || []) {
    decisions.dbOnly[doc.slug] = 'keep';
  }
  for (const doc of data.repoOnly || []) {
    decisions.repoOnly[doc.slug] = 'import';
  }
}

function setAllConflicts(action) {
  for (const slug of Object.keys(decisions.conflicts)) {
    decisions.conflicts[slug] = action;
  }
}

function setAllRepoOnly(action) {
  for (const slug of Object.keys(decisions.repoOnly)) {
    decisions.repoOnly[slug] = action;
  }
}

async function loadPreview() {
  loading.value = true;
  error.value = '';
  preview.value = null;
  try {
    const res = await api.get('docs/refresh/preview', authHeaders());
    if (!res.data?.success) {
      error.value = res.data?.reason || 'Failed to compare docs';
      return;
    }
    preview.value = res.data;
    resetDecisions(res.data);
  } catch (e) {
    error.value = e.response?.data?.reason || e.response?.data?.error || e.message || 'Failed to compare docs';
  } finally {
    loading.value = false;
  }
}

async function apply() {
  applying.value = true;
  error.value = '';
  try {
    const res = await api.post(
      'docs/refresh',
      {
        decisions: {
          conflicts: { ...decisions.conflicts },
          dbOnly: { ...decisions.dbOnly },
          repoOnly: { ...decisions.repoOnly },
        },
      },
      authHeaders()
    );
    if (!res.data?.success) {
      error.value = res.data?.reason || 'Refresh failed';
      return;
    }
    emit('applied', res.data);
    emit('close');
  } catch (e) {
    error.value = e.response?.data?.reason || e.response?.data?.error || e.message || 'Refresh failed';
  } finally {
    applying.value = false;
  }
}

watch(
  () => props.show,
  (open) => {
    if (open) loadPreview();
  }
);
</script>

<style scoped>
.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}
</style>
