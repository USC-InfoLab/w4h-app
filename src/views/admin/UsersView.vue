<template>
  <main role="main" class="container-fluid">
    <div class="row align-items-center g-2 mb-3">
      <div class="col-12 col-md">
        <label class="form-label small mb-1">Team</label>
        <select v-model="teamFilter" class="form-select form-select-sm" style="max-width: 22rem;">
          <option value="all">All teams</option>
          <option v-if="isPlatformAdmin" value="none">No team (platform)</option>
          <option v-for="t in teamOptions" :key="t.id" :value="String(t.id)">
            {{ t.name }}
          </option>
        </select>
        <div v-if="activeTeamName" class="form-text">
          Active lab: <strong>{{ activeTeamName }}</strong>
          <span v-if="activeTeamRoleLabel"> ({{ activeTeamRoleLabel }})</span>
        </div>
      </div>
      <div v-if="canInvite" class="col-auto ms-md-auto align-self-end">
        <button class="btn btn-sm btn-primary" @click="$router.push({ name: 'usersAdd' })">
          <i class="bi bi-plus"></i> Invite User
        </button>
      </div>
    </div>

    <div v-if="!canInvite && !isPlatformAdmin" class="alert alert-secondary py-2 small">
      You are a User on the active team — inviting and editing users requires Admin on that team.
      Switch labs with the team switcher next to <strong>W4H</strong>.
    </div>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading users...</p>
    </div>

    <div v-else-if="loadError" class="alert alert-warning small">{{ loadError }}</div>

    <div v-else-if="!filteredRows.length" class="text-center my-5">
      <p class="text-muted mb-0">No users for this filter.</p>
    </div>

    <ul v-else class="list-group">
      <li
        v-for="row in filteredRows"
        :key="row.id || row.email"
        class="list-group-item"
      >
        <div class="d-flex justify-content-between align-items-start gap-3">
          <div class="min-w-0">
            <div class="fw-semibold">{{ row.name || row.email }}</div>
            <div class="small">
              <a :href="'mailto:' + row.email">{{ row.email }}</a>
            </div>
            <div class="small text-muted mt-1">
              <span v-if="row.status && row.status !== 'active'" class="badge me-2" :class="row.status === 'invited' ? 'text-bg-warning' : 'text-bg-secondary'">
                {{ row.status === 'discontinued' ? 'paused' : row.status }}
              </span>
              <template v-if="row.isSuperAdmin">
                <span>{{ row.roleLabel }}</span>
                <span class="mx-1">·</span>
                <span>Platform-wide</span>
              </template>
              <template v-else>
                <span>{{ row.teamsLabel }}</span>
              </template>
            </div>
          </div>
          <div class="d-flex gap-2 flex-shrink-0">
            <button
              v-if="canLoginAs(row)"
              class="btn btn-sm btn-outline-secondary"
              :disabled="loginAsBusy"
              title="Dev only: sign in as this user"
              @click="onLoginAs(row)"
            >
              Log in as
            </button>
            <button
              v-if="canEditRow(row)"
              class="btn btn-sm btn-outline-primary"
              @click="onEditButtonClick(row)"
            >
              Edit
            </button>
          </div>
        </div>
      </li>
    </ul>
  </main>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { APP_NAME } from '@/utils/defs';
import { isSuperAdmin, roleLabel, teamMemberRoleLabel, TEAM_MEMBER_ROLES } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';
import { useUIStore } from '@/stores/ui';
import { canAccessAdminUi } from '@/utils/roles';
import { clearUsageSessionFlags } from '@/utils/clientUsage';

const router = useRouter();
const userStore = useUserStore();
const {
  activeTeamId,
  activeTeamName,
  activeTeamRoleLabel,
  isActiveTeamAdmin,
} = useTeamContext();

const allRows = ref([]);
const teamOptions = ref([]);
const teamFilter = ref('all');
const loading = ref(true);

const uiStore = useUIStore();
// Dev-only "Log in as" (API: W4H_DEV_LOGIN_AS=true, never in production).
const loginAsEnabled = ref(false);
const loginAsBusy = ref(false);
const loadError = ref('');

const isPlatformAdmin = computed(() => isSuperAdmin(userStore.user?.role));
const canInvite = computed(() => isPlatformAdmin.value || isActiveTeamAdmin.value);

function formatTeamMemberships(u) {
  const memberships = Array.isArray(u.team_memberships) ? u.team_memberships : [];
  if (memberships.length) {
    const byRole = new Map();
    for (const m of memberships) {
      const role = m.role === TEAM_MEMBER_ROLES.TEAM_ADMIN
        ? TEAM_MEMBER_ROLES.TEAM_ADMIN
        : TEAM_MEMBER_ROLES.MEMBER;
      const name = m.name || 'Team';
      if (!byRole.has(role)) byRole.set(role, []);
      byRole.get(role).push(name);
    }
    const order = [TEAM_MEMBER_ROLES.TEAM_ADMIN, TEAM_MEMBER_ROLES.MEMBER];
    return order
      .filter((role) => byRole.has(role))
      .map((role) => `${teamMemberRoleLabel(role)} (${byRole.get(role).join(', ')})`)
      .join('; ');
  }
  const teamsRaw = String(u.teams || '').trim();
  if (teamsRaw) {
    return `${roleLabel(u.role)} (${teamsRaw})`;
  }
  return 'No team';
}

const filteredRows = computed(() => {
  const rows = allRows.value;
  if (teamFilter.value === 'all') return rows;
  if (teamFilter.value === 'none') {
    return rows.filter((r) => !r.team_ids?.length);
  }
  return rows.filter((r) => (r.team_ids || []).map(String).includes(String(teamFilter.value)));
});

function syncFilterToActiveTeam() {
  if (isPlatformAdmin.value) return;
  if (activeTeamId.value) {
    teamFilter.value = String(activeTeamId.value);
  }
}

watch(activeTeamId, () => {
  syncFilterToActiveTeam();
});

onMounted(async () => {
  document.title = `${APP_NAME} Users`;
  try {
    // GET /users/ is closed to the Super admin; in dev the "Log in as" endpoint lists users instead.
    const devSuperAdmin = import.meta.env.DEV && isPlatformAdmin.value;
    const [usersRes, teamsRes] = await Promise.allSettled([
      api.get(devSuperAdmin ? 'users/dev/login-as' : 'users/', authHeaders()),
      api.get('teams', authHeaders())
    ]);
    if (usersRes.status === 'rejected') throw usersRes.reason;
    teamOptions.value = teamsRes.status === 'fulfilled' && Array.isArray(teamsRes.value.data)
      ? teamsRes.value.data
      : [];

    const usersData = usersRes.value.data;
    if (devSuperAdmin) {
      loginAsEnabled.value = !!usersData?.enabled;
      if (!loginAsEnabled.value) {
        loadError.value = 'Set W4H_DEV_LOGIN_AS=true in w4h-api/.env and restart the API to list users here.';
      }
    }
    const users = devSuperAdmin
      ? (Array.isArray(usersData?.users) ? usersData.users : [])
      : (Array.isArray(usersData) ? usersData : []);
    allRows.value = users.map((u) => {
      const teamIds = Array.isArray(u.team_ids) ? u.team_ids.map(String) : [];
      const superAdmin = isSuperAdmin(u.role);
      return {
        ...u,
        id: u.id,
        name: u.name || '',
        email: u.email || '',
        role: u.role || '',
        roleLabel: roleLabel(u.role),
        isSuperAdmin: superAdmin,
        team_ids: teamIds,
        teamsLabel: superAdmin
          ? 'Platform-wide'
          : formatTeamMemberships(u),
      };
    });

    if (teamOptions.value.length === 1 && !isPlatformAdmin.value) {
      teamFilter.value = String(teamOptions.value[0].id);
    }
    syncFilterToActiveTeam();
  } catch (e) {
    console.error(e);
    allRows.value = [];
    loadError.value = e?.response?.status === 404
      ? 'The API does not have the "Log in as" endpoint yet. Restart it.'
      : 'Could not load users.';
  } finally {
    loading.value = false;
  }
});

function canEditRow(row) {
  // User editing is a team-admin page; the router keeps the Super admin out of it.
  if (isPlatformAdmin.value) return false;
  if (!isActiveTeamAdmin.value) {
    return row.email === userStore.user?.email;
  }
  return true;
}

function canLoginAs(row) {
  return loginAsEnabled.value
    && (!row.status || row.status === 'active')
    && String(row.id) !== String(userStore.user?.id);
}

async function onLoginAs(row) {
  if (!window.confirm(`Sign in as ${row.email}? You will be signed out of your Super admin session.`)) return;
  loginAsBusy.value = true;
  try {
    const { data } = await api.post('users/dev/login-as', { email: row.email }, authHeaders());
    clearUsageSessionFlags();
    localStorage.setItem('w4h.user.token', data.token);
    await userStore.setUser(data);
    if (canAccessAdminUi(data.role, data.caps)) {
      uiStore.enterAdmin();
      router.push({ name: 'adminHome' });
    } else {
      uiStore.exitAdmin();
      router.push('/home');
    }
  } catch (e) {
    window.alert(e?.response?.data?.error?.message || 'Log in as failed.');
  } finally {
    loginAsBusy.value = false;
  }
}

function onEditButtonClick(row) {
  const isSelf = row.email === userStore.user.email;
  const isAdmin = isPlatformAdmin.value || isActiveTeamAdmin.value;
  router.push({
    name: !isAdmin && isSelf ? 'userProfileEdit' : 'usersEdit',
    params: !isAdmin && isSelf ? {} : { email: row.email }
  });
}
</script>
