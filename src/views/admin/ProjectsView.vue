<template>
  <main role="main" class="container-fluid text-start">
    <div class="d-flex align-items-center justify-content-between gap-3 mb-2">
      <h5 class="mb-0">
        <i class="bi bi-beaker me-1"></i>
        Projects
      </h5>
      <div class="d-flex align-items-center gap-2 flex-shrink-0">
        <label class="visually-hidden" for="project-status-filter">Show</label>
        <select
          id="project-status-filter"
          class="form-select form-select-sm"
          style="width: auto;"
          :value="statusFilter"
          @change="onStatusFilterChange($event.target.value)"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
        <button
          v-if="canCreateProject"
          class="btn btn-sm btn-primary text-nowrap"
          @click="$router.push({ name: 'adminProjectsAdd' })"
        >
          <i class="bi bi-plus"></i> Add project
        </button>
      </div>
    </div>
    <p class="small text-muted mb-3">
      <template v-if="statusFilter === 'archived'">
        Hidden from the project menu. Nothing is deleted. Open one and choose Restore to put it back.
      </template>
      <template v-else-if="isActiveProjectAdmin">
        Your projects. A new project can copy members from an existing one, once, not as a live link.
      </template>
      <template v-else>
        Projects you belong to. Open one to work in it.
      </template>
    </p>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading projects...</p>
    </div>

    <ul v-else-if="visibleProjects.length" class="list-group">
      <li
        v-for="project in visibleProjects"
        :key="project.id"
        class="list-group-item d-flex justify-content-between align-items-center gap-2"
      >
        <div class="min-w-0 flex-grow-1">
          <div class="fw-semibold">
            {{ project.name || project.id }}
            <span v-if="project.status === 'archived'" class="badge text-bg-secondary ms-1">Archived</span>
          </div>
          <small class="text-muted">
            {{ project.slug || project.id }}
            <span v-if="project.team_name"> · {{ project.team_name }}</span>
            <span v-if="project.my_role"> · {{ project.my_role }}</span>
          </small>
        </div>
        <button
          v-if="isActiveProjectAdmin"
          class="btn btn-sm btn-outline-primary flex-shrink-0"
          @click="goEdit(project.slug || project.id)"
        >
          Edit
        </button>
        <button
          v-else
          class="btn btn-sm btn-outline-primary flex-shrink-0"
          @click="openWorkspace(project)"
        >
          Open
        </button>
      </li>
    </ul>

    <div v-else class="text-center my-5">
      <p v-if="statusFilter === 'archived'" class="text-muted mb-0">No archived projects.</p>
      <p v-else class="text-muted mb-0">No projects found.</p>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { canManageTeam } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const {
  isActiveProjectAdmin,
  setActiveProject,
} = useTeamContext();

const projects = ref([]);
const loading = ref(true);
const errorMessage = ref('');

function statusFromQuery(value) {
  return ['active', 'archived', 'all'].includes(String(value || '')) ? String(value) : 'active';
}

const statusFilter = ref(statusFromQuery(route.query.status));
const canCreateProject = computed(() =>
  canManageTeam(userStore.user?.role, userStore.user?.caps)
);

const visibleProjects = computed(() =>
  Array.isArray(projects.value) ? projects.value : []
);

async function loadProjectList() {
  loading.value = true;
  try {
    const res = await api.get('projects', { ...authHeaders(), params: { status: statusFilter.value } });
    projects.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load projects.';
    projects.value = [];
  } finally {
    loading.value = false;
  }
}

function onStatusFilterChange(value) {
  statusFilter.value = statusFromQuery(value);
  const query = { ...route.query };
  delete query.notice;
  delete query.project;
  if (statusFilter.value === 'active') delete query.status;
  else query.status = statusFilter.value;
  router.replace({ query });
  loadProjectList();
}

watch(
  () => route.query.status,
  (value) => {
    const next = statusFromQuery(value);
    if (next === statusFilter.value) return;
    statusFilter.value = next;
    loadProjectList();
  }
);

onMounted(() => {
  document.title = 'Projects';
  loadProjectList();
});

function goEdit(projectRef) {
  setActiveProject(projectRef);
  const project = visibleProjects.value.find(
    (p) => String(p.slug || p.id) === String(projectRef) || String(p.id) === String(projectRef)
  );
  const query = project?.status === 'archived' ? { tab: 'settings' } : undefined;
  router.push({ name: 'adminProjectsEdit', params: { id: projectRef }, query });
}

function openWorkspace(project) {
  setActiveProject(String(project.id));
  router.push({ name: 'projectWorkspace', params: { id: project.slug || project.id } });
}
</script>
