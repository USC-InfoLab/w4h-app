<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li v-if="isSuperAdmin(user.role)" class="breadcrumb-item">
          <router-link to="/admin/teams">Teams</router-link>
        </li>
        <li v-else class="breadcrumb-item">
          <router-link
            v-if="activeProject?.slug || activeProject?.id"
            :to="{ name: 'adminProjectsEdit', params: { id: activeProject.slug || activeProject.id } }"
          >
            Project
          </router-link>
          <span v-else>Project</span>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
          {{ team?.name || 'Team' }}
        </li>
      </ol>
    </nav>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading team...</p>
    </div>

    <div v-else-if="!team" class="alert alert-danger">Team not found.</div>

    <div v-else class="row gy-3">
      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-3">Details</h5>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model.trim="form.name" class="form-control" :disabled="!canEditTeam" />
          </div>

          <div class="mb-3">
            <label class="form-label">Slug</label>
            <input :value="team.slug" class="form-control" disabled />
          </div>

          <div v-if="isSuperAdmin(user.role)" class="mb-3">
            <label class="form-label">Status</label>
            <select v-model="form.status" class="form-select">
              <option value="active">active</option>
              <option value="deactivated">deactivated</option>
            </select>
          </div>
          <div v-else class="mb-3">
            <label class="form-label">Status</label>
            <input :value="team.status" class="form-control" disabled />
          </div>

          <div v-if="message" class="alert" :class="ok ? 'alert-success' : 'alert-danger'">
            {{ message }}
          </div>

          <div v-if="canEditTeam" class="d-flex justify-content-end">
            <button class="btn btn-primary" :disabled="saving || !form.name" @click="onSave">
              Save
            </button>
          </div>
        </div>
      </div>

      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
            <h5 class="card-title mb-0">Members</h5>
            <div v-if="canEditTeam" class="ms-auto d-flex flex-wrap gap-2">
              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                @click="$router.push({ name: 'usersAdd', query: { team_id: team.id, role: 'team_admin' } })"
              >
                Invite Project admin
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="$router.push({ name: 'usersAdd', query: { team_id: team.id, role: 'project_user' } })"
              >
                Invite user
              </button>
            </div>
          </div>

          <div v-if="!team.members?.length" class="text-muted mb-3">
            No members yet. Add an existing user below, or invite someone new.
          </div>
          <ul v-else class="list-group list-group-flush mb-3">
            <li
              v-for="m in team.members"
              :key="m.id"
              class="list-group-item px-0"
            >
              <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div class="min-w-0">
                  <div class="fw-semibold text-truncate">{{ m.name || m.email }}</div>
                  <div class="small text-muted text-truncate">{{ m.email }}</div>
                </div>
                <div class="d-flex align-items-center gap-2 flex-shrink-0">
                  <select
                    class="form-select form-select-sm"
                    style="width: auto; min-width: 8rem"
                    :value="m.team_role || 'member'"
                    :disabled="memberBusy || !canEditTeam"
                    @change="changeMemberRole(m, $event.target.value)"
                  >
                    <option value="team_admin">Project admin</option>
                    <option value="member">User</option>
                  </select>
                  <button
                    v-if="canEditTeam"
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    :disabled="memberBusy"
                    title="Remove from team"
                    @click="removeMember(m)"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          </ul>

          <div v-if="canEditTeam" class="border-top pt-3">
            <label class="form-label">Add existing user</label>
            <div class="row g-2 align-items-end">
              <div class="col">
                <select v-model="selectedUserId" class="form-select form-select-sm">
                  <option value="">Select user…</option>
                  <option
                    v-for="u in addableUsers"
                    :key="u.id"
                    :value="String(u.id)"
                  >
                    {{ u.name ? `${u.name} (${u.email})` : u.email }}
                  </option>
                </select>
              </div>
              <div class="col-auto">
                <select v-model="selectedTeamRole" class="form-select form-select-sm">
                  <option value="team_admin">Project admin</option>
                  <option value="member">User</option>
                </select>
              </div>
              <div class="col-auto">
                <button
                  type="button"
                  class="btn btn-sm btn-primary"
                  :disabled="memberBusy || !selectedUserId"
                  @click="addExistingMember"
                >
                  Add
                </button>
              </div>
            </div>
            <p class="small text-muted mt-2 mb-0">
              Role is <strong>per team</strong> — the same person can be Project admin here and User on another team.
            </p>
            <p v-if="!addableUsers.length" class="small text-muted mt-2 mb-0">
              No eligible users to add.
              <template v-if="isSuperAdmin(user.role)">
                Invite a new Project admin or User instead.
              </template>
              <template v-else>
                You can only add users who already belong to one of your teams.
              </template>
            </p>
            <div v-if="memberMessage" class="alert mt-2 mb-0 py-2" :class="memberOk ? 'alert-success' : 'alert-danger'">
              {{ memberMessage }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, reactive, ref, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';
import { isSuperAdmin, TEAM_MEMBER_ROLES } from '@/utils/roles';
import { useUserStore } from '@/stores/user';
import { useTeamContext } from '@/composables/useTeamContext';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { isActiveProjectAdmin, activeProject } = useTeamContext();
const canEditTeam = computed(
  () => isSuperAdmin(user.value?.role) || isActiveProjectAdmin.value
);

const team = ref(null);
const allUsers = ref([]);
const loading = ref(true);
const saving = ref(false);
const memberBusy = ref(false);
const selectedUserId = ref('');
const selectedTeamRole = ref(TEAM_MEMBER_ROLES.MEMBER);
const message = ref('');
const ok = ref(false);
const memberMessage = ref('');
const memberOk = ref(false);
const form = reactive({ name: '', status: 'active' });

const addableUsers = computed(() => {
  const memberIds = new Set((team.value?.members || []).map((m) => String(m.id)));
  return (allUsers.value || []).filter((u) => {
    if (memberIds.has(String(u.id))) return false;
    if (u.status === 'discontinued') return false;
    if (isSuperAdmin(u.role)) return false;
    return true;
  });
});

async function loadTeam() {
  loading.value = true;
  try {
    const [teamRes, usersRes] = await Promise.all([
      api.get(`teams/${route.params.id}`, authHeaders()),
      canEditTeam.value
        ? api.get('users', authHeaders()).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ]);
    team.value = teamRes.data;
    form.name = teamRes.data.name;
    form.status = teamRes.data.status;
    allUsers.value = Array.isArray(usersRes.data) ? usersRes.data : [];
  } catch (e) {
    console.error(e);
    team.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  document.title = `${APP_NAME} Team`;
  await loadTeam();
});

watch(
  () => activeProject.value?.teamId,
  (teamId) => {
    if (isSuperAdmin(user.value?.role)) return;
    if (teamId && String(teamId) !== String(route.params.id)) {
      router.replace({ name: 'adminTeamsEdit', params: { id: teamId } });
    }
  }
);

watch(
  () => route.params.id,
  () => {
    if (!isSuperAdmin(user.value?.role)) loadTeam();
  }
);

async function onSave() {
  saving.value = true;
  message.value = '';
  ok.value = false;
  try {
    const payload = { name: form.name };
    if (isSuperAdmin(user.value.role)) {
      payload.status = form.status;
    }
    const res = await api.patch(`teams/${route.params.id}`, payload, authHeaders());
    team.value = { ...team.value, ...res.data };
    ok.value = true;
    message.value = 'Team updated.';
  } catch (error) {
    message.value = error.response?.data?.error || `Failed to update team: ${error}`;
  } finally {
    saving.value = false;
  }
}

async function addExistingMember() {
  if (!selectedUserId.value) return;
  memberBusy.value = true;
  memberMessage.value = '';
  memberOk.value = false;
  try {
    const res = await api.post(
      `teams/${route.params.id}/members`,
      {
        user_id: Number(selectedUserId.value),
        role: selectedTeamRole.value || TEAM_MEMBER_ROLES.MEMBER,
      },
      authHeaders()
    );
    team.value = { ...team.value, members: res.data.members || team.value.members };
    selectedUserId.value = '';
    selectedTeamRole.value = TEAM_MEMBER_ROLES.MEMBER;
    memberOk.value = true;
    memberMessage.value = 'User added to this team.';
  } catch (error) {
    memberMessage.value = error.response?.data?.error || 'Failed to add user.';
  } finally {
    memberBusy.value = false;
  }
}

async function changeMemberRole(m, nextRole) {
  if (!m?.id || !nextRole || m.team_role === nextRole) return;
  memberBusy.value = true;
  memberMessage.value = '';
  memberOk.value = false;
  try {
    const res = await api.patch(
      `teams/${route.params.id}/members/${encodeURIComponent(m.id)}`,
      { role: nextRole },
      authHeaders()
    );
    team.value = { ...team.value, members: res.data.members || [] };
    memberOk.value = true;
    memberMessage.value = 'Team role updated.';
  } catch (error) {
    memberMessage.value = error.response?.data?.error || 'Failed to update role.';
  } finally {
    memberBusy.value = false;
  }
}

async function removeMember(m) {
  if (!m?.id) return;
  if (!window.confirm(`Remove ${m.email || m.name || 'this user'} from the team?`)) return;
  memberBusy.value = true;
  memberMessage.value = '';
  memberOk.value = false;
  try {
    const res = await api.delete(
      `teams/${route.params.id}/members/${encodeURIComponent(m.id)}`,
      authHeaders()
    );
    team.value = { ...team.value, members: res.data.members || [] };
    memberOk.value = true;
    memberMessage.value = 'User removed from this team.';
  } catch (error) {
    memberMessage.value = error.response?.data?.error || 'Failed to remove user.';
  } finally {
    memberBusy.value = false;
  }
}
</script>
