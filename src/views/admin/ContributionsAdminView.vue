<template>
  <main role="main" class="container-fluid">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
      <div>
        <h5 class="mb-1">
          <i class="bi bi-box-seam me-1"></i>
          Contributions
        </h5>
        <p class="small text-muted mb-0">
          Super admin catalog. Published rows appear in the app-shell
          <router-link :to="{ name: 'contributions' }">Contributions</router-link> browse.
          Pin a GitHub release/tag rather than following <code>main</code>.
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-sm btn-outline-primary" type="button" :disabled="checkingUpdates || loading" @click="checkUpdates">
          {{ checkingUpdates ? 'Checking…' : 'Check for updates' }}
        </button>
        <button class="btn btn-sm btn-primary" type="button" @click="openNew">
          <i class="bi bi-plus"></i> Add contribution
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-if="checkSummary" class="alert alert-info py-2 small">{{ checkSummary }}</div>

    <table v-if="!loading" class="table table-sm align-middle">
      <thead>
        <tr>
          <th>Title</th>
          <th>Publisher</th>
          <th>Kind</th>
          <th>Language</th>
          <th>Version</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in items" :key="row.slug">
          <td>
            <div class="fw-semibold">{{ row.title }}</div>
            <div class="small font-monospace text-muted">{{ row.slug }}</div>
          </td>
          <td>{{ row.publisher }}</td>
          <td>{{ (row.kinds && row.kinds.length ? row.kinds : [row.kind]).join(', ') }}</td>
          <td>{{ row.language }}</td>
          <td>
            <div class="font-monospace small">{{ pinnedLabel(row) }}</div>
            <span v-if="row.update_available" class="badge text-bg-warning">Update available</span>
            <div v-if="row.update_available" class="small text-muted">{{ row.latest_repo_ref }}</div>
          </td>
          <td>{{ row.status }}</td>
          <td class="text-end text-nowrap">
            <button
              v-if="row.update_available"
              class="btn btn-sm btn-primary me-1"
              type="button"
              :disabled="previewingSlug === row.slug"
              @click="openUpdate(row)"
            >
              {{ previewingSlug === row.slug ? 'Loading…' : `Update to ${row.latest_repo_ref}` }}
            </button>
            <button class="btn btn-sm btn-outline-secondary me-1" type="button" @click="openEdit(row)">Edit</button>
            <button class="btn btn-sm btn-outline-danger" type="button" @click="remove(row)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="formOpen" class="card p-3 mt-3">
      <h6 class="mb-3">{{ isUpdatingExisting ? 'Edit contribution' : 'Add contribution' }}</h6>
      <div v-if="matchingCatalogRow && !editingSlug" class="alert alert-info py-2 small">
        <code>{{ matchingCatalogRow.slug }}</code> is already in the catalog.
        Save will update that row (it was seeded with the first-party listings).
      </div>

      <div class="row g-3">
        <div class="col-md-8">
          <label class="form-label">Repository URL</label>
          <div class="input-group">
            <input v-model="form.repo_url" class="form-control font-monospace" placeholder="https://github.com/owner/repo" />
            <button class="btn btn-outline-primary" type="button" :disabled="inspecting || !form.repo_url" @click="fetchRepoInfo">
              {{ inspecting ? 'Fetching…' : 'Fetch repo info' }}
            </button>
          </div>
          <div class="form-text">Fills in the fields below from the README, manifest.yaml, and detected files (notebook, CLI, SQL job, dataset, or Postgres extension).</div>
        </div>
        <div class="col-md-4">
          <label class="form-label">Status</label>
          <select v-model="form.status" class="form-select">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="deprecated">deprecated</option>
          </select>
        </div>

        <div v-if="inspectError" class="col-12">
          <div class="alert alert-danger py-2 small mb-0">{{ inspectError }}</div>
        </div>
        <div v-if="manifestValidation && (manifestValidation.errors.length || manifestValidation.warnings.length)" class="col-12">
          <div class="alert alert-warning py-2 small mb-0">
            <div class="fw-semibold mb-1">manifest.yaml sanity check</div>
            <ul class="mb-0 ps-3">
              <li v-for="(msg, i) in manifestValidation.errors" :key="`e${i}`" class="text-danger">{{ msg }}</li>
              <li v-for="(msg, i) in manifestValidation.warnings" :key="`w${i}`">{{ msg }}</li>
            </ul>
          </div>
        </div>
        <div v-else-if="manifestChecked" class="col-12">
          <div class="alert alert-success py-2 small mb-0">manifest.yaml looks good.</div>
        </div>
        <div v-if="pairedDataset" class="col-12">
          <div class="alert alert-info py-2 small mb-0">
            Paired sample-data repo detected (ADR-016): <strong>{{ pairedDataset.title || pairedDataset.slug }}</strong>
            (<code>{{ pairedDataset.slug }}</code>), manifest.yaml found.
          </div>
        </div>

        <div class="col-md-4">
          <label class="form-label">Slug</label>
          <input v-model="form.slug" class="form-control font-monospace" :disabled="isUpdatingExisting" />
        </div>
        <div class="col-md-4">
          <label class="form-label">Publisher</label>
          <input v-model="form.publisher" class="form-control" />
        </div>
        <div class="col-md-4">
          <label class="form-label">Title</label>
          <input v-model="form.title" class="form-control" />
        </div>
        <div class="col-12">
          <label class="form-label">Summary</label>
          <input v-model="form.summary" class="form-control" />
        </div>
        <div class="col-md-4">
          <fieldset class="border-0 p-0 m-0">
            <legend class="form-label kinds-legend">Kinds</legend>
            <div v-for="k in kindChoices" :key="k.id" class="form-check">
              <input
                :id="`kind-${k.id}`"
                v-model="form.kinds"
                class="form-check-input"
                type="checkbox"
                :value="k.id"
              />
              <label class="form-check-label" :for="`kind-${k.id}`">{{ k.id }}</label>
              <button
                type="button"
                class="btn btn-link btn-sm p-0 ms-1 align-baseline text-muted"
                v-tooltip="k.help"
                :aria-label="`About ${k.id}`"
              >
                <i class="bi bi-question-circle" aria-hidden="true"></i>
              </button>
            </div>
          </fieldset>
        </div>
        <div class="col-md-4">
          <label class="form-label">Language</label>
          <select v-model="form.language" class="form-select">
            <option value="" disabled>Choose…</option>
            <option value="python">python</option>
            <option value="r">r</option>
            <option value="sql">sql</option>
            <option value="csv">csv</option>
            <option value="json">json</option>
            <option value="other">other</option>
          </select>
        </div>

        <div class="col-12">
          <button class="btn btn-link btn-sm px-0" type="button" @click="showAdvanced = !showAdvanced">
            {{ showAdvanced ? 'Hide' : 'Show' }} advanced (git tag, version, or docs path)
          </button>
        </div>
        <template v-if="showAdvanced">
          <div class="col-md-4">
            <label class="form-label">Git ref (tag or branch)</label>
            <input v-model="form.repo_ref" class="form-control font-monospace" placeholder="v0.1.0" />
            <div class="form-text">Prefer a <code>vMAJOR.MINOR.PATCH</code> tag. <code>main</code> is a moving target.</div>
          </div>
          <div class="col-md-4">
            <label class="form-label">Pinned version</label>
            <input v-model="form.version" class="form-control font-monospace" placeholder="0.1.0" />
          </div>
          <div class="col-md-4">
            <label class="form-label">Docs path in repo</label>
            <input v-model="form.docs_path" class="form-control font-monospace" placeholder="README.md" />
          </div>
        </template>
      </div>
      <div class="mt-3 d-flex gap-2">
        <button class="btn btn-primary" type="button" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : (isUpdatingExisting ? 'Update' : 'Save') }}
        </button>
        <button class="btn btn-outline-secondary" type="button" @click="formOpen = false">Cancel</button>
      </div>
      <div v-if="errorMessage" class="alert alert-danger py-2 small mt-3 mb-0">{{ errorMessage }}</div>
    </div>

    <div class="modal fade" tabindex="-1" ref="updateModalEl" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              Update {{ updatePreview?.slug }} to {{ updatePreview?.to?.repo_ref }}
            </h5>
            <button type="button" class="btn-close" aria-label="Close" @click="closeUpdate"></button>
          </div>
          <div class="modal-body">
            <div v-if="updateError" class="alert alert-danger py-2 small">{{ updateError }}</div>
            <template v-if="updatePreview">
              <p class="small mb-3">
                Pin <code>{{ updatePreview.to.repo_ref }}</code>
                ({{ updatePreview.to.version || 'no semver' }})
                in place of
                <code>{{ updatePreview.from.repo_ref || 'main' }}</code>
                <span v-if="updatePreview.from.version">({{ updatePreview.from.version }})</span>.
                In-app Run will clone this tag. This does not auto-follow <code>main</code>.
              </p>
              <div v-if="updatePreview.release?.body" class="mb-3">
                <div class="fw-semibold small mb-1">Release notes</div>
                <pre class="small bg-light border rounded p-2 mb-0 release-notes">{{ updatePreview.release.body }}</pre>
                <a
                  v-if="updatePreview.release.html_url"
                  class="small"
                  :href="updatePreview.release.html_url"
                  target="_blank"
                  rel="noopener"
                >Open on GitHub</a>
              </div>
              <div v-if="updatePreview.inspect?.suggested" class="small mb-3">
                <div class="fw-semibold mb-1">Detected at this tag</div>
                <div>Kinds: {{ (updatePreview.inspect.suggested.kinds || []).join(', ') || updatePreview.inspect.suggested.kind }}</div>
                <div>Language: {{ updatePreview.inspect.suggested.language }}</div>
              </div>
              <div
                v-if="updatePreview.inspect?.validation && (updatePreview.inspect.validation.errors?.length || updatePreview.inspect.validation.warnings?.length)"
                class="alert alert-warning py-2 small"
              >
                <div class="fw-semibold mb-1">manifest.yaml sanity check</div>
                <ul class="mb-0 ps-3">
                  <li v-for="(msg, i) in updatePreview.inspect.validation.errors || []" :key="`ue${i}`" class="text-danger">{{ msg }}</li>
                  <li v-for="(msg, i) in updatePreview.inspect.validation.warnings || []" :key="`uw${i}`">{{ msg }}</li>
                </ul>
              </div>
              <div v-if="updatePreview.pairedUpdate" class="alert alert-warning py-2 small mb-0">
                Paired sample-data repo <code>{{ updatePreview.pairedUpdate.slug }}</code>
                also has {{ updatePreview.pairedUpdate.latest_repo_ref }} available
                (pinned {{ updatePreview.pairedUpdate.repo_ref || 'main' }}).
                Importer and dataset version independently — update that listing too if this release needs new sample files.
              </div>
            </template>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" type="button" @click="closeUpdate">Cancel</button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="pinning || !updatePreview" @click="confirmUpdate">
              {{ pinning ? 'Updating…' : 'Pin this release' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import { Modal } from 'bootstrap';
import { api, authHeaders } from '@/utils/api';
import { CONTRIBUTION_KIND_CHOICES, contributionKinds } from '@/utils/contributionKinds';

const kindChoices = CONTRIBUTION_KIND_CHOICES;

const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const formOpen = ref(false);
const editingSlug = ref('');
const form = reactive(emptyForm());
const showAdvanced = ref(false);
const inspecting = ref(false);
const inspectError = ref('');
const manifestValidation = ref(null);
const manifestChecked = ref(false);
const pairedDataset = ref(null);
const checkingUpdates = ref(false);
const checkSummary = ref('');
const previewingSlug = ref('');
const pinning = ref(false);
const updatePreview = ref(null);
const updateError = ref('');
const updateModalEl = ref(null);
let updateModal = null;

const matchingCatalogRow = computed(() => {
  const key = String(form.slug || '').trim().toLowerCase();
  if (!key) return null;
  return items.value.find((row) => String(row.slug).toLowerCase() === key) || null;
});
const isUpdatingExisting = computed(() => Boolean(editingSlug.value || matchingCatalogRow.value));

function emptyForm() {
  return {
    slug: '',
    publisher: '',
    title: '',
    summary: '',
    kind: '',
    kinds: [],
    language: '',
    repo_url: '',
    repo_ref: 'main',
    docs_path: 'README.md',
    status: 'published',
    version: '',
  };
}

function pinnedLabel(row) {
  if (row?.version) return row.version;
  return row?.repo_ref || 'main';
}

function assignForm(src) {
  const next = emptyForm();
  Object.assign(next, src || {});
  next.kinds = contributionKinds(src || next);
  next.version = src?.version || '';
  Object.assign(form, next);
}

function resetInspectState() {
  showAdvanced.value = false;
  inspectError.value = '';
  manifestValidation.value = null;
  manifestChecked.value = false;
  pairedDataset.value = null;
}

function openNew() {
  editingSlug.value = '';
  assignForm();
  resetInspectState();
  formOpen.value = true;
}

function openEdit(row) {
  editingSlug.value = row.slug;
  assignForm(row);
  resetInspectState();
  showAdvanced.value = Boolean(
    (row.repo_ref && row.repo_ref !== 'main') || (row.docs_path && row.docs_path !== 'README.md') || row.version
  );
  formOpen.value = true;
}

async function fetchRepoInfo() {
  inspecting.value = true;
  inspectError.value = '';
  manifestValidation.value = null;
  manifestChecked.value = false;
  pairedDataset.value = null;
  try {
    const res = await api.post(
      '/contributions/inspect',
      { repo_url: form.repo_url, repo_ref: form.repo_ref },
      authHeaders()
    );
    const { suggested, manifest, validation, pairedDataset: paired } = res.data;
    Object.assign(form, suggested);
    form.kinds = contributionKinds(form);
    if (suggested?.kind && form.kinds.includes(suggested.kind)) {
      form.kind = suggested.kind;
    }
    if (manifest) {
      manifestChecked.value = true;
      manifestValidation.value = validation;
    }
    pairedDataset.value = paired || null;
  } catch (e) {
    inspectError.value = e.response?.data?.error || e.message || 'Failed to fetch repo info.';
  } finally {
    inspecting.value = false;
  }
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await api.get('/contributions', { ...authHeaders(), params: { all: '1' } });
    items.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    errorMessage.value = e.response?.data?.error || e.message || 'Failed to load contributions.';
  } finally {
    loading.value = false;
  }
}

async function checkUpdates() {
  checkingUpdates.value = true;
  errorMessage.value = '';
  checkSummary.value = '';
  try {
    const res = await api.post('/contributions/check-updates', {}, authHeaders());
    items.value = Array.isArray(res.data?.rows) ? res.data.rows : items.value;
    const updates = Number(res.data?.updates) || 0;
    const without = Number(res.data?.without_releases) || 0;
    const failed = (res.data?.results || []).filter((r) => r.error).length;
    const parts = [];
    if (updates) parts.push(`${updates} update${updates === 1 ? '' : 's'} available.`);
    else parts.push('No newer GitHub releases than the current pins.');
    if (without) parts.push(`${without} listing${without === 1 ? '' : 's'} still have no releases (often still on main).`);
    if (failed) parts.push(`${failed} could not be checked.`);
    checkSummary.value = parts.join(' ');
  } catch (e) {
    errorMessage.value = e.response?.data?.error || e.message || 'Failed to check for updates.';
  } finally {
    checkingUpdates.value = false;
  }
}

async function openUpdate(row) {
  previewingSlug.value = row.slug;
  updateError.value = '';
  updatePreview.value = null;
  try {
    const res = await api.post(
      `/contributions/${encodeURIComponent(row.slug)}/update-version`,
      { repo_ref: row.latest_repo_ref, confirm: false },
      authHeaders()
    );
    updatePreview.value = res.data?.preview || null;
    updateModal?.show();
  } catch (e) {
    errorMessage.value = e.response?.data?.error || e.message || 'Failed to preview update.';
  } finally {
    previewingSlug.value = '';
  }
}

function closeUpdate() {
  updateModal?.hide();
}

async function confirmUpdate() {
  if (!updatePreview.value) return;
  pinning.value = true;
  updateError.value = '';
  try {
    const res = await api.post(
      `/contributions/${encodeURIComponent(updatePreview.value.slug)}/update-version`,
      { repo_ref: updatePreview.value.to.repo_ref, confirm: true },
      authHeaders()
    );
    const next = res.data?.row;
    if (next) {
      items.value = items.value.map((row) => (row.slug === next.slug ? next : row));
    }
    closeUpdate();
  } catch (e) {
    updateError.value = e.response?.data?.error || e.message || 'Failed to pin this release.';
  } finally {
    pinning.value = false;
  }
}

async function save() {
  saving.value = true;
  errorMessage.value = '';
  try {
    const kinds = form.kinds || [];
    const kind = (form.kind && kinds.includes(form.kind)) ? form.kind : (kinds[0] || form.kind);
    const payload = { ...form, kinds, kind };
    const targetSlug = editingSlug.value || matchingCatalogRow.value?.slug;
    if (targetSlug) {
      await api.patch(`/contributions/${encodeURIComponent(targetSlug)}`, payload, authHeaders());
    } else {
      await api.post('/contributions', payload, authHeaders());
    }
    formOpen.value = false;
    await load();
  } catch (e) {
    const status = e.response?.status;
    const apiError = e.response?.data?.error;
    if (status === 409) {
      errorMessage.value = apiError
        ? `${apiError}. Open that row from the list and click Edit, or change the slug.`
        : 'A contribution with this slug already exists. Open it from the list to update it.';
    } else {
      errorMessage.value = apiError || e.message || 'Save failed.';
    }
  } finally {
    saving.value = false;
  }
}

async function remove(row) {
  if (!window.confirm(`Delete contribution ${row.slug}?`)) return;
  try {
    await api.delete(`/contributions/${encodeURIComponent(row.slug)}`, authHeaders());
    await load();
  } catch (e) {
    errorMessage.value = e.response?.data?.error || e.message || 'Delete failed.';
  }
}

onMounted(() => {
  load();
  if (!updateModalEl.value) return;
  updateModal = new Modal(updateModalEl.value);
  updateModalEl.value.addEventListener('hidden.bs.modal', () => {
    updatePreview.value = null;
    updateError.value = '';
  });
});

onBeforeUnmount(() => {
  updateModal?.dispose();
  updateModal = null;
});
</script>

<style scoped>
.kinds-legend {
  float: none;
  width: auto;
  font-size: inherit;
}
.release-notes {
  max-height: 12rem;
  overflow: auto;
  white-space: pre-wrap;
}
</style>
