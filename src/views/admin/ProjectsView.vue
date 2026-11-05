<template>
  <main role="main" class="container-fluid text-start">
    <div v-if="showCatalog" class="d-flex align-items-center justify-content-between gap-3 mb-2">
      <h5 class="mb-0">
        <i class="bi bi-beaker me-1"></i>
        {{ listingArchived ? 'Archived projects' : 'Projects' }}
      </h5>
      <button
        v-if="canCreateProject && !listingArchived"
        class="btn btn-sm btn-primary text-nowrap"
        @click="$router.push({ name: 'adminProjectsAdd' })"
      >
        <i class="bi bi-plus"></i> Add project
      </button>
    </div>
    <p v-if="showCatalog" class="small text-muted mb-3">
      <template v-if="listingArchived">
        Hidden from the project menu. Nothing is deleted. Open one, then Restore in Settings to put it back.
      </template>
      <template v-else-if="isActiveProjectAdmin">
        Your projects.
      </template>
      <template v-else>
        Projects you belong to. Open one to work in it.
      </template>
    </p>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <div v-if="loading || !showCatalog" class="text-center mt-5">
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
          Open
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
      <p v-if="listingArchived" class="text-muted mb-0">No archived projects.</p>
      <p v-else class="text-muted mb-0">No projects found.</p>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { canManageTeam, isSuperAdmin } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const {
  isActiveProjectAdmin,
  setActiveProject,
  activeProject,
  activeProjectId,
  loadProjects,
} = useTeamContext();
const callerIsSuper = isSuperAdmin(userStore.user?.role);

const projects = ref([]);
const loading = ref(true);
const errorMessage = ref('');

function statusFromQuery(value) {
  return String(value || '') === 'archived' ? 'archived' : 'active';
}

const statusFilter = ref(statusFromQuery(route.query.status));
const listingArchived = computed(() => statusFilter.value === 'archived');
const showCatalog = computed(() => listingArchived.value || callerIsSuper);
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

function workspaceTarget() {
  const row = activeProject.value;
  return row?.slug || row?.id || activeProjectId.value || '';
}

async function enterListOrRedirect() {
  if (showCatalog.value) {
    document.title = listingArchived.value ? 'Archived projects' : 'Projects';
    await loadProjectList();
    return;
  }
  let id = workspaceTarget();
  if (!id) {
    await loadProjects();
    id = workspaceTarget();
  }
  if (id) {
    router.replace({ name: 'adminProjectsEdit', params: { id } });
    return;
  }
  router.replace({ name: 'adminProjectsAdd' });
}

watch(
  () => route.query.status,
  (value) => {
    const next = statusFromQuery(value);
    if (next === statusFilter.value) return;
    statusFilter.value = next;
    enterListOrRedirect();
  }
);

onMounted(() => {
  enterListOrRedirect();
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
