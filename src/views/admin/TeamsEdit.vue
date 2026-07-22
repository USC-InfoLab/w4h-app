<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/teams">Teams</router-link>
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
            <input v-model.trim="form.name" class="form-control" />
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

          <div class="d-flex justify-content-end">
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
            <div class="ms-auto d-flex flex-wrap gap-2">
              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                @click="$router.push({ name: 'usersAdd', query: { team_id: team.id, role: 'team_admin' } })"
              >
                Invite Team admin
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="$router.push({ name: 'usersAdd', query: { team_id: team.id, role: 'project_user' } })"
              >
                Invite member
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
                    :disabled="memberBusy"
                    @change="changeMemberRole(m, $event.target.value)"
                  >
                    <option value="team_admin">Team admin</option>
                    <option value="member">Member</option>
                  </select>
                  <button
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

          <div class="border-top pt-3">
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
                  <option value="team_admin">Team admin</option>
                  <option value="member">Member</option>
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
              Role is <strong>per team</strong> — the same person can be Team admin here and Member on another team.
            </p>
            <p v-if="!addableUsers.length" class="small text-muted mt-2 mb-0">
              No eligible users to add.
              <template v-if="isSuperAdmin(user.role)">
                Invite a new Team admin or member instead.
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
import { computed, reactive, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';
import { isSuperAdmin, TEAM_MEMBER_ROLES } from '@/utils/roles';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

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

onMounted(async () => {
  document.title = `${APP_NAME} Edit Team`;
  try {
    const [teamRes, usersRes] = await Promise.all([
      api.get(`teams/${route.params.id}`, authHeaders()),
      api.get('users', authHeaders()),
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
});

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
