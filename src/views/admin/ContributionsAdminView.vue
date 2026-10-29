<template>
  <main role="main" class="container-fluid">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
      <div>
        <h5 class="mb-1">
          <i class="bi bi-box-seam me-1"></i>
          Contributions
        </h5>
        <p class="small text-muted mb-0">
          Git-backed catalog (ADR-018): one repo per listing. Copy and kinds come from the repo at the
          <strong>pinned tag</strong> — not typed here. Super admin adds listings, sets
          <strong>draft / published / deprecated</strong>, and pins GitHub <code>v*</code> releases.
          Researchers browse published rows in the
          <router-link :to="{ name: 'contributions' }">Contributions</router-link> app.
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button class="btn btn-sm btn-outline-primary" type="button" :disabled="checkingUpdates || loading" @click="checkUpdates">
          {{ checkingUpdates ? 'Checking…' : 'Check for updates' }}
        </button>
        <button class="btn btn-sm btn-primary" type="button" @click="openAdd">
          <i class="bi bi-plus"></i> Add listing
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <div v-if="checkSummary" class="alert alert-info py-2 small">{{ checkSummary }}</div>

    <section
      v-if="!loading && availableUpdates.length"
      class="card mb-3 contrib-updates-panel"
      aria-labelledby="contrib-updates-heading"
    >
      <div class="card-body py-3">
        <h6 id="contrib-updates-heading" class="mb-2 d-flex align-items-center gap-2">
          <i class="bi bi-tag" aria-hidden="true"></i>
          Pin newer releases
          <span class="contrib-updates-count">{{ availableUpdates.length }}</span>
        </h6>
        <ul class="list-unstyled mb-0 contrib-updates-list">
          <li
            v-for="row in availableUpdates"
            :key="`up-${row.slug}`"
            class="contrib-update-item d-flex flex-wrap align-items-center justify-content-between gap-2"
          >
            <div class="min-w-0">
              <div class="fw-semibold text-truncate">{{ row.title }}</div>
              <div class="small font-monospace contrib-muted">
                {{ pinnedLabel(row) }}
                <span class="mx-1" aria-hidden="true">→</span>
                {{ row.latest_repo_ref }}
              </div>
            </div>
            <button
              class="btn btn-sm btn-outline-primary flex-shrink-0"
              type="button"
              :disabled="previewingSlug === row.slug"
              @click="openUpdate(row)"
            >
              {{ previewingSlug === row.slug ? 'Loading…' : 'Review & pin' }}
            </button>
          </li>
        </ul>
      </div>
    </section>

    <div v-if="!loading" class="d-flex flex-wrap gap-2 mb-3">
      <div class="btn-group flex-wrap" role="group" aria-label="Kind">
        <button
          v-for="k in kindFilterOptions"
          :key="`kind-${k.id}`"
          type="button"
          class="btn btn-sm"
          :class="kindFilter === k.id ? 'btn-primary' : 'btn-outline-primary'"
          @click="kindFilter = k.id"
        >
          {{ k.label }}
        </button>
      </div>
      <div class="btn-group flex-wrap" role="group" aria-label="Language">
        <button
          v-for="lang in languageFilterOptions"
          :key="`lang-${lang.id}`"
          type="button"
          class="btn btn-sm"
          :class="languageFilter === lang.id ? 'btn-primary' : 'btn-outline-primary'"
          @click="languageFilter = lang.id"
        >
          {{ lang.label }}
        </button>
      </div>
    </div>

    <table v-if="!loading" class="table table-sm align-middle contrib-table">
      <thead>
        <tr>
          <th>Listing</th>
          <th>Publisher</th>
          <th>Kind</th>
          <th>Language</th>
          <th>Pinned</th>
          <th>Status</th>
          <th class="text-end">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!filteredItems.length">
          <td colspan="7" class="text-muted small">No listings match these filters.</td>
        </tr>
        <tr v-for="row in filteredItems" :key="row.slug">
          <td>
            <div class="fw-semibold">{{ row.title }}</div>
            <a
              v-if="row.repo_url"
              :href="row.repo_url"
              class="small font-monospace link-secondary link-underline-opacity-0 link-underline-opacity-100-hover"
              target="_blank"
              rel="noopener"
            >{{ row.slug }}</a>
            <span v-else class="small font-monospace contrib-muted">{{ row.slug }}</span>
          </td>
          <td>{{ row.publisher }}</td>
          <td>{{ (row.kinds && row.kinds.length ? row.kinds : [row.kind]).join(', ') }}</td>
          <td>{{ row.language }}</td>
          <td class="font-monospace small">
            <div>{{ pinnedLabel(row) }}</div>
            <div v-if="row.update_available" class="contrib-pin-hint">
              Newer: {{ row.latest_repo_ref }}
            </div>
            <div v-if="checkResultBySlug[row.slug]?.error" class="contrib-pin-hint text-danger">
              {{ checkResultBySlug[row.slug].error }}
            </div>
            <div
              v-else-if="checkResultBySlug[row.slug]?.note && !row.update_available"
              class="contrib-pin-hint"
            >
              {{ checkResultBySlug[row.slug].note }}
            </div>
          </td>
          <td>
            <span class="contrib-status" :class="statusClass(row.status)">{{ row.status }}</span>
          </td>
          <td class="text-end">
            <div class="dropdown">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded="false"
                :aria-label="`Actions for ${row.title}`"
              >
                Actions
              </button>
              <ul class="dropdown-menu dropdown-menu-end">
                <li v-if="row.update_available">
                  <button
                    class="dropdown-item"
                    type="button"
                    :disabled="previewingSlug === row.slug"
                    @click="openUpdate(row)"
                  >
                    {{ previewingSlug === row.slug ? 'Loading…' : `Review & pin ${row.latest_repo_ref}…` }}
                  </button>
                </li>
                <li v-if="row.update_available"><hr class="dropdown-divider" /></li>
                <li>
                  <button class="dropdown-item" type="button" @click="openManage(row)">Listing details…</button>
                </li>
                <li>
                  <button
                    class="dropdown-item"
                    type="button"
                    :disabled="resyncingSlug === row.slug"
                    @click="resyncMetadata(row)"
                  >
                    {{ resyncingSlug === row.slug ? 'Refreshing…' : 'Refresh metadata from GitHub' }}
                  </button>
                </li>
                <li v-if="row.repo_url">
                  <a class="dropdown-item" :href="row.repo_url" target="_blank" rel="noopener">Open repository</a>
                </li>
                <li><hr class="dropdown-divider" /></li>
                <li>
                  <button class="dropdown-item text-danger" type="button" @click="remove(row)">Remove listing</button>
                </li>
              </ul>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Add listing (new repo only) -->
    <div class="modal fade" tabindex="-1" ref="addModalEl" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add catalog listing</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="closeAdd"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted">
              Paste a public GitHub repo URL and fetch metadata at a tag. Slug and copy come from the repo; change them in git, then refresh.
            </p>
            <div class="row g-3">
              <div class="col-12">
                <label class="form-label">Repository URL</label>
                <div class="input-group">
                  <input v-model="form.repo_url" class="form-control font-monospace" placeholder="https://github.com/owner/repo" />
                  <button class="btn btn-outline-primary" type="button" :disabled="inspecting || !form.repo_url" @click="fetchRepoInfo">
                    {{ inspecting ? 'Fetching…' : 'Fetch repo info' }}
                  </button>
                </div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Git ref to inspect</label>
                <input v-model="form.repo_ref" class="form-control font-monospace" placeholder="v0.1.0" />
                <div class="form-text">Prefer a release tag, not <code>main</code>.</div>
              </div>
              <div class="col-md-6">
                <label class="form-label">Visibility</label>
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
                  Paired sample-data repo (ADR-016): <strong>{{ pairedDataset.title || pairedDataset.slug }}</strong>
                  (<code>{{ pairedDataset.slug }}</code>).
                </div>
              </div>

              <template v-if="form.slug">
                <div class="col-12">
                  <dl class="row small mb-0 contrib-preview-dl">
                    <dt class="col-sm-3">Slug</dt>
                    <dd class="col-sm-9 font-monospace">{{ form.slug }}</dd>
                    <dt class="col-sm-3">Title</dt>
                    <dd class="col-sm-9">{{ form.title }}</dd>
                    <dt class="col-sm-3">Publisher</dt>
                    <dd class="col-sm-9">{{ form.publisher }}</dd>
                    <dt class="col-sm-3">Summary</dt>
                    <dd class="col-sm-9">{{ form.summary }}</dd>
                    <dt class="col-sm-3">Kinds</dt>
                    <dd class="col-sm-9">{{ (form.kinds || []).join(', ') }}</dd>
                    <dt class="col-sm-3">Language</dt>
                    <dd class="col-sm-9">{{ form.language }}</dd>
                  </dl>
                </div>
              </template>
            </div>
            <div v-if="addError" class="alert alert-danger py-2 small mt-3 mb-0">{{ addError }}</div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" type="button" @click="closeAdd">Cancel</button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="saving || !form.slug" @click="saveNew">
              {{ saving ? 'Saving…' : 'Add to catalog' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Manage existing listing (read-only metadata + visibility) -->
    <div class="modal fade" tabindex="-1" ref="manageModalEl" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content" v-if="manageRow">
          <div class="modal-header">
            <h5 class="modal-title">{{ manageRow.title }}</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="closeManage"></button>
          </div>
          <div class="modal-body">
            <p class="small text-muted">
              Listing copy and kinds are read from
              <a v-if="manageRow.repo_url" :href="manageRow.repo_url" target="_blank" rel="noopener">the git repo</a>
              at the pinned ref. Edit the repo, tag a release, then refresh metadata or pin the release here.
            </p>
            <dl class="row small mb-3">
              <dt class="col-sm-3">Slug</dt>
              <dd class="col-sm-9 font-monospace">{{ manageRow.slug }}</dd>
              <dt class="col-sm-3">Publisher</dt>
              <dd class="col-sm-9">{{ manageRow.publisher }}</dd>
              <dt class="col-sm-3">Summary</dt>
              <dd class="col-sm-9">{{ manageRow.summary }}</dd>
              <dt class="col-sm-3">Kinds</dt>
              <dd class="col-sm-9">{{ (manageRow.kinds && manageRow.kinds.length ? manageRow.kinds : [manageRow.kind]).join(', ') }}</dd>
              <dt class="col-sm-3">Language</dt>
              <dd class="col-sm-9">{{ manageRow.language }}</dd>
              <dt class="col-sm-3">Pinned</dt>
              <dd class="col-sm-9 font-monospace">{{ pinnedLabel(manageRow) }} <span class="text-muted">({{ manageRow.repo_ref || 'main' }})</span></dd>
            </dl>
            <div v-if="manageRow.update_available" class="alert alert-warning py-2 small">
              GitHub has <code>{{ manageRow.latest_repo_ref }}</code>.
              <button class="btn btn-link btn-sm p-0 align-baseline" type="button" @click="openUpdateFromManage">Review & pin</button>
            </div>
            <div class="mb-0">
              <label class="form-label" for="manageStatus">Status</label>
              <select id="manageStatus" v-model="manageStatus" class="form-select form-select-sm">
                <option value="draft">draft — hidden from researchers</option>
                <option value="published">published</option>
                <option value="deprecated">deprecated</option>
              </select>
            </div>
            <div v-if="manageError" class="alert alert-danger py-2 small mt-3 mb-0">{{ manageError }}</div>
          </div>
          <div class="modal-footer justify-content-between">
            <button
              class="btn btn-outline-secondary btn-sm"
              type="button"
              :disabled="resyncingSlug === manageRow.slug"
              @click="resyncMetadata(manageRow)"
            >
              {{ resyncingSlug === manageRow.slug ? 'Refreshing…' : 'Refresh metadata from GitHub' }}
            </button>
            <div class="d-flex gap-2">
              <button class="btn btn-secondary btn-sm" type="button" @click="closeManage">Close</button>
              <button class="btn btn-primary btn-sm" type="button" :disabled="savingManage" @click="saveManageStatus">
                {{ savingManage ? 'Saving…' : 'Save status' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" tabindex="-1" ref="updateModalEl" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <div class="me-auto">
              <h5 class="modal-title mb-0">Choose GitHub release</h5>
              <div v-if="updatePreview?.slug" class="small text-muted font-monospace">{{ updatePreview.slug }}</div>
            </div>
            <button type="button" class="btn-close" aria-label="Close" @click="closeUpdate"></button>
          </div>
          <div class="modal-body">
            <div v-if="updateError" class="alert alert-danger py-2 small">{{ updateError }}</div>
            <template v-if="updatePreview">
              <div class="small mb-3">
                <p class="mb-2">
                  This listing points at a fixed GitHub ref for <strong>Run</strong> and for the README shown in the app.
                  New commits on the repo are <em>not</em> picked up until you choose a release here.
                </p>
                <dl class="row mb-0 contrib-pin-dl">
                  <dt class="col-sm-4">Using now</dt>
                  <dd class="col-sm-8 font-monospace">
                    {{ pinRefLabel(updatePreview.from.repo_ref) }}
                    <span v-if="pinRefIsMovingBranch(updatePreview.from.repo_ref)" class="contrib-pin-note">
                      — branch; can shift when publishers push
                    </span>
                  </dd>
                  <dt class="col-sm-4">After you confirm</dt>
                  <dd class="col-sm-8 font-monospace mb-0">
                    {{ pinRefLabel(updatePreview.to.repo_ref) }}
                  </dd>
                </dl>
              </div>
              <div v-if="updatePreview.release" class="mb-3">
                <div class="fw-semibold small mb-1">Release notes</div>
                <pre
                  v-if="String(updatePreview.release.body || '').trim()"
                  class="small rounded p-2 mb-2 release-notes"
                >{{ updatePreview.release.body }}</pre>
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
                Update that listing separately if this release needs new sample files.
              </div>
            </template>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-sm" type="button" @click="closeUpdate">Cancel</button>
            <button class="btn btn-primary btn-sm" type="button" :disabled="pinning || !updatePreview" @click="confirmUpdate">
              {{ pinning ? 'Saving…' : 'Use this release' }}
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

const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const addError = ref('');
const form = reactive(emptyForm());
const inspecting = ref(false);
const inspectError = ref('');
const manifestValidation = ref(null);
const manifestChecked = ref(false);
const pairedDataset = ref(null);
const checkingUpdates = ref(false);
const checkSummary = ref('');
/** Per-listing error/note from the last Check for updates run (API `results[]`). */
const checkResultBySlug = ref({});
const previewingSlug = ref('');
const pinning = ref(false);
const updatePreview = ref(null);
const updateError = ref('');
const updateModalEl = ref(null);
const addModalEl = ref(null);
const manageModalEl = ref(null);
const manageRow = ref(null);
const manageStatus = ref('published');
const manageError = ref('');
const savingManage = ref(false);
const resyncingSlug = ref('');
let updateModal = null;
let addModal = null;
let manageModal = null;

const kindFilter = ref('');
const languageFilter = ref('');

const kindFilterOptions = [
  { id: '', label: 'All kinds' },
  ...CONTRIBUTION_KIND_CHOICES.map((k) => ({
    id: k.id,
    label: k.id === 'postgres_extension' ? 'Postgres extension' : k.id,
  })),
];

const languageFilterOptions = [
  { id: '', label: 'All languages' },
  { id: 'python', label: 'python' },
  { id: 'r', label: 'r' },
  { id: 'sql', label: 'sql' },
  { id: 'csv', label: 'csv' },
  { id: 'json', label: 'json' },
  { id: 'other', label: 'other' },
];

const availableUpdates = computed(() => items.value.filter((row) => row.update_available));

const filteredItems = computed(() => {
  const kind = kindFilter.value;
  const lang = languageFilter.value;
  return items.value.filter((row) => {
    if (kind) {
      const kinds = contributionKinds(row);
      if (!kinds.includes(kind)) return false;
    }
    if (lang && String(row.language || '').toLowerCase() !== lang) return false;
    return true;
  });
});

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

function pinRefLabel(ref) {
  return String(ref || '').trim() || 'main';
}

function pinRefIsMovingBranch(ref) {
  const r = pinRefLabel(ref).toLowerCase();
  return r === 'main' || r === 'master' || r === 'develop' || r === 'dev';
}

function statusClass(status) {
  if (status === 'published') return 'contrib-status--published';
  if (status === 'deprecated') return 'contrib-status--deprecated';
  return 'contrib-status--draft';
}

function resetInspectState() {
  inspectError.value = '';
  manifestValidation.value = null;
  manifestChecked.value = false;
  pairedDataset.value = null;
}

function openAdd() {
  Object.assign(form, emptyForm());
  resetInspectState();
  addError.value = '';
  addModal?.show();
}

function closeAdd() {
  addModal?.hide();
}

function openManage(row) {
  manageRow.value = row;
  manageStatus.value = row.status || 'published';
  manageError.value = '';
  manageModal?.show();
}

function closeManage() {
  manageModal?.hide();
}

function openUpdateFromManage() {
  const row = manageRow.value;
  if (!row) return;
  closeManage();
  openUpdate(row);
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
    const { suggested, validation, pairedDataset: paired } = res.data;
    Object.assign(form, suggested);
    form.kinds = contributionKinds(form);
    if (suggested?.kind && form.kinds.includes(suggested.kind)) {
      form.kind = suggested.kind;
    }
    if (validation) {
      manifestChecked.value = true;
      manifestValidation.value = validation;
    }
    pairedDataset.value = paired || null;
    if (suggested?.repo_ref) form.repo_ref = suggested.repo_ref;
    if (suggested?.version) form.version = suggested.version;
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
  checkResultBySlug.value = {};
  try {
    const res = await api.post('/contributions/check-updates', {}, authHeaders());
    items.value = Array.isArray(res.data?.rows) ? res.data.rows : items.value;
    const results = Array.isArray(res.data?.results) ? res.data.results : [];
    checkResultBySlug.value = Object.fromEntries(
      results.map((r) => [r.slug, { error: r.error || null, note: r.note || null }])
    );
    const updates = Number(res.data?.updates) || 0;
    const without = Number(res.data?.without_releases) || 0;
    const failed = results.filter((r) => r.error).length;
    const parts = [];
    if (updates) parts.push(`${updates} newer release${updates === 1 ? '' : 's'} than current pins.`);
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
      if (manageRow.value?.slug === next.slug) manageRow.value = next;
      const { [next.slug]: _dropped, ...restCheck } = checkResultBySlug.value;
      checkResultBySlug.value = restCheck;
      if (checkSummary.value) {
        const updates = items.value.filter((r) => r.update_available).length;
        const failed = Object.values(checkResultBySlug.value).filter((r) => r?.error).length;
        const parts = [];
        if (updates) parts.push(`${updates} newer release${updates === 1 ? '' : 's'} than current pins.`);
        else parts.push('No newer GitHub releases than the current pins.');
        const without = items.value.filter((row) => {
          const cr = checkResultBySlug.value[row.slug];
          if (cr?.error) return false;
          return !String(row.latest_repo_ref || '').trim();
        }).length;
        if (without) {
          parts.push(`${without} listing${without === 1 ? '' : 's'} still have no releases (often still on main).`);
        }
        if (failed) parts.push(`${failed} could not be checked.`);
        checkSummary.value = parts.join(' ');
      }
    }
    closeUpdate();
  } catch (e) {
    updateError.value = e.response?.data?.error || e.message || 'Failed to pin this release.';
  } finally {
    pinning.value = false;
  }
}

async function saveNew() {
  saving.value = true;
  addError.value = '';
  try {
    const kinds = form.kinds || [];
    const kind = (form.kind && kinds.includes(form.kind)) ? form.kind : (kinds[0] || form.kind);
    const payload = { ...form, kinds, kind };
    await api.post('/contributions', payload, authHeaders());
    closeAdd();
    await load();
  } catch (e) {
    const apiError = e.response?.data?.error;
    if (e.response?.status === 409) {
      addError.value = apiError
        ? `${apiError} Open Listing details for that slug and refresh from GitHub.`
        : 'That slug is already in the catalog.';
    } else {
      addError.value = apiError || e.message || 'Save failed.';
    }
  } finally {
    saving.value = false;
  }
}

async function saveManageStatus() {
  if (!manageRow.value) return;
  savingManage.value = true;
  manageError.value = '';
  try {
    const res = await api.patch(
      `/contributions/${encodeURIComponent(manageRow.value.slug)}`,
      { status: manageStatus.value },
      authHeaders()
    );
    const next = res.data;
    items.value = items.value.map((row) => (row.slug === next.slug ? next : row));
    manageRow.value = next;
  } catch (e) {
    manageError.value = e.response?.data?.error || e.message || 'Save failed.';
  } finally {
    savingManage.value = false;
  }
}

async function resyncMetadata(row) {
  if (!row?.repo_url) return;
  resyncingSlug.value = row.slug;
  manageError.value = '';
  errorMessage.value = '';
  try {
    const res = await api.post(
      '/contributions/inspect',
      { repo_url: row.repo_url, repo_ref: row.repo_ref || 'main' },
      authHeaders()
    );
    const suggested = res.data?.suggested || {};
    const kinds = contributionKinds(suggested);
    const kind = (suggested.kind && kinds.includes(suggested.kind)) ? suggested.kind : (kinds[0] || row.kind);
    const patchRes = await api.patch(
      `/contributions/${encodeURIComponent(row.slug)}`,
      {
        title: suggested.title ?? row.title,
        summary: suggested.summary ?? row.summary,
        publisher: suggested.publisher ?? row.publisher,
        kinds,
        kind,
        language: suggested.language ?? row.language,
        docs_path: suggested.docs_path ?? row.docs_path,
        repo_url: row.repo_url,
        repo_ref: row.repo_ref,
        version: row.version,
        status: manageRow.value?.slug === row.slug ? manageStatus.value : row.status,
      },
      authHeaders()
    );
    const next = patchRes.data;
    items.value = items.value.map((r) => (r.slug === next.slug ? next : r));
    if (manageRow.value?.slug === next.slug) manageRow.value = next;
  } catch (e) {
    const msg = e.response?.data?.error || e.message || 'Refresh failed.';
    if (manageRow.value?.slug === row.slug) manageError.value = msg;
    else errorMessage.value = msg;
  } finally {
    resyncingSlug.value = '';
  }
}

async function remove(row) {
  if (!window.confirm(`Remove catalog listing ${row.slug}? This does not delete the git repo.`)) return;
  try {
    await api.delete(`/contributions/${encodeURIComponent(row.slug)}`, authHeaders());
    if (manageRow.value?.slug === row.slug) closeManage();
    await load();
  } catch (e) {
    errorMessage.value = e.response?.data?.error || e.message || 'Remove failed.';
  }
}

onMounted(() => {
  load();
  if (updateModalEl.value) {
    updateModal = new Modal(updateModalEl.value);
    updateModalEl.value.addEventListener('hidden.bs.modal', () => {
      updatePreview.value = null;
      updateError.value = '';
    });
  }
  if (addModalEl.value) {
    addModal = new Modal(addModalEl.value);
    addModalEl.value.addEventListener('hidden.bs.modal', () => {
      addError.value = '';
    });
  }
  if (manageModalEl.value) {
    manageModal = new Modal(manageModalEl.value);
    manageModalEl.value.addEventListener('hidden.bs.modal', () => {
      manageRow.value = null;
      manageError.value = '';
    });
  }
});

onBeforeUnmount(() => {
  updateModal?.dispose();
  addModal?.dispose();
  manageModal?.dispose();
  updateModal = null;
  addModal = null;
  manageModal = null;
});
</script>

<style scoped>
.contrib-table td:last-child {
  white-space: nowrap;
}
.contrib-muted {
  color: var(--bs-secondary-color);
}
.contrib-updates-panel {
  background: var(--bs-tertiary-bg);
  border-color: var(--bs-border-color);
}
.contrib-updates-count {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: var(--bs-secondary-bg);
  color: var(--bs-secondary-color);
}
.contrib-updates-list .contrib-update-item + .contrib-update-item {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--bs-border-color);
}
.contrib-pin-hint {
  margin-top: 0.15rem;
  font-family: var(--bs-font-monospace);
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
}
.contrib-status {
  font-size: 0.8125rem;
  text-transform: capitalize;
  color: var(--bs-secondary-color);
}
.contrib-status--published {
  color: var(--bs-body-color);
}
.contrib-status--deprecated {
  color: var(--bs-secondary-color);
  font-style: italic;
}
.contrib-preview-dl dt,
.contrib-pin-dl dt {
  color: var(--bs-secondary-color);
  font-weight: 500;
}
.contrib-pin-note {
  font-family: var(--bs-font-sans-serif);
  font-size: 0.8125rem;
  color: var(--bs-secondary-color);
}
.release-notes {
  max-height: 12rem;
  overflow: auto;
  white-space: pre-wrap;
  background: var(--bs-secondary-bg);
  color: var(--bs-body-color);
  border: 1px solid var(--bs-border-color);
}
</style>
