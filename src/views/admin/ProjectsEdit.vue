<template>
  <main class="container-fluid" v-if="loaded">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li v-if="isSuperAdmin(userStore.user?.role)" class="breadcrumb-item">
          <router-link to="/admin/projects">Projects</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Project</li>
      </ol>
    </nav>

    <div class="row g-3">
      <div class="col-12 col-lg-7">
        <div class="card p-3">
          <h5 class="card-title mb-3">Project details</h5>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model.trim="form.name" class="form-control" :disabled="!canManageThisProject" />
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea
              v-model.trim="form.description"
              class="form-control"
              rows="3"
              placeholder="Optional"
              :disabled="!canManageThisProject"
            ></textarea>
          </div>

          <div class="mb-3">
            <label class="form-label">Status</label>
            <select
              v-model="form.status"
              class="form-select"
              style="max-width: 16rem;"
              :disabled="!canManageThisProject"
            >
              <option value="active">active</option>
              <option value="archived">archived</option>
            </select>
          </div>

          <div v-if="canChangeTeam" class="mb-3">
            <label class="form-label">Owning team</label>
            <select v-model="form.team_id" class="form-select">
              <option value="">— none —</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">
                {{ t.name }}{{ t.slug ? ` (${t.slug})` : '' }}
              </option>
            </select>
            <div class="form-text">
              Owning team is set on create. Only Super admins can reassign it.
            </div>
          </div>

          <div v-if="canManageThisProject" class="d-flex justify-content-end">
            <button class="btn btn-primary" :disabled="savingProject || !form.name" @click="saveProject">
              <span v-if="savingProject" class="spinner-border spinner-border-sm me-2" />
              Save project
            </button>
          </div>

          <div class="border-top pt-3 mt-3 small text-muted">
            <div v-if="!canChangeTeam" class="mb-1">
              Team: {{ teamLabel }}
            </div>
            <div v-if="createdByLabel" class="mb-1">
              Created by {{ createdByLabel }}
              <template v-if="createdAtLabel"> · {{ createdAtLabel }}</template>
            </div>
            <div v-else-if="createdAtLabel" class="mb-1">
              Created {{ createdAtLabel }}
            </div>
            <div v-if="canManageThisProject" class="font-monospace text-break">
              ID: {{ form.id }}
            </div>
          </div>
        </div>

        <div class="card p-3 mt-3">
          <h5 class="card-title mb-3">Datasets</h5>
          <div v-if="!form.team_id" class="alert alert-warning small mb-0">
            Set an owning team before assigning datasets.
          </div>
          <template v-else>
            <div v-if="linkedDatasetRows.length === 0" class="small text-muted mb-2">
              None linked yet.
            </div>
            <div
              v-for="row in linkedDatasetRows"
              :key="row.id"
              class="d-flex align-items-center justify-content-between gap-2 mb-2"
            >
              <div class="small">
                <strong>{{ row.name }}</strong>
              </div>
              <button
                v-if="canManageThisProject"
                type="button"
                class="btn btn-sm btn-outline-danger"
                :disabled="savingDatasets"
                @click="unlinkDataset(row.id)"
              >
                Remove
              </button>
            </div>

            <template v-if="canManageThisProject">
              <div class="row g-2 align-items-end mt-2">
                <div class="col">
                  <label class="form-label small mb-0">Add dataset</label>
                  <select
                    v-model="datasetToAdd"
                    class="form-select form-select-sm"
                    :disabled="savingDatasets"
                    @change="onDatasetPick"
                  >
                    <option value="">Select…</option>
                    <optgroup v-if="addableDatasets.length" label="Available">
                      <option v-for="d in addableDatasets" :key="d.id" :value="String(d.id)">
                        {{ d.name || d.id }}
                      </option>
                    </optgroup>
                    <option value="__new__">Add new</option>
                  </select>
                </div>
              </div>
              <div v-if="datasetToAdd === '__new__'" class="row g-2 align-items-end mt-2">
                <div class="col">
                  <input
                    v-model.trim="newDatasetName"
                    class="form-control form-control-sm"
                    placeholder="Dataset name"
                    :disabled="savingDatasets"
                    @keyup.enter="createDatasetForProject"
                  />
                </div>
                <div class="col-auto">
                  <button
                    type="button"
                    class="btn btn-sm btn-primary"
                    :disabled="savingDatasets || !newDatasetName"
                    @click="createDatasetForProject"
                  >
                    Create
                  </button>
                </div>
              </div>
            </template>
            <p v-else class="small text-muted mb-0 mt-2">
              Assigned to this project. Browse them from Home.
            </p>
          </template>
        </div>
      </div>

      <div class="col-12 col-lg-5">
        <div class="card p-3">
          <h5 class="card-title mb-3">Members</h5>
          <p v-if="canManageThisProject" class="small text-muted mb-3">
            People on this project. <strong>Project admin</strong> can manage the study;
            <strong>User</strong> can work in it.
            Super admin is a platform role — it is not assigned here.
            At least one Project admin is required, and a Project admin cannot remove themselves.
          </p>
          <p v-else class="small text-muted mb-3">
            People on this project. Contact a <strong>Project admin</strong> if you need help or a change in access.
          </p>

          <div v-if="sortedMemberRows.length === 0" class="small text-muted mb-2">No members yet.</div>

          <template v-if="canManageThisProject">
            <div v-for="row in memberRows" :key="row.user_id" class="row g-2 align-items-end mb-2">
              <div class="col-7">
                <label class="form-label small mb-0">{{ memberDisplayName(row) }}</label>
                <input :value="row.email" type="email" class="form-control form-control-sm" disabled />
              </div>
              <div class="col-3">
                <label class="form-label small mb-0">Role</label>
                <select
                  class="form-select form-select-sm"
                  :value="projectMemberUiValue(row.role)"
                  :disabled="savingMembers || isLastProjectAdmin(row)"
                  @change="changeMemberRole(row, $event.target.value)"
                >
                  <option value="owner">Project admin</option>
                  <option value="editor">User</option>
                </select>
              </div>
              <div class="col-2">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger w-100"
                  :disabled="savingMembers || !canRemoveMember(row)"
                  :title="removeMemberTitle(row)"
                  @click="deleteMember(row)"
                >
                  Remove
                </button>
              </div>
            </div>

            <div class="border-top pt-3 mt-2">
              <div class="row g-2 align-items-end">
                <div class="col-7">
                  <label class="form-label small mb-0">Add user</label>
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
                    <option value="owner">Project admin</option>
                    <option value="editor">User</option>
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
                No other people to add yet. Invite them when you create the project, or copy a roster from another project you administer.
              </p>
            </div>
          </template>

          <ul v-else class="list-unstyled mb-0">
            <li
              v-for="row in sortedMemberRows"
              :key="row.user_id"
              class="d-flex justify-content-between align-items-start gap-2 py-2 border-bottom"
            >
              <div class="min-w-0">
                <div class="fw-semibold">{{ memberDisplayName(row) }}</div>
                <a v-if="row.email" class="small" :href="`mailto:${row.email}`">{{ row.email }}</a>
              </div>
              <span class="badge text-bg-secondary flex-shrink-0">{{ projectMemberRoleLabel(row.role) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div v-if="message" class="alert mt-3" :class="ok ? 'alert-success' : 'alert-danger'">
      {{ message }}
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin, projectMemberRoleLabel, projectMemberUiValue } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { activeProject, setActiveProject } = useTeamContext();

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
const linkedDatasetMeta = ref([]);
const datasetToAdd = ref('');
const newDatasetName = ref('');
const createdByLabel = ref('');
const createdAtLabel = ref('');
const teamName = ref('');
const teamSlug = ref('');
const canManageThisProject = ref(false);

const newMember = reactive({
  user_id: '',
  role: 'editor'
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

const sortedMemberRows = computed(() => {
  return [...memberRows.value].sort((a, b) => {
    const ao = projectMemberUiValue(a.role) === 'owner' ? 0 : 1;
    const bo = projectMemberUiValue(b.role) === 'owner' ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return memberDisplayName(a).localeCompare(memberDisplayName(b));
  });
});

function memberDisplayName(row) {
  const name = String(row?.name || '').trim();
  const email = String(row?.email || '').trim();
  if (name && (!email || name.toLowerCase() !== email.toLowerCase())) return name;
  return email || name || 'Unknown';
}

function mapMemberRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((m) => ({
    user_id: m.user_id,
    name: m.name || '',
    email: m.email || '',
    role: m.role === 'owner' ? 'owner' : 'editor'
  }));
}

const projectAdminCount = computed(
  () => memberRows.value.filter((m) => projectMemberUiValue(m.role) === 'owner').length
);

function isSelfMember(row) {
  return row?.user_id != null && String(row.user_id) === String(userStore.user?.id);
}

function isLastProjectAdmin(row) {
  return projectMemberUiValue(row?.role) === 'owner' && projectAdminCount.value <= 1;
}

function canRemoveMember(row) {
  if (isSelfMember(row)) return false;
  if (isLastProjectAdmin(row)) return false;
  return true;
}

function removeMemberTitle(row) {
  if (isSelfMember(row)) return 'You cannot remove yourself from the project';
  if (isLastProjectAdmin(row)) return 'At least one Project admin is required';
  return 'Remove from project';
}

const linkedDatasetRows = computed(() => {
  const byId = new Map();
  for (const d of availableDatasets.value || []) byId.set(String(d.id), d);
  for (const d of linkedDatasetMeta.value || []) {
    byId.set(String(d.dataset_id || d.id), d);
  }
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

function onDatasetPick() {
  const id = String(datasetToAdd.value || '');
  if (!id || id === '__new__') return;
  linkDatasetById(id);
  datasetToAdd.value = '';
}

function linkDatasetById(datasetId) {
  if (!canManageThisProject.value) return;
  const id = String(datasetId || '');
  if (!id || linkedDatasetIds.value.includes(id)) return;
  linkedDatasetIds.value.push(id);
  persistLinkedDatasets('Dataset added.');
}

function unlinkDataset(datasetId) {
  if (!canManageThisProject.value) return;
  const id = String(datasetId || '');
  linkedDatasetIds.value = linkedDatasetIds.value.filter((x) => x !== id);
  persistLinkedDatasets('Dataset removed.');
}

function slugifyDatasetId(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function createDatasetForProject() {
  if (!canManageThisProject.value) return;
  const name = String(newDatasetName.value || '').trim();
  if (!name || !form.team_id || !form.id) return;
  savingDatasets.value = true;
  setMessage(false, '');
  try {
    const created = await api.post(
      'datasets',
      {
        team_id: form.team_id,
        id: slugifyDatasetId(name) || undefined,
        name,
        discoverable: true
      },
      authHeaders()
    );
    const id = created.data?.id;
    if (id && !linkedDatasetIds.value.map(String).includes(String(id))) {
      linkedDatasetIds.value.push(String(id));
    }
    newDatasetName.value = '';
    datasetToAdd.value = '';
    await persistLinkedDatasets('Dataset created and added to this project.');
    const refreshed = await api.get(`projects/${encodeURIComponent(form.id)}`, authHeaders());
    mapOverviewToForm(refreshed.data);
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to create dataset.');
    savingDatasets.value = false;
  }
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
  linkedDatasetMeta.value = Array.isArray(data?.datasets) ? data.datasets : [];

  availableDatasets.value = Array.isArray(data?.linkable_datasets) ? data.linkable_datasets : [];
  eligibleMembers.value = Array.isArray(data?.eligible_members) ? data.eligible_members : [];
  canManageThisProject.value =
    !!data?.capabilities?.can_manage || isSuperAdmin(userStore.user?.role);

  memberRows.value = mapMemberRows(data?.members);
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
    if (form.id) setActiveProject(String(form.id));
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to load project.');
  } finally {
    loaded.value = true;
  }
});

watch(
  () => activeProject.value?.id,
  (id) => {
    if (isSuperAdmin(userStore.user?.role)) return;
    if (!id || !form.id) return;
    if (String(id) !== String(form.id)) {
      router.replace({ name: 'adminProjectsEdit', params: { id: activeProject.value.slug || id } });
    }
  }
);

async function saveProject() {
  if (!canManageThisProject.value) return;
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
  if (!canManageThisProject.value || !newMember.user_id) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.post(
      `projects/${encodeURIComponent(form.id)}/members`,
      {
        user_id: Number(newMember.user_id),
        role: newMember.role || 'editor'
      },
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data) ? mapMemberRows(res.data) : memberRows.value;
    newMember.user_id = '';
    newMember.role = 'editor';
    setMessage(true, 'Member added.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to add member.');
  } finally {
    savingMembers.value = false;
  }
}

async function changeMemberRole(row, nextRole) {
  if (!canManageThisProject.value) return;
  if (!row?.user_id || !nextRole || row.role === nextRole) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.patch(
      `projects/${encodeURIComponent(form.id)}/members/${encodeURIComponent(row.user_id)}`,
      { role: nextRole },
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data) ? mapMemberRows(res.data) : memberRows.value;
    setMessage(true, 'Member role updated.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to update member role.');
  } finally {
    savingMembers.value = false;
  }
}

async function deleteMember(row) {
  if (!canManageThisProject.value) return;
  if (!row?.user_id) return;
  if (!canRemoveMember(row)) {
    setMessage(false, removeMemberTitle(row));
    return;
  }
  if (!window.confirm(`Remove ${row.email || 'this member'} from the project?`)) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.delete(
      `projects/${encodeURIComponent(form.id)}/members/${encodeURIComponent(row.user_id)}`,
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data) ? mapMemberRows(res.data) : memberRows.value;
    setMessage(true, 'Member removed.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to remove member.');
  } finally {
    savingMembers.value = false;
  }
}
</script>
