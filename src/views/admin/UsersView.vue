<template>
  <main role="main" class="container-fluid">
    <div class="row align-items-center g-2 mb-3">
      <div class="col-12 col-md">
        <label class="form-label small mb-1">Team</label>
        <select v-model="teamFilter" class="form-select form-select-sm" style="max-width: 22rem;">
          <option value="all">All teams</option>
          <option value="none">No team (platform)</option>
          <option v-for="t in teamOptions" :key="t.id" :value="String(t.id)">
            {{ t.name }}
          </option>
        </select>
      </div>
      <div class="col-auto ms-md-auto align-self-end">
        <button class="btn btn-sm btn-primary" @click="$router.push({ name: 'usersAdd' })">
          <i class="bi bi-plus"></i> Invite User
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading users...</p>
    </div>

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
                {{ row.status }}
              </span>
              <span class="me-2">{{ row.roleLabel }}</span>
              <span class="me-2">·</span>
              <span class="me-2">Team: {{ row.teamsLabel }}</span>
              <span class="me-2">·</span>
              <span>Projects: {{ row.projectsLabel }}</span>
            </div>
          </div>
          <button class="btn btn-sm btn-outline-primary flex-shrink-0" @click="onEditButtonClick(row)">
            Edit
          </button>
        </div>
      </li>
    </ul>
  </main>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { APP_NAME } from '@/utils/defs';
import { isSuperAdmin, roleLabel } from '@/utils/roles';

const router = useRouter();
const userStore = useUserStore();

const allRows = ref([]);
const teamOptions = ref([]);
const teamFilter = ref('all');
const loading = ref(true);

const filteredRows = computed(() => {
  const rows = allRows.value;
  if (teamFilter.value === 'all') return rows;
  if (teamFilter.value === 'none') {
    return rows.filter((r) => !r.team_ids?.length);
  }
  return rows.filter((r) => (r.team_ids || []).map(String).includes(teamFilter.value));
});

onMounted(async () => {
  document.title = `${APP_NAME} Users`;
  try {
    const [usersRes, teamsRes] = await Promise.all([
      api.get('users/', authHeaders()),
      api.get('teams', authHeaders())
    ]);
    teamOptions.value = Array.isArray(teamsRes.data) ? teamsRes.data : [];

    const users = Array.isArray(usersRes.data) ? usersRes.data : [];
    allRows.value = users.map((u) => {
      const teamIds = Array.isArray(u.team_ids) ? u.team_ids.map(String) : [];
      const teamsRaw = String(u.teams || '').trim();
      const projectsRaw = String(u.projects || '').trim();
      return {
        ...u,
        id: u.id,
        name: u.name || '',
        email: u.email || '',
        role: u.role || '',
        roleLabel: roleLabel(u.role),
        team_ids: teamIds,
        teamsLabel: isSuperAdmin(u.role)
          ? (teamsRaw || 'Platform')
          : (teamsRaw || 'No team'),
        projectsLabel: projectsRaw || 'None'
      };
    });

    // If caller has exactly one team, default filter to that team
    if (teamOptions.value.length === 1 && !isSuperAdmin(userStore.user?.role)) {
      teamFilter.value = String(teamOptions.value[0].id);
    }
  } catch (e) {
    console.error(e);
    allRows.value = [];
  } finally {
    loading.value = false;
  }
});

function onEditButtonClick(row) {
  const isSelf = row.email === userStore.user.email;
  const isAdmin = isSuperAdmin(userStore.user.role);
  router.push({
    name: !isAdmin && isSelf ? 'userProfileEdit' : 'usersEdit',
    params: !isAdmin && isSelf ? {} : { email: row.email }
  });
}
</script>
