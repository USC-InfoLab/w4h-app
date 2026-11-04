<template>
  <div v-if="showSwitcher" ref="rootEl" class="dropdown team-context-switcher">
    <button
      ref="toggleEl"
      class="dropdown-toggle team-context-trigger"
      type="button"
      id="projectContextDropdown"
      data-bs-toggle="dropdown"
      data-bs-auto-close="true"
      aria-expanded="false"
      :aria-label="triggerAria"
    >
      <span class="team-context-label">
        <span class="team-context-prefix">Project</span>
        {{ activeProjectName || 'Select project' }}
      </span>
      <span v-if="activeProjectIsArchived" class="team-context-archived">Archived</span>
    </button>

    <ul class="dropdown-menu team-context-menu" aria-labelledby="projectContextDropdown">
      <li v-if="loading">
        <span class="dropdown-item-text small text-muted">Loading…</span>
      </li>
      <li v-else-if="loadError">
        <span class="dropdown-item-text small text-danger">{{ loadError }}</span>
      </li>
      <template v-else>
        <li v-if="!projectChoices.length">
          <span class="dropdown-item-text small text-muted">
            {{ hasAnyProject ? 'No active projects' : 'No projects yet' }}
          </span>
        </li>
        <template v-for="group in projectGroups" :key="'team-' + group.id">
          <li v-if="showTeamHeaders">
            <h6 class="dropdown-header">{{ group.name }}</h6>
          </li>
          <li v-for="project in group.projects" :key="'proj-' + project.id">
            <button
              type="button"
              class="dropdown-item team-context-item"
              :class="{ 'is-current': isCurrent(project) }"
              @click.prevent="onSelectProject(project)"
            >
              <span class="team-context-item-body">
                <span class="team-context-item-name">{{ project.name }}</span>
                <span v-if="project.roleLabel" class="team-context-item-role">{{ project.roleLabel }}</span>
              </span>
              <i v-if="isCurrent(project)" class="bi bi-check2 team-context-check" aria-hidden="true"></i>
            </button>
          </li>
        </template>
        <li><hr class="dropdown-divider" /></li>
        <li v-if="canAddProject">
          <button type="button" class="dropdown-item" @click.prevent="onAddProject">
            Add project
          </button>
        </li>
        <li>
          <button type="button" class="dropdown-item" @click.prevent="onArchivedProjects">
            Archived projects
          </button>
        </li>
      </template>
    </ul>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Dropdown } from 'bootstrap';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { canManageTeam, isSuperAdmin } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const isPlatformAdmin = computed(() => isSuperAdmin(user.value?.role));
const canAddProject = computed(() => canManageTeam(user.value?.role, user.value?.caps));

const rootEl = ref(null);
const toggleEl = ref(null);
let rootDropdown = null;

const {
  projectChoices,
  hasAnyProject,
  loading,
  loadError,
  activeTeamId,
  activeProjectId,
  activeProject,
  activeProjectName,
  activeProjectRoleLabel,
  loadProjects,
  setActiveProject,
} = useTeamContext();

const activeProjectIsArchived = computed(() => activeProject.value?.status === 'archived');

const projectGroups = computed(() => {
  const byTeam = new Map();
  for (const project of projectChoices.value) {
    const id = project.teamId || '_';
    if (!byTeam.has(id)) {
      byTeam.set(id, { id, name: project.teamName || 'Team', projects: [] });
    }
    byTeam.get(id).projects.push(project);
  }
  return [...byTeam.values()].sort((a, b) => a.name.localeCompare(b.name));
});
const showTeamHeaders = computed(() => projectGroups.value.length > 1);

const showSwitcher = computed(
  () => !isPlatformAdmin.value && (loading.value || hasAnyProject.value || canAddProject.value)
);

const triggerAria = computed(() => {
  if (!activeProjectName.value) return 'Select project';
  const archived = activeProjectIsArchived.value ? ', archived' : '';
  const role = activeProjectRoleLabel.value ? ` (${activeProjectRoleLabel.value})` : '';
  return `Active project: ${activeProjectName.value}${archived}${role}`;
});

function isCurrent(project) {
  const id = String(activeProjectId.value || '');
  return !!id && (id === project.id || id === project.slug);
}

function hideMenu() {
  try {
    rootDropdown?.hide?.();
  } catch {
    /* ignore */
  }
}

function onSelectProject(project) {
  setActiveProject(String(project.id));
  const projectRef = project.slug || project.id;
  const onThisProject =
    route.name === 'adminProjectsEdit' &&
    (String(route.params.id) === String(projectRef) || String(route.params.id) === String(project.id));
  if (!onThisProject) {
    const method =
      route.name === 'adminProjectsEdit' ||
      route.name === 'projectWorkspace' ||
      route.name === 'adminProjects'
        ? 'replace'
        : 'push';
    router[method]({ name: 'adminProjectsEdit', params: { id: projectRef } });
  }
  hideMenu();
}

function onAddProject() {
  hideMenu();
  const query = activeTeamId.value ? { team_id: String(activeTeamId.value) } : {};
  router.push({ name: 'adminProjectsAdd', query });
}

function onArchivedProjects() {
  hideMenu();
  router.push({ name: 'adminProjects', query: { status: 'archived' } });
}

function initDropdown() {
  if (toggleEl.value) {
    rootDropdown = Dropdown.getOrCreateInstance(toggleEl.value);
  }
}

onMounted(async () => {
  await loadProjects();
  await nextTick();
  initDropdown();
});

watch(projectChoices, async () => {
  await nextTick();
  initDropdown();
});

onBeforeUnmount(() => {
  try {
    rootDropdown?.hide?.();
    rootDropdown?.dispose?.();
  } catch {
    /* ignore */
  }
  rootDropdown = null;
});
</script>

<style scoped>
.team-context-switcher {
  max-width: 18rem;
}

.team-context-trigger {
  display: inline-flex;
  align-items: center;
  max-width: 16rem;
  margin: 0;
  padding: 0.35rem 0.6rem;
  border: 0;
  border-radius: 0.35rem;
  background: transparent;
  color: #fff;
  font-weight: 500;
  font-size: 1rem;
  line-height: 1.25;
  white-space: nowrap;
  box-shadow: none;
  cursor: pointer;
  appearance: none;
}

.team-context-trigger:hover,
.team-context-trigger:focus,
.team-context-trigger:focus-visible,
.team-context-trigger.show {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  box-shadow: none;
}

.team-context-trigger:focus-visible {
  outline: 0;
  box-shadow: 0 0 0 0.25rem var(--bs-focus-ring-color);
}

.team-context-label {
  max-width: 14rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.team-context-prefix {
  margin-right: 0.35rem;
  font-weight: 500;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.75;
}

.team-context-archived {
  margin-left: 0.35rem;
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  opacity: 0.8;
}

.team-context-menu {
  min-width: 16rem;
}

.team-context-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  white-space: normal;
}

.team-context-item-body {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.team-context-item-name {
  font-weight: 600;
  line-height: 1.25;
}

.team-context-item-role {
  font-size: 0.8rem;
  color: var(--w4h-muted, var(--bs-secondary-color));
  line-height: 1.3;
}

.team-context-check {
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: var(--w4h-accent, var(--w4h-gold, #ffcc00));
  font-size: 1.1rem;
  font-weight: 700;
}
</style>
