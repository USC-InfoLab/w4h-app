<template>
  <main class="container-fluid" v-if="loaded">
    <nav v-if="!embedded" aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/datasets">Datasets</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Edit Dataset</li>
      </ol>
    </nav>

    <div class="row g-3">
      <div class="col-12 col-lg-7">
        <div class="card p-3">
          <h5 class="card-title mb-3">Dataset</h5>
          <p v-if="form.status === 'archived'" class="alert alert-secondary py-2 small mb-3">
            This catalog row is <strong>archived</strong>. It is hidden from projects and link lists.
            Tables and metadata are kept. Restore it to link or ingest again.
          </p>
          <p class="small text-muted mb-3">
            A dataset is a catalog of related tables (subjects, wearables, demographics, …), not a single table.
          </p>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model.trim="form.name" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea v-model.trim="form.description" class="form-control" rows="3" placeholder="Optional"></textarea>
          </div>

          <div class="mb-3">
            <div class="form-check form-switch">
              <input id="discoverable-edit-switch" v-model="form.discoverable" class="form-check-input" type="checkbox"
                role="switch" />
              <label class="form-check-label" for="discoverable-edit-switch">
                Discoverable to other teams
              </label>
            </div>
            <div class="form-text">
              When on, other teams can see name, description, and owning team under
              <strong>Others</strong>. Does not grant access — share still required to link or query.
            </div>
          </div>

          <div v-if="canChangeTeam" class="mb-3">
            <div class="form-check">
              <input id="sample-ro" v-model="form.read_only" class="form-check-input" type="checkbox" />
              <label class="form-check-label" for="sample-ro">
                Platform sample (read-only)
              </label>
            </div>
            <div class="form-text">
              Super admin seeds these tables. Teams may query them on a demonstration project.
              They must not re-ingest. Origin shown to users:
            </div>
            <input v-if="form.read_only" v-model.trim="form.origin" class="form-control form-control-sm mt-2"
              placeholder="W4H Samples" />
          </div>

          <div v-if="message" class="alert" :class="ok ? 'alert-success' : 'alert-danger'">
            {{ message }}
          </div>

          <div class="d-flex justify-content-end">
            <button class="btn btn-primary" :disabled="!canSave" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" />
              Save dataset
            </button>
          </div>
        </div>

        <div class="card p-3 mt-3">
          <h5 class="card-title mb-3">Details</h5>

          <div class="mb-3">
            <div class="form-label mb-0">Slug</div>
            <div class="font-monospace">{{ form.id || '—' }}</div>
            <div class="form-text">Stable identifier used in links and APIs. Set at creation; cannot be changed.</div>
          </div>

          <div class="mb-3">
            <div class="form-label mb-0">Owning team</div>
            <select v-if="canChangeTeam" v-model="form.team_id" class="form-select mt-1">
              <option value="">— none —</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select>
            <div v-else>{{ teamLabel || '—' }}</div>
            <div class="form-text">
              Every dataset has one owning team (set on create
              <template v-if="canChangeTeam">; only Super admins can reassign it</template>).
              Other teams can use it only after an explicit share; they never become co-owners.
            </div>
          </div>

          <div class="mb-0">
            <div class="form-label mb-0">Linked projects</div>
            <div v-if="!linkedProjects.length" class="small text-muted mt-1">
              None yet.
            </div>
            <ul v-else class="list-unstyled mb-0 small mt-1">
              <li v-for="p in linkedProjects" :key="p.id || p.name">
                <router-link v-if="p.id" :to="{ name: 'adminProjectsEdit', params: { id: p.id } }">
                  {{ p.name }}
                </router-link>
                <span v-else>{{ p.name }}</span>
              </li>
            </ul>
            <div class="form-text">
              Datasets are linked to projects from the project’s
              <strong>Linked datasets</strong> panel — not from this page.
            </div>
          </div>
        </div>

        <div id="shares" class="card p-3 mt-3">
          <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h5 class="card-title mb-0">Shares</h5>
            <router-link class="ms-auto small" :to="{ name: 'adminDatasetsShares' }">
              All shares
            </router-link>
          </div>

          <p class="small text-muted mb-3">
            Share with <strong>another team</strong> so they can link this dataset into their projects.
            Same-team projects do not need a share — link the dataset from the project’s
            <strong>Linked datasets</strong> panel. Sharing does not open your projects.
          </p>

          <template v-if="canShare">
            <div class="row g-2 align-items-end mb-3">
              <div class="col-12 col-md-7">
                <label class="form-label">Share with team</label>
                <select v-model="shareForm.target_team_id" class="form-select">
                  <option value="">Select team…</option>
                  <option v-for="t in peerTeams" :key="t.id" :value="t.id">
                    {{ t.name }}
                  </option>
                </select>
                <div class="form-text">
                  Includes other teams you belong to. Cannot share with the owning team (use project linking instead).
                </div>
              </div>
              <div class="col-6 col-md-3">
                <label class="form-label">Access</label>
                <select v-model="shareForm.access_type" class="form-select">
                  <option value="read">read</option>
                  <option value="read_write">read_write</option>
                </select>
              </div>
              <div class="col-6 col-md-2">
                <button type="button" class="btn btn-outline-primary w-100"
                  :disabled="shareBusy || !shareForm.target_team_id" @click="createShare">
                  Share
                </button>
              </div>
            </div>

            <div v-if="shareMessage" class="alert py-2" :class="shareOk ? 'alert-success' : 'alert-danger'">
              {{ shareMessage }}
            </div>

            <div v-if="!outboundShares.length" class="small text-muted">
              Not shared with any other team yet.
            </div>
            <ul v-else class="list-group list-group-flush">
              <li v-for="s in outboundShares" :key="s.id"
                class="list-group-item px-0 d-flex justify-content-between align-items-center gap-2">
                <div class="min-w-0 small">
                  <div class="fw-semibold text-truncate">
                    {{ s.target_team_name }}
                  </div>
                  <div class="text-muted">
                    {{ s.access_type }}
                    <template v-if="s.shared_at"> · {{ formatWhen(s.shared_at) }}</template>
                  </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-danger flex-shrink-0" :disabled="shareBusy"
                  @click="revokeShare(s)">
                  Revoke
                </button>
              </li>
            </ul>
          </template>
          <div v-else class="small text-muted">
            <template v-if="!form.team_id">
              Assign an owning team before sharing.
            </template>
            <template v-else>
              You can view this dataset via a share, but only the owning team’s admins can manage outbound shares.
            </template>
          </div>
        </div>

        <div v-if="canManageCatalog" class="card p-3 mt-3 border-secondary">
          <h5 class="card-title mb-2">Catalog row</h5>
          <p class="small text-muted mb-3">
            W4H never deletes dataset data. Archive retires a catalog entry you no longer need:
            it disappears from projects and <strong>Add existing</strong>, revokes outbound shares,
            and blocks new ingestion. You can restore it later from the archived list. When a dataset
            has no tables and you are the owner/admin, you can remove the catalog row outright instead.
          </p>
          <div v-if="archiveMessage" class="alert py-2" :class="archiveOk ? 'alert-success' : 'alert-danger'">
            {{ archiveMessage }}
          </div>
          <div v-if="deleteMessage" class="alert py-2" :class="deleteOk ? 'alert-success' : 'alert-danger'">
            {{ deleteMessage }}
          </div>
          <div class="d-flex flex-wrap gap-2">
            <button v-if="form.status !== 'archived' && !canDeleteCompletely" type="button"
              class="btn btn-outline-secondary" :disabled="archiveBusy || (form.read_only && !canChangeTeam)"
              @click="archiveDataset">
              <span v-if="archiveBusy" class="spinner-border spinner-border-sm me-2" />
              Archive dataset
            </button>
            <button v-else-if="form.status !== 'archived' && canDeleteCompletely" type="button"
              class="btn btn-outline-danger" :disabled="deleteBusy || archiveBusy" @click="deleteDatasetCompletely">
              <span v-if="deleteBusy" class="spinner-border spinner-border-sm me-2" />
              Delete dataset
            </button>
            <button v-else type="button" class="btn btn-outline-primary" :disabled="archiveBusy"
              @click="restoreDataset">
              <span v-if="archiveBusy" class="spinner-border spinner-border-sm me-2" />
              Restore dataset
            </button>
          </div>
          <div v-if="form.read_only && form.status !== 'archived' && !canChangeTeam" class="form-text mt-2">
            Platform sample datasets can only be archived by Super admin.
          </div>
        </div>
      </div>

      <dialog ref="confirmationDialogEl" class="border-0 rounded shadow-lg p-0"
        style="max-width: 32rem; width: min(90vw, 32rem);">
        <div class="p-4">
          <h5 class="mb-3">
            {{ pendingAction === 'delete' ? 'Confirm permanent delete' : pendingAction === 'archive' ? 'Confirm archive'
              :
            'Confirm restore' }}
          </h5>
          <p class="small text-muted mb-3">
            Type <strong>{{ form.name }}</strong> exactly and check the box below to continue.
          </p>
          <div class="mb-3">
            <label class="form-label">Dataset name</label>
            <input v-model.trim="confirmationName" class="form-control" placeholder="Type the dataset name" />
          </div>
          <div class="form-check mb-3">
            <input id="confirm-understand" v-model="confirmationUnderstood" class="form-check-input" type="checkbox" />
            <label class="form-check-label" for="confirm-understand">I understand</label>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button type="button" class="btn btn-outline-secondary" @click="cancelPendingAction">
              Cancel
            </button>
            <button type="button" class="btn btn-outline-danger"
              :disabled="deleteBusy || archiveBusy || !isConfirmationValid" @click="commitPendingAction">
              <span v-if="archiveBusy || deleteBusy" class="spinner-border spinner-border-sm me-2" />
              {{ pendingAction === 'delete' ? 'Delete dataset' : pendingAction === 'archive' ? 'Archive dataset' :
                'Restore
              dataset' }}
            </button>
          </div>
        </div>
      </dialog>

      <div class="col-12 col-lg-5">
        <div class="card p-3">
          <h5 class="card-title mb-3">Tables</h5>
          <p class="small text-muted mb-3">
            Tables in this dataset (e.g. subjects, wearables, demographics).
            Added by ingestion — not one row per device.
          </p>

          <div v-if="tables.length === 0" class="small text-muted mb-2">
            No tables yet. Load by adapting a notebook or CLI from Contributions.
          </div>
          <ul v-else class="list-group list-group-flush">
            <li v-for="t in tables" :key="t.name" class="list-group-item px-0">
              <div class="fw-semibold">{{ t.name }}</div>
              <small v-if="t.source_name" class="text-muted">{{ t.source_name }}</small>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';

const props = defineProps({
  // Overrides the route param — lets callers (e.g. a modal on the project
  // edit page) reuse this view's logic without a route navigation.
  id: { type: String, default: '' },
  embedded: { type: Boolean, default: false },
});

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const loaded = ref(false);
const saving = ref(false);
const message = ref('');
const ok = ref(false);
const teams = ref([]);
const tables = ref([]);
const teamName = ref('');
const linkedProjects = ref([]);
const outboundShares = ref([]);
const peerTeams = ref([]);
const shareBusy = ref(false);
const shareMessage = ref('');
const shareOk = ref(false);
const canShareOwned = ref(false);
const archiveBusy = ref(false);
const archiveMessage = ref('');
const archiveOk = ref(false);
const deleteBusy = ref(false);
const deleteMessage = ref('');
const deleteOk = ref(false);
const pendingAction = ref(null);
const confirmationName = ref('');
const confirmationUnderstood = ref(false);
const confirmationDialogEl = ref(null);

const isConfirmationValid = computed(() => {
  return confirmationName.value.trim() === (form.name || '').trim() && confirmationUnderstood.value;
});

const shareForm = reactive({
  target_team_id: '',
  access_type: 'read',
});

const form = reactive({
  id: '',
  team_id: '',
  name: '',
  description: '',
  discoverable: true,
  read_only: false,
  origin: '',
  status: 'active',
});

const savedSnapshot = ref(null);

const canChangeTeam = computed(() => isSuperAdmin(userStore.user?.role));
const teamLabel = computed(() => teamName.value || form.team_id || '—');
const canShare = computed(() => canShareOwned.value && !!form.team_id);
const canManageCatalog = computed(
  () => (canShareOwned.value || canChangeTeam.value) && !!form.team_id
);
const canDeleteCompletely = computed(() => !!form.id && tables.value.length === 0 && canManageCatalog.value);

function snapshotForm() {
  return {
    team_id: form.team_id || '',
    name: form.name || '',
    description: form.description || '',
    discoverable: !!form.discoverable,
    read_only: !!form.read_only,
    origin: form.origin || '',
  };
}

const dirty = computed(() => {
  if (!savedSnapshot.value) return false;
  return JSON.stringify(snapshotForm()) !== JSON.stringify(savedSnapshot.value);
});

const canSave = computed(() => dirty.value && !!form.name && !saving.value);

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function applyDataset(d) {
  form.id = d.id || '';
  form.team_id = d.team_id || '';
  form.name = d.name || '';
  form.description = d.description || '';
  form.discoverable = d.discoverable !== false;
  form.read_only = Boolean(d.read_only);
  form.origin = d.origin || '';
  form.status = d.status === 'archived' ? 'archived' : 'active';
  teamName.value = d.team_name || '';
  tables.value = Array.isArray(d.tables) ? d.tables : [];
  if (Array.isArray(d.projects) && d.projects.length) {
    linkedProjects.value = d.projects.map((p) => ({
      id: p.id || p.project_id || '',
      name: p.name,
    }));
  } else {
    const names = String(d.project_names || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    linkedProjects.value = names.map((name) => ({ id: '', name }));
  }
  savedSnapshot.value = snapshotForm();
}

async function loadShares() {
  if (!form.id || !canShare.value) {
    outboundShares.value = [];
    return;
  }
  const res = await api.get(`datasets/${encodeURIComponent(form.id)}/shares`, authHeaders());
  outboundShares.value = Array.isArray(res.data) ? res.data : [];
}

async function loadShareTargets() {
  if (!canShare.value) {
    peerTeams.value = [];
    return;
  }
  const res = await api.get('datasets/share-targets', authHeaders());
  const all = Array.isArray(res.data?.teams) ? res.data.teams : [];
  peerTeams.value = all.filter((t) => String(t.id) !== String(form.team_id));
}

async function createShare() {
  shareBusy.value = true;
  shareMessage.value = '';
  shareOk.value = false;
  try {
    await api.post(
      `datasets/${encodeURIComponent(form.id)}/shares`,
      {
        target_team_id: shareForm.target_team_id,
        access_type: shareForm.access_type,
      },
      authHeaders()
    );
    shareOk.value = true;
    shareMessage.value = 'Dataset shared.';
    shareForm.target_team_id = '';
    shareForm.access_type = 'read';
    await loadShares();
  } catch (error) {
    shareMessage.value = error.response?.data?.error || error.message || 'Failed to share dataset.';
  } finally {
    shareBusy.value = false;
  }
}

async function revokeShare(share) {
  if (!share?.id) return;
  if (!window.confirm(`Revoke share with ${share.target_team_name}?`)) return;
  shareBusy.value = true;
  shareMessage.value = '';
  try {
    await api.delete(`datasets/shares/${encodeURIComponent(share.id)}`, authHeaders());
    shareOk.value = true;
    shareMessage.value = 'Share revoked.';
    await loadShares();
  } catch (error) {
    shareOk.value = false;
    shareMessage.value = error.response?.data?.error || error.message || 'Failed to revoke share.';
  } finally {
    shareBusy.value = false;
  }
}

async function setDatasetStatus(nextStatus) {
  const verb = nextStatus === 'archived' ? 'archive' : 'restore';

  archiveBusy.value = true;
  archiveMessage.value = '';
  archiveOk.value = false;
  try {
    const res = await api.patch(
      `datasets/${encodeURIComponent(form.id)}`,
      { status: nextStatus },
      authHeaders()
    );
    applyDataset(res.data || {});
    archiveOk.value = true;
    archiveMessage.value =
      nextStatus === 'archived'
        ? 'Dataset archived. Find it under Datasets → Archived.'
        : 'Dataset restored.';
    pendingAction.value = null;
    confirmationName.value = '';
    confirmationUnderstood.value = false;
    if (canShare.value) {
      await loadShareTargets();
      await loadShares();
    }
  } catch (error) {
    archiveOk.value = false;
    archiveMessage.value =
      error.response?.data?.error || error.message || `Failed to ${verb} dataset.`;
  } finally {
    archiveBusy.value = false;
  }
}

function beginActionConfirmation(action) {
  pendingAction.value = action;
  confirmationName.value = '';
  confirmationUnderstood.value = false;
  if (confirmationDialogEl.value?.showModal) {
    confirmationDialogEl.value.showModal();
  }
}

function cancelPendingAction() {
  pendingAction.value = null;
  confirmationName.value = '';
  confirmationUnderstood.value = false;
  if (confirmationDialogEl.value?.close) {
    confirmationDialogEl.value.close();
  }
}

async function commitPendingAction() {
  if (!pendingAction.value) return;
  if (!isConfirmationValid.value) {
    deleteMessage.value = 'Type the dataset name exactly and confirm that you understand to continue.';
    deleteOk.value = false;
    archiveMessage.value = 'Type the dataset name exactly and confirm that you understand to continue.';
    archiveOk.value = false;
    return;
  }

  if (pendingAction.value === 'delete') {
    await deleteDatasetCompletely();
  } else if (pendingAction.value === 'archive') {
    await setDatasetStatus('archived');
  } else if (pendingAction.value === 'restore') {
    await setDatasetStatus('active');
  }

  if (confirmationDialogEl.value?.close) {
    confirmationDialogEl.value.close();
  }
}

function archiveDataset() {
  if (pendingAction.value === 'archive') {
    return commitPendingAction();
  }
  beginActionConfirmation('archive');
}

function restoreDataset() {
  if (pendingAction.value === 'restore') {
    return commitPendingAction();
  }
  beginActionConfirmation('restore');
}

async function deleteDatasetCompletely() {
  if (!form.id) return;
  if (pendingAction.value !== 'delete') {
    beginActionConfirmation('delete');
    return;
  }
  if (!isConfirmationValid.value) {
    deleteMessage.value = 'Type the dataset name exactly and confirm that you understand to continue.';
    deleteOk.value = false;
    return;
  }

  deleteBusy.value = true;
  deleteMessage.value = '';
  deleteOk.value = false;
  try {
    await api.delete(`datasets/${encodeURIComponent(form.id)}`, authHeaders());
    deleteOk.value = true;
    deleteMessage.value = 'Dataset deleted.';
    pendingAction.value = null;
    confirmationName.value = '';
    confirmationUnderstood.value = false;
    if (confirmationDialogEl.value?.close) {
      confirmationDialogEl.value.close();
    }
    await router.push('/admin/datasets');
  } catch (error) {
    deleteOk.value = false;
    deleteMessage.value = error.response?.data?.error || error.message || 'Failed to delete dataset.';
  } finally {
    deleteBusy.value = false;
  }
}

onMounted(async () => {
  try {
    const id = props.id || (Array.isArray(route.params.id) ? route.params.id[0] : route.params.id);
    const requests = [api.get(`datasets/${encodeURIComponent(id || '')}`, {
      ...authHeaders(),
      params: { catalog: 1 }
    })];
    if (isSuperAdmin(userStore.user?.role)) {
      requests.push(api.get('teams', authHeaders()));
    }
    const [datasetRes, teamsRes] = await Promise.all(requests);
    if (teamsRes) teams.value = Array.isArray(teamsRes.data) ? teamsRes.data : [];
    applyDataset(datasetRes.data || {});

    // Probe share management (403 for recipients of inbound shares).
    if (form.team_id && form.id) {
      try {
        const sharesRes = await api.get(
          `datasets/${encodeURIComponent(form.id)}/shares`,
          authHeaders()
        );
        canShareOwned.value = true;
        outboundShares.value = Array.isArray(sharesRes.data) ? sharesRes.data : [];
        await loadShareTargets();
      } catch {
        canShareOwned.value = false;
      }
    }
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to load dataset.';
    ok.value = false;
  } finally {
    loaded.value = true;
  }
});

async function save() {
  saving.value = true;
  message.value = '';
  ok.value = false;
  try {
    const payload = {
      name: form.name,
      description: form.description || null,
      discoverable: form.discoverable,
    };
    if (canChangeTeam.value) {
      payload.team_id = form.team_id || null;
      payload.read_only = !!form.read_only;
      payload.origin = form.read_only ? (form.origin || 'W4H Samples') : null;
    }
    const res = await api.patch(
      `datasets/${encodeURIComponent(form.id)}`,
      payload,
      authHeaders()
    );
    applyDataset(res.data || {});
    ok.value = true;
    message.value = 'Dataset updated.';
    if (canShare.value) {
      await loadShareTargets();
      await loadShares();
    }
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to save dataset.';
  } finally {
    saving.value = false;
  }
}
</script>
