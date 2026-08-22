<template>
  <main role="main" class="container-fluid">
    <div class="row align-items-center mb-3">
      <div class="col">
        <h5 class="mb-0">
          <i class="bi bi-beaker me-1"></i>
          Projects
          <span v-if="activeProjectName" class="text-muted fw-normal fs-6">· {{ activeProjectName }}</span>
        </h5>
        <p class="small text-muted mb-0 mt-1">
          <template v-if="isActiveProjectAdmin">
            Your projects. New project can copy members from an existing one (one-time, not a live link).
          </template>
          <template v-else>
            Projects you belong to. Open one to work in the workspace.
          </template>
        </p>
      </div>
      <div v-if="isActiveProjectAdmin" class="col-auto">
        <select
          class="form-select form-select-sm"
          :value="statusFilter"
          @change="onStatusFilterChange($event.target.value)"
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>
      <div v-if="canCreateProject" class="col-auto">
        <button class="btn btn-sm btn-primary my-2" @click="$router.push({ name: 'adminProjectsAdd' })">
          <i class="bi bi-plus"></i> Add Project
        </button>
      </div>
    </div>

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
      <p class="text-muted">No projects found.</p>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { canManageTeam } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';

const router = useRouter();
const userStore = useUserStore();
const {
  activeProjectName,
  isActiveProjectAdmin,
  setActiveProject,
} = useTeamContext();

const projects = ref([]);
const loading = ref(true);
const errorMessage = ref('');
const statusFilter = ref('active');
const canCreateProject = computed(() =>
  canManageTeam(userStore.user?.role, userStore.user?.caps)
);

const visibleProjects = computed(() =>
  Array.isArray(projects.value) ? projects.value : []
);

async function loadProjects() {
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
  statusFilter.value = value;
  loadProjects();
}

onMounted(() => {
  document.title = 'Projects';
  loadProjects();
});

function goEdit(projectRef) {
  setActiveProject(projectRef);
  router.push({ name: 'adminProjectsEdit', params: { id: projectRef } });
}

function openWorkspace(project) {
  setActiveProject(String(project.id));
  router.push({ name: 'projectWorkspace', params: { id: project.slug || project.id } });
}
</script>
