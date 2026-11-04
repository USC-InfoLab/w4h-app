<template>
  <div v-if="!hidden" class="card p-3">
    <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
      <h5 class="card-title mb-0">Team</h5>
      <span v-if="team?.name" class="text-muted">{{ team.name }}</span>
    </div>
    <p class="small text-muted mb-3">
      Set the lab first. Then invite people in the card below — they join this team.
      Use the selector only to attach the project to a different lab you already administer,
      or to create a new lab (not a second copy of this project).
    </p>

    <div v-if="needsSetup" class="alert alert-warning py-2 small">
      This lab only has you on it. Invite someone under People, or apply an existing team if
      this project should sit under another lab you already have.
    </div>

    <div v-if="canAssign" class="mb-3">
      <label class="form-label small mb-1" for="owning-team-assign">Owning team</label>
      <div class="d-flex flex-wrap gap-2">
        <select
          id="owning-team-assign"
          v-model="assignTeamId"
          class="form-select form-select-sm"
          style="max-width: 22rem"
        >
          <option v-if="!assignableTeams.length && !canCreateTeam" value="" disabled>
            No teams you administer
          </option>
          <option v-for="t in assignableTeams" :key="t.id" :value="String(t.id)">
            {{ t.name }}{{ t.slug ? ` (${t.slug})` : '' }}
          </option>
          <option v-if="canCreateTeam" :value="NEW_TEAM">
            New team (same name as this project)
          </option>
        </select>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary"
          :disabled="assignBusy || !assignDirty"
          @click="onAssign"
        >
          {{ assignBusy ? 'Saving…' : 'Apply' }}
        </button>
      </div>
      <div class="form-text">
        <template v-if="assignTeamId === NEW_TEAM">
          Creates a team named <strong>{{ newTeamName }}</strong> and moves this project onto it.
        </template>
        <template v-else>
          Reassigning moves the project, not its datasets. Each catalog stays with the team that owns it.
        </template>
      </div>
    </div>

    <div v-if="loading" class="small text-muted">Loading team…</div>
    <div v-else-if="loadError" class="alert alert-danger py-2 small mb-0">{{ loadError }}</div>
    <template v-else-if="team">
      <div v-if="canEdit" class="mb-3">
        <label class="form-label small mb-0" for="owning-team-name">Team name</label>
        <div class="d-flex gap-2 mt-1">
          <input
            id="owning-team-name"
            v-model.trim="form.name"
            class="form-control form-control-sm"
            maxlength="120"
          />
          <button
            type="button"
            class="btn btn-sm btn-outline-primary"
            :disabled="saving || !form.name || form.name === team.name"
            @click="onSave"
          >
            Rename
          </button>
        </div>
      </div>

      <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
        <h6 class="mb-0">Team members</h6>
        <div v-if="canEdit" class="ms-auto d-flex flex-wrap gap-2">
          <button
            type="button"
            class="btn btn-sm btn-outline-primary"
            @click="router.push({ name: 'usersAdd', query: { team_id: team.id, role: 'team_admin' } })"
          >
            Invite Admin
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            @click="router.push({ name: 'usersAdd', query: { team_id: team.id, role: 'project_user' } })"
          >
            Invite user
          </button>
        </div>
      </div>

      <div v-if="!team.members?.length" class="small text-muted mb-3">No members yet.</div>
      <ul v-else class="list-group list-group-flush mb-3">
        <li v-for="m in team.members" :key="m.id" class="list-group-item px-0">
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
                :disabled="memberBusy || !canEdit"
                @change="changeMemberRole(m, $event.target.value)"
              >
                <option value="team_admin">Admin</option>
                <option value="member">User</option>
              </select>
              <button
                v-if="canEdit"
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

      <div v-if="canEdit" class="border-top pt-3">
        <label class="form-label small mb-1">Add existing user</label>
        <div class="row g-2 align-items-end">
          <div class="col">
            <select v-model="selectedUserId" class="form-select form-select-sm">
              <option value="">Select user…</option>
              <option v-for="u in addableUsers" :key="u.id" :value="String(u.id)">
                {{ u.name ? `${u.name} (${u.email})` : u.email }}
              </option>
            </select>
          </div>
          <div class="col-auto">
            <select v-model="selectedTeamRole" class="form-select form-select-sm">
              <option value="team_admin">Admin</option>
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
        <p v-if="!addableUsers.length" class="small text-muted mt-2 mb-0">
          No eligible users to add. You can only add people who already belong to one of your teams.
        </p>
      </div>

      <div
        v-if="memberMessage || message"
        class="alert mt-3 mb-0 py-2 small"
        :class="(memberOk || ok) ? 'alert-success' : 'alert-danger'"
      >
        {{ memberMessage || message }}
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '@/utils/api';
import { isSuperAdmin, TEAM_MEMBER_ROLES } from '@/utils/roles';
import { useUserStore } from '@/stores/user';

const NEW_TEAM = '__new__';

const props = defineProps({
  teamId: { type: [String, Number], default: '' },
  projectId: { type: [String, Number], default: '' },
  projectName: { type: String, default: '' },
  canManage: { type: Boolean, default: false },
});

const emit = defineEmits(['renamed', 'reassigned']);

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const omit = ref(false);
const hidden = computed(() => {
  if (isSuperAdmin(user.value?.role)) return true;
  if (props.canManage) return false;
  if (!props.teamId) return true;
  return omit.value;
});
const canCreateTeam = computed(
  () => !isSuperAdmin(user.value?.role) && !!user.value?.caps?.can_create_teams
);
const assignableTeams = ref([]);
const assignTeamId = ref('');
const assignBusy = ref(false);
const canAssign = computed(
  () => props.canManage && (assignableTeams.value.length > 0 || canCreateTeam.value)
);
const assignDirty = computed(() => {
  if (!assignTeamId.value) return false;
  if (assignTeamId.value === NEW_TEAM) return !!newTeamName.value;
  return String(assignTeamId.value) !== String(props.teamId || '');
});
const newTeamName = computed(() => String(props.projectName || '').trim());
const needsSetup = computed(() => {
  if (!team.value) return false;
  const members = Array.isArray(team.value.members) ? team.value.members : [];
  return members.length < 2;
});

const canEdit = computed(() => {
  if (isSuperAdmin(user.value?.role)) return false;
  const tid = String(props.teamId || '');
  if (!tid) return false;
  return (user.value?.team_memberships || []).some(
    (m) => String(m.team_id) === tid && m.role === TEAM_MEMBER_ROLES.TEAM_ADMIN
  );
});

const team = ref(null);
const allUsers = ref([]);
const loading = ref(false);
const loadError = ref('');
const saving = ref(false);
const memberBusy = ref(false);
const selectedUserId = ref('');
const selectedTeamRole = ref(TEAM_MEMBER_ROLES.MEMBER);
const message = ref('');
const ok = ref(false);
const memberMessage = ref('');
const memberOk = ref(false);
const form = reactive({ name: '' });

const addableUsers = computed(() => {
  const memberIds = new Set((team.value?.members || []).map((m) => String(m.id)));
  return (allUsers.value || []).filter((u) => {
    if (memberIds.has(String(u.id))) return false;
    if (u.status === 'discontinued') return false;
    if (isSuperAdmin(u.role)) return false;
    return true;
  });
});

function syncAssignSelect() {
  const current = props.teamId ? String(props.teamId) : '';
  if (current) {
    assignTeamId.value = current;
    return;
  }
  if (assignableTeams.value.length) {
    assignTeamId.value = String(assignableTeams.value[0].id);
    return;
  }
  assignTeamId.value = canCreateTeam.value ? NEW_TEAM : '';
}

async function loadAssignableTeams() {
  if (!props.canManage) {
    assignableTeams.value = [];
    return;
  }
  try {
    const res = await api.get('teams', authHeaders());
    const rows = Array.isArray(res.data) ? res.data : [];
    const adminIds = new Set(
      (user.value?.team_memberships || [])
        .filter((m) => m.role === TEAM_MEMBER_ROLES.TEAM_ADMIN)
        .map((m) => String(m.team_id))
    );
    assignableTeams.value = rows.filter((t) => adminIds.has(String(t.id)));
  } catch {
    assignableTeams.value = [];
  }
  syncAssignSelect();
}

async function loadTeam() {
  if (isSuperAdmin(user.value?.role)) {
    team.value = null;
    omit.value = true;
    return;
  }
  if (!props.teamId) {
    team.value = null;
    omit.value = false;
    return;
  }
  omit.value = false;
  loading.value = true;
  loadError.value = '';
  try {
    const [teamRes, usersRes] = await Promise.all([
      api.get(`teams/${props.teamId}`, authHeaders()),
      canEdit.value
        ? api.get('users', authHeaders()).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] }),
    ]);
    team.value = teamRes.data;
    form.name = teamRes.data.name;
    allUsers.value = Array.isArray(usersRes.data) ? usersRes.data : [];
  } catch (e) {
    team.value = null;
    if (e.response?.status === 403) {
      omit.value = !props.canManage;
    } else {
      loadError.value = e.response?.data?.error || e.message || 'Failed to load team.';
    }
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.canManage,
  () => {
    loadAssignableTeams();
  },
  { immediate: true }
);

watch(
  () => String(props.teamId || ''),
  () => {
    loadTeam();
    syncAssignSelect();
  },
  { immediate: true }
);

async function onAssign() {
  if (!assignDirty.value || !props.projectId) return;
  assignBusy.value = true;
  message.value = '';
  ok.value = false;
  try {
    let nextTeamId = assignTeamId.value;
    if (nextTeamId === NEW_TEAM) {
      if (!newTeamName.value) {
        throw new Error('Name the project first — the new team uses the same name.');
      }
      const teamRes = await api.post('teams', { name: newTeamName.value }, authHeaders());
      nextTeamId = teamRes.data?.id;
      if (!nextTeamId) throw new Error('Team was created but no id was returned.');
      const session = await api.get('users/me/session', authHeaders());
      await userStore.setUser({ ...userStore.user, ...session.data });
    } else {
      const dest = assignableTeams.value.find((t) => String(t.id) === String(nextTeamId));
      const destName = dest?.name || 'that team';
      if (!window.confirm(`Move this project to ${destName}? Datasets stay with their current owning team.`)) {
        return;
      }
    }
    await api.patch(
      `projects/${encodeURIComponent(props.projectId)}`,
      { team_id: nextTeamId },
      authHeaders()
    );
    ok.value = true;
    message.value = 'Owning team updated.';
    emit('reassigned', nextTeamId);
    await loadAssignableTeams();
  } catch (error) {
    if (error) {
      message.value = error.response?.data?.error || error.message || 'Failed to assign team.';
    }
  } finally {
    assignBusy.value = false;
  }
}

async function onSave() {
  saving.value = true;
  message.value = '';
  ok.value = false;
  try {
    const res = await api.patch(`teams/${props.teamId}`, { name: form.name }, authHeaders());
    team.value = { ...team.value, ...res.data };
    form.name = team.value.name;
    ok.value = true;
    message.value = 'Team renamed.';
    emit('renamed', team.value.name);
  } catch (error) {
    message.value = error.response?.data?.error || 'Failed to rename team.';
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
      `teams/${props.teamId}/members`,
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
      `teams/${props.teamId}/members/${encodeURIComponent(m.id)}`,
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
      `teams/${props.teamId}/members/${encodeURIComponent(m.id)}`,
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
