<template>
  <main class="ProjectsView">
    <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
      <div>
        <h3 class="mb-0">
          My Projects
          <span v-if="activeTeamName" class="text-muted fw-normal fs-6">· {{ activeTeamName }}</span>
        </h3>
        <p class="small text-muted mb-0 mt-1">Projects on your active team. Open one to enter the workspace.</p>
      </div>
      <button
        v-if="canCreateProject"
        type="button"
        class="btn btn-primary btn-sm"
        @click="openCreateModal"
      >
        + New project
      </button>
    </div>

    <div v-if="isLoading" class="overlay d-flex align-items-center justify-content-center">
      <div class="spinner-border" role="status"></div>
    </div>

    <div v-else-if="errorMessage" class="alert alert-danger" role="alert">
      {{ errorMessage }}
    </div>

    <ul v-else-if="visibleProjects.length" class="list-group">
      <li
        v-for="project in visibleProjects"
        :key="project.id"
        class="list-group-item d-flex justify-content-between align-items-center list-group-item-action"
        role="button"
        @click="openProject(project.slug || project.id)"
      >
        <span class="text-truncate">
          {{ project.name || project.id }}
          <small v-if="project.my_role" class="text-muted ms-2">{{ project.my_role }}</small>
        </span>
        <span class="badge text-bg-secondary text-truncate" style="max-width: 12rem">{{ project.slug || project.id }}</span>
      </li>
    </ul>

    <div v-else class="alert alert-secondary" role="alert">
      No projects yet{{ activeTeamName ? ` on ${activeTeamName}` : '' }}.{{ canCreateProject ? ' Create one to get started.' : '' }}
    </div>

    <div class="modal fade" tabindex="-1" ref="createModalEl" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">New project</h5>
            <button type="button" class="btn-close" aria-label="Close" @click="closeCreateModal" />
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label class="form-label">Name</label>
              <input v-model="newProject.name" class="form-control" placeholder="e.g. HRV biomarker study" />
            </div>
            <div class="mb-0">
              <label class="form-label">Description (optional)</label>
              <textarea v-model="newProject.description" class="form-control" rows="3" placeholder="Short summary" />
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeCreateModal">Cancel</button>
            <button
              type="button"
              class="btn btn-primary"
              :disabled="!newProject.name.trim() || createSaving"
              @click="submitCreateProject"
            >
              {{ createSaving ? 'Creating…' : 'Create' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup name="ProjectsView">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Modal } from 'bootstrap';

import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';
import { useUserStore } from '@/stores/user';
import { useUIStore } from '@/stores/ui';
import { canAccessAdminUi } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';

const router = useRouter();
const userStore = useUserStore();
const uiStore = useUIStore();
const { activeTeamId, activeTeamName } = useTeamContext();

const isLoading = ref(true);
const errorMessage = ref('');
const projects = ref([]);
const createSaving = ref(false);
const createModalEl = ref(null);
let createModal = null;

const newProject = ref({ name: '', description: '' });

const canCreateProject = computed(() =>
  canAccessAdminUi(userStore.user?.role) && uiStore.isAdminUI
);

const visibleProjects = computed(() => {
  const tid = activeTeamId.value;
  const rows = Array.isArray(projects.value) ? projects.value : [];
  if (!tid) return rows;
  return rows.filter((p) => String(p.team_id) === String(tid));
});

function clearLocalProjectDrafts() {
  const keysToDelete = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && key.startsWith('w4h.project.')) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach((key) => localStorage.removeItem(key));
}

function openProject(projectRef) {
  router.push({ name: 'adminProjectsEdit', params: { id: projectRef } });
}

function openCreateModal() {
  newProject.value = { name: '', description: '' };
  createModal?.show();
}

function closeCreateModal() {
  createModal?.hide();
}

async function submitCreateProject() {
  const name = newProject.value.name.trim();
  if (!name || createSaving.value) return;
  createSaving.value = true;
  try {
    const res = await api.post(
      'projects',
      {
        name,
        description: newProject.value.description.trim() || undefined
      },
      authHeaders()
    );
    const id = res.data?.slug || res.data?.id;
    closeCreateModal();
    errorMessage.value = '';
    if (id) {
      router.push({ name: 'projectWorkspace', params: { id } });
    } else {
      const list = await api.get('projects', authHeaders());
      projects.value = Array.isArray(list.data) ? list.data : [];
    }
  } catch (error) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to create project.';
  } finally {
    createSaving.value = false;
  }
}

onMounted(async () => {
  document.title = `${APP_NAME} Projects`;
  clearLocalProjectDrafts();

  try {
    const res = await api.get('projects', authHeaders());
    projects.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    projects.value = [];
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load projects.';
  } finally {
    isLoading.value = false;
  }

  await nextTick();
  if (createModalEl.value) {
    createModal = new Modal(createModalEl.value);
  }
});
</script>
