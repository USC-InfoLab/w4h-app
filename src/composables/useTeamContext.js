import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { useUIStore } from '@/stores/ui';
import {
  isSuperAdmin,
  TEAM_MEMBER_ROLES,
  teamMemberRoleLabel,
  projectAccessRoleLabel,
} from '@/utils/roles';

/**
 * Active **project** context (singleton). Team is an org label on the project,
 * not the permission boundary.
 */
const projects = ref([]);
const loading = ref(false);
const loadError = ref('');
let loadPromise = null;

function isAdminOnProject(project, memberships) {
  if (!project) return false;
  if (project.my_role === 'owner') return true;
  const tid = project.team_id != null ? String(project.team_id) : '';
  if (!tid) return false;
  return memberships.some(
    (m) => String(m.team_id) === tid && m.role === TEAM_MEMBER_ROLES.TEAM_ADMIN
  );
}

export function useTeamContext() {
  const userStore = useUserStore();
  const uiStore = useUIStore();
  const { user } = storeToRefs(userStore);
  const { activeTeamId, activeProjectId } = storeToRefs(uiStore);

  const memberships = computed(() =>
    Array.isArray(user.value?.team_memberships) ? user.value.team_memberships : []
  );

  const projectChoices = computed(() =>
    (Array.isArray(projects.value) ? projects.value : [])
      .map((p) => {
        const teamId = p.team_id != null ? String(p.team_id) : '';
        const admin = isSuperAdmin(user.value?.role) || isAdminOnProject(p, memberships.value);
        return {
          id: String(p.id),
          slug: p.slug || String(p.id),
          name: p.name || p.slug || String(p.id),
          teamId,
          teamName: p.team_name || '',
          myRole: p.my_role || null,
          isAdmin: admin,
          roleLabel: projectAccessRoleLabel(admin),
        };
      })
      .sort((a, b) => {
        const byTeam = (a.teamName || '').localeCompare(b.teamName || '');
        return byTeam !== 0 ? byTeam : a.name.localeCompare(b.name);
      })
  );

  const activeProject = computed(() => {
    const id = activeProjectId.value ? String(activeProjectId.value) : '';
    if (!id) return null;
    return projectChoices.value.find((p) => p.id === id || p.slug === id) || null;
  });

  const activeProjectName = computed(() => activeProject.value?.name || '');
  const isActiveProjectAdmin = computed(() => {
    if (isSuperAdmin(user.value?.role)) return true;
    return !!activeProject.value?.isAdmin;
  });
  const activeProjectRoleLabel = computed(() =>
    activeProject.value ? activeProject.value.roleLabel : ''
  );

  const activeMembership = computed(() => {
    const id = activeTeamId.value;
    if (!id) return null;
    return memberships.value.find((m) => String(m.team_id) === String(id)) || null;
  });

  const activeTeamName = computed(() => {
    if (activeProject.value?.teamName) return activeProject.value.teamName;
    if (activeMembership.value?.name) return String(activeMembership.value.name).trim();
    return '';
  });

  const activeTeamRole = computed(() => {
    if (isSuperAdmin(user.value?.role)) return TEAM_MEMBER_ROLES.TEAM_ADMIN;
    return activeMembership.value?.role === TEAM_MEMBER_ROLES.TEAM_ADMIN
      ? TEAM_MEMBER_ROLES.TEAM_ADMIN
      : activeMembership.value
        ? TEAM_MEMBER_ROLES.MEMBER
        : '';
  });

  const isActiveTeamAdmin = computed(() => isActiveProjectAdmin.value);

  const activeTeamRoleLabel = computed(() =>
    activeProjectRoleLabel.value
    || (activeTeamRole.value ? teamMemberRoleLabel(activeTeamRole.value) : '')
  );

  const teams = computed(() => {
    const byId = new Map();
    for (const m of memberships.value) {
      const id = String(m.team_id);
      byId.set(id, {
        id,
        name: m.name || 'Team',
        role: m.role === TEAM_MEMBER_ROLES.TEAM_ADMIN
          ? TEAM_MEMBER_ROLES.TEAM_ADMIN
          : TEAM_MEMBER_ROLES.MEMBER,
        roleLabel: teamMemberRoleLabel(
          m.role === TEAM_MEMBER_ROLES.TEAM_ADMIN
            ? TEAM_MEMBER_ROLES.TEAM_ADMIN
            : TEAM_MEMBER_ROLES.MEMBER
        ),
      });
    }
    for (const p of projectChoices.value) {
      if (!p.teamId || byId.has(p.teamId)) continue;
      byId.set(p.teamId, {
        id: p.teamId,
        name: p.teamName || 'Team',
        role: TEAM_MEMBER_ROLES.MEMBER,
        roleLabel: teamMemberRoleLabel(TEAM_MEMBER_ROLES.MEMBER),
      });
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  });

  const teamTree = computed(() =>
    teams.value.map((team) => ({
      ...team,
      projects: projectChoices.value.filter((p) => p.teamId === team.id),
    }))
  );

  function pickDefaultProjectId() {
    const list = projectChoices.value;
    if (!list.length) return '';
    const stored = activeProjectId.value ? String(activeProjectId.value) : '';
    if (stored && list.some((p) => p.id === stored || p.slug === stored)) {
      const match = list.find((p) => p.id === stored || p.slug === stored);
      return match?.id || '';
    }
    const adminFirst = list.find((p) => p.isAdmin);
    return (adminFirst || list[0]).id;
  }

  function applyProject(projectId) {
    const id = projectId ? String(projectId) : '';
    const row = projectChoices.value.find((p) => p.id === id || p.slug === id) || null;
    uiStore.setActiveProjectId(row?.id || id);
    uiStore.setActiveTeamId(row?.teamId || '');
  }

  function ensureActiveProject() {
    const next = pickDefaultProjectId();
    if (next && next !== String(activeProjectId.value || '')) {
      applyProject(next);
    } else if (!next && activeProjectId.value) {
      uiStore.setActiveProjectId('');
      uiStore.setActiveTeamId('');
    } else if (next) {
      const row = projectChoices.value.find((p) => p.id === next);
      if (row?.teamId && row.teamId !== String(activeTeamId.value || '')) {
        uiStore.setActiveTeamId(row.teamId);
      }
    }
  }

  async function loadProjects() {
    if (loadPromise) return loadPromise;
    loading.value = true;
    loadError.value = '';
    loadPromise = (async () => {
      try {
        const res = await api.get('projects', authHeaders());
        projects.value = Array.isArray(res.data) ? res.data : [];
      } catch (e) {
        loadError.value = e.response?.data?.error || e.message || 'Failed to load projects';
        projects.value = [];
      } finally {
        loading.value = false;
        loadPromise = null;
        ensureActiveProject();
      }
    })();
    return loadPromise;
  }

  function setActiveProject(projectId) {
    applyProject(projectId);
  }

  function setActiveTeam(teamId) {
    const next = teamId ? String(teamId) : '';
    uiStore.setActiveTeamId(next);
    const onTeam = projectChoices.value.filter((p) => p.teamId === next);
    if (!onTeam.length) return;
    const keep = onTeam.find((p) => p.id === String(activeProjectId.value || ''));
    if (!keep) applyProject(onTeam[0].id);
  }

  watch(
    () => projectChoices.value.map((p) => p.id).join(','),
    () => {
      ensureActiveProject();
    }
  );

  return {
    projects,
    loading,
    loadError,
    memberships,
    teams,
    projectChoices,
    teamTree,
    activeTeamId,
    activeTeamName,
    activeTeamRole,
    activeTeamRoleLabel,
    isActiveTeamAdmin,
    activeProjectId,
    activeProject,
    activeProjectName,
    activeProjectRoleLabel,
    isActiveProjectAdmin,
    loadProjects,
    setActiveTeam,
    setActiveProject,
    ensureActiveTeam: ensureActiveProject,
  };
}
