<template>
  <main role="main" class="container-fluid">
    <div class="row align-items-center mb-3">
      <div class="col">
        <h5 class="mb-0">
          <i class="bi bi-people-fill me-1"></i>
          Teams
        </h5>
      </div>
      <div class="col-auto ms-auto">
        <button class="btn btn-sm btn-primary" @click="$router.push({ name: 'adminTeamsAdd' })">
          <i class="bi bi-plus"></i> Add Team
        </button>
      </div>
    </div>

    <p class="small text-muted mb-3">
      <template v-if="isSuperAdmin(user.role)">
        Create an <strong>initial team</strong> when onboarding a PI, then invite them as Team admin.
        Day-to-day trial setup (projects, datasets) is done by the Team admin in the app shell — not here.
      </template>
      <template v-else>
        Create a team for a new trial, then add datasets, projects, and members.
        You are Team admin on teams you create.
      </template>
    </p>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading teams...</p>
    </div>

    <div v-else-if="!rows.length" class="text-center my-5">
      <p class="text-muted mb-3">No teams yet.</p>
      <button
        class="btn btn-primary btn-sm"
        @click="$router.push({ name: 'adminTeamsAdd' })"
      >
        Create the first team
      </button>
    </div>

    <div v-else class="row g-3">
      <div v-for="row in rows" :key="row.id" class="col-12 col-md-6 col-xl-4">
        <button type="button" class="team-card w-100 text-start" @click="onEdit(row)">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div class="min-w-0">
              <div class="fw-semibold text-truncate">{{ row.name }}</div>
              <div class="small text-muted text-truncate">{{ row.slug }}</div>
            </div>
            <span class="badge flex-shrink-0" :class="row.status === 'active' ? 'text-bg-success' : 'text-bg-secondary'">
              {{ row.status }}
            </span>
          </div>
          <div class="small text-muted mt-2">
            {{ row.member_count }} {{ row.member_count === 1 ? 'member' : 'members' }}
          </div>
        </button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';
import { isSuperAdmin } from '@/utils/roles';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const rows = ref([]);
const loading = ref(true);

function onEdit(row) {
  router.push({ name: 'adminTeamsEdit', params: { id: row.id } });
}

onMounted(async () => {
  document.title = `${APP_NAME} Teams`;
  try {
    const res = await api.get('teams', authHeaders());
    rows.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error(e);
    rows.value = [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.team-card {
  display: block;
  padding: 1rem 1.1rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  background: var(--bs-body-bg);
  color: inherit;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}

.team-card:hover {
  border-color: var(--bs-primary);
  background: var(--bs-tertiary-bg);
}
</style>
