<template>
  <main class="container-fluid" v-if="loaded">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/projects">Projects</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Edit Project</li>
      </ol>
    </nav>

    <div class="row g-3">
      <div class="col-12 col-lg-7">
        <div class="card p-3">
          <h5 class="card-title mb-3">Project details</h5>

          <div class="mb-3">
            <label class="form-label">Project ID</label>
            <input v-model="form.id" class="form-control" disabled />
            <div class="form-text">Project ID cannot be changed.</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Owning team</label>
            <select
              v-if="canChangeTeam"
              v-model="form.team_id"
              class="form-select"
            >
              <option value="">— none —</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">
                {{ t.name }}{{ t.slug ? ` (${t.slug})` : '' }}
              </option>
            </select>
            <input
              v-else
              :value="teamLabel"
              class="form-control"
              disabled
            />
            <div class="form-text">
              Owning team is set on create. Only Super admins can reassign it.
            </div>
          </div>

          <div v-if="createdByLabel" class="mb-3">
            <label class="form-label">Created by</label>
            <input :value="createdByLabel" class="form-control" disabled />
          </div>

          <div v-if="createdAtLabel" class="mb-3">
            <label class="form-label">Created</label>
            <input :value="createdAtLabel" class="form-control" disabled />
          </div>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model.trim="form.name" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea v-model.trim="form.description" class="form-control" rows="3" placeholder="Optional"></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Status</label>
            <select v-model="form.status" class="form-select" style="max-width: 16rem;">
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </div>

          <div class="d-flex justify-content-end">
            <button class="btn btn-primary" :disabled="savingProject || !form.name" @click="saveProject">
              <span v-if="savingProject" class="spinner-border spinner-border-sm me-2" />
              Save project
            </button>
          </div>
        </div>

        <div class="card p-3 mt-3">
          <h5 class="card-title mb-3">Linked datasets</h5>
          <div v-if="!form.team_id" class="alert alert-warning small mb-0">
            Set an owning team before linking datasets.
          </div>
          <template v-else>
            <div v-if="linkedDatasetRows.length === 0" class="small text-muted mb-2">
              No datasets linked yet.
            </div>
            <div
              v-for="row in linkedDatasetRows"
              :key="row.id"
              class="d-flex align-items-center justify-content-between gap-2 mb-2"
            >
              <div class="small">
                <strong>{{ row.name }}</strong>
                <span class="text-muted ms-1">{{ row.id }}</span>
              </div>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                :disabled="savingDatasets"
                @click="unlinkDataset(row.id)"
              >
                Remove
              </button>
            </div>
            <div class="row g-2 align-items-end mt-2">
              <div class="col">
                <label class="form-label small mb-0">Add dataset</label>
                <select v-model="datasetToAdd" class="form-select form-select-sm" :disabled="savingDatasets">
                  <option value="">Select dataset…</option>
                  <option v-for="d in addableDatasets" :key="d.id" :value="String(d.id)">
                    {{ d.name || d.id }}
                  </option>
                </select>
              </div>
              <div class="col-auto">
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  :disabled="savingDatasets || !datasetToAdd"
                  @click="linkDataset"
                >
                  Add
                </button>
              </div>
            </div>
            <p v-if="availableDatasets.length === 0" class="small text-muted mb-0 mt-2">
              No datasets in this team yet. Create one under Datasets.
            </p>
          </template>
        </div>
      </div>

      <div class="col-12 col-lg-5">
        <div class="card p-3">
          <h5 class="card-title mb-3">Members</h5>
          <p class="small text-muted mb-3">
            Members must belong to the owning team. Roles are owner, editor, or viewer.
            Platform Super admins who provision projects appear under <strong>Created by</strong>, not here.
          </p>

          <div v-if="memberRows.length === 0" class="small text-muted mb-2">No members yet.</div>
          <div v-for="row in memberRows" :key="row.user_id" class="row g-2 align-items-end mb-2">
            <div class="col-7">
              <label class="form-label small mb-0">Email</label>
              <input :value="row.email" type="email" class="form-control form-control-sm" disabled />
            </div>
            <div class="col-3">
              <label class="form-label small mb-0">Role</label>
              <select
                class="form-select form-select-sm"
                :value="row.role"
                :disabled="savingMembers"
                @change="changeMemberRole(row, $event.target.value)"
              >
                <option value="owner">owner</option>
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>
            </div>
            <div class="col-2">
              <button type="button" class="btn btn-sm btn-outline-danger w-100" :disabled="savingMembers" @click="deleteMember(row)">
                Remove
              </button>
            </div>
          </div>

          <div class="border-top pt-3 mt-2">
            <div class="row g-2 align-items-end">
              <div class="col-7">
                <label class="form-label small mb-0">Add team member</label>
                <select v-model="newMember.user_id" class="form-select form-select-sm">
                  <option value="">Select user…</option>
                  <option
                    v-for="u in addableMembers"
                    :key="u.user_id"
                    :value="String(u.user_id)"
                  >
                    {{ u.name ? `${u.name} (${u.email})` : u.email }}
                  </option>
                </select>
              </div>
              <div class="col-3">
                <label class="form-label small mb-0">Role</label>
                <select v-model="newMember.role" class="form-select form-select-sm">
                  <option value="owner">owner</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <div class="col-2">
                <button
                  type="button"
                  class="btn btn-sm btn-primary w-100"
                  :disabled="savingMembers || !newMember.user_id"
                  @click="addMember"
                >
                  Add
                </button>
              </div>
            </div>
            <p v-if="form.team_id && !eligibleMembers.length" class="small text-muted mt-2 mb-0">
              No eligible users on this team yet. Invite project users from Users.
            </p>
          </div>
        </div>
      </div>
    </div>

    <div v-if="message" class="alert mt-3" :class="ok ? 'alert-success' : 'alert-danger'">
      {{ message }}
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';

const route = useRoute();
const userStore = useUserStore();

const loaded = ref(false);
const savingProject = ref(false);
const savingMembers = ref(false);
const savingDatasets = ref(false);
const message = ref('');
const ok = ref(false);

const form = reactive({
  id: '',
  team_id: '',
  name: '',
  description: '',
  status: 'active'
});

const teams = ref([]);
const memberRows = ref([]);
const eligibleMembers = ref([]);
const availableDatasets = ref([]);
const linkedDatasetIds = ref([]);
const datasetToAdd = ref('');
const createdByLabel = ref('');
const createdAtLabel = ref('');
const teamName = ref('');
const teamSlug = ref('');

const newMember = reactive({
  user_id: '',
  role: 'viewer'
});

const canChangeTeam = computed(() => isSuperAdmin(userStore.user?.role));

const teamLabel = computed(() => {
  if (teamName.value) {
    return teamSlug.value ? `${teamName.value} (${teamSlug.value})` : teamName.value;
  }
  return form.team_id || '—';
});

const addableMembers = computed(() => {
  const existing = new Set(memberRows.value.map((m) => String(m.user_id)));
  return (eligibleMembers.value || []).filter((u) => !existing.has(String(u.user_id)));
});

const linkedDatasetRows = computed(() => {
  const byId = new Map((availableDatasets.value || []).map((d) => [String(d.id), d]));
  return (linkedDatasetIds.value || []).map((id) => {
    const meta = byId.get(String(id));
    return {
      id: String(id),
      name: meta?.name || id
    };
  });
});

const addableDatasets = computed(() => {
  const linked = new Set((linkedDatasetIds.value || []).map(String));
  return (availableDatasets.value || []).filter((d) => !linked.has(String(d.id)));
});

function setMessage(success, text) {
  ok.value = success;
  message.value = text;
}

function formatProjectDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function linkDataset() {
  const id = String(datasetToAdd.value || '');
  if (!id || linkedDatasetIds.value.includes(id)) return;
  linkedDatasetIds.value.push(id);
  datasetToAdd.value = '';
  persistLinkedDatasets('Dataset linked.');
}

function unlinkDataset(datasetId) {
  const id = String(datasetId || '');
  linkedDatasetIds.value = linkedDatasetIds.value.filter((x) => x !== id);
  persistLinkedDatasets('Dataset removed.');
}

async function persistLinkedDatasets(successMessage) {
  if (!form.id) return;
  savingDatasets.value = true;
  setMessage(false, '');
  try {
    await api.put(
      `projects/${encodeURIComponent(form.id)}/datasets`,
      {
        datasets: (linkedDatasetIds.value || []).map((dataset_id) => ({
          dataset_id,
          access_type: 'read'
        }))
      },
      authHeaders()
    );
    setMessage(true, successMessage);
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to update linked datasets.');
    // Reload to resync if persist failed
    try {
      const refreshed = await api.get(`projects/${encodeURIComponent(form.id)}`, authHeaders());
      mapOverviewToForm(refreshed.data);
    } catch {
      /* ignore */
    }
  } finally {
    savingDatasets.value = false;
  }
}

function mapOverviewToForm(data) {
  const p = data?.project || {};
  form.id = p.id || '';
  form.team_id = p.team_id || '';
  form.name = p.name || '';
  form.description = p.description || '';
  form.status = p.status || 'active';
  teamName.value = p.team_name || '';
  teamSlug.value = p.team_slug || '';

  const creatorName = p.created_by_name || '';
  const creatorEmail = p.created_by_email || '';
  if (creatorName && creatorEmail) {
    createdByLabel.value = `${creatorName} (${creatorEmail})`;
  } else {
    createdByLabel.value = creatorName || creatorEmail || '';
  }
  createdAtLabel.value = formatProjectDate(p.created_at);

  linkedDatasetIds.value = Array.isArray(data?.datasets)
    ? data.datasets.map((d) => String(d.dataset_id || d.id || '')).filter(Boolean)
    : [];

  availableDatasets.value = Array.isArray(data?.linkable_datasets) ? data.linkable_datasets : [];
  eligibleMembers.value = Array.isArray(data?.eligible_members) ? data.eligible_members : [];

  memberRows.value = Array.isArray(data?.members)
    ? data.members.map((m) => ({
        user_id: m.user_id,
        email: m.email || '',
        role: ['owner', 'editor', 'viewer'].includes(m.role) ? m.role : 'viewer'
      }))
    : [];
}

onMounted(async () => {
  try {
    const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
    const requests = [api.get(`projects/${encodeURIComponent(id || '')}`, authHeaders())];
    if (isSuperAdmin(userStore.user?.role)) {
      requests.push(api.get('teams', authHeaders()));
    }
    const [projectRes, teamsRes] = await Promise.all(requests);
    if (teamsRes) {
      teams.value = Array.isArray(teamsRes.data) ? teamsRes.data : [];
    }
    mapOverviewToForm(projectRes.data);
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to load project.');
  } finally {
    loaded.value = true;
  }
});

async function saveProject() {
  savingProject.value = true;
  setMessage(false, '');
  try {
    const payload = {
      name: form.name,
      description: form.description || null,
      status: form.status
    };
    if (canChangeTeam.value) {
      payload.team_id = form.team_id || null;
    }

    const patchRes = await api.patch(
      `projects/${encodeURIComponent(form.id)}`,
      payload,
      authHeaders()
    );
    if (patchRes.data?.team_id != null) {
      form.team_id = patchRes.data.team_id;
    }
    if (patchRes.data?.team_name) teamName.value = patchRes.data.team_name;
    if (patchRes.data?.team_slug) teamSlug.value = patchRes.data.team_slug;

    // Refresh linkable set after team change
    const refreshed = await api.get(`projects/${encodeURIComponent(form.id)}`, authHeaders());
    mapOverviewToForm(refreshed.data);

    setMessage(true, 'Project updated.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to save project.');
  } finally {
    savingProject.value = false;
  }
}

async function addMember() {
  if (!newMember.user_id) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.post(
      `projects/${encodeURIComponent(form.id)}/members`,
      {
        user_id: Number(newMember.user_id),
        role: newMember.role || 'viewer'
      },
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data)
      ? res.data.map((m) => ({
          user_id: m.user_id,
          email: m.email || '',
          role: m.role || 'viewer'
        }))
      : memberRows.value;
    newMember.user_id = '';
    newMember.role = 'viewer';
    setMessage(true, 'Member added.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to add member.');
  } finally {
    savingMembers.value = false;
  }
}

async function changeMemberRole(row, nextRole) {
  if (!row?.user_id || !nextRole || row.role === nextRole) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.patch(
      `projects/${encodeURIComponent(form.id)}/members/${encodeURIComponent(row.user_id)}`,
      { role: nextRole },
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data)
      ? res.data.map((m) => ({
          user_id: m.user_id,
          email: m.email || '',
          role: m.role || 'viewer'
        }))
      : memberRows.value;
    setMessage(true, 'Member role updated.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to update member role.');
  } finally {
    savingMembers.value = false;
  }
}

async function deleteMember(row) {
  if (!row?.user_id) return;
  if (!window.confirm(`Remove ${row.email || 'this member'} from the project?`)) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.delete(
      `projects/${encodeURIComponent(form.id)}/members/${encodeURIComponent(row.user_id)}`,
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data)
      ? res.data.map((m) => ({
          user_id: m.user_id,
          email: m.email || '',
          role: m.role || 'viewer'
        }))
      : memberRows.value;
    setMessage(true, 'Member removed.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to remove member.');
  } finally {
    savingMembers.value = false;
  }
}
</script>
