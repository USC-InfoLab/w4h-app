/** Canonical MVP platform roles (ADR-004). Legacy `admin` aliases Super admin. */

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  TEAM_ADMIN: 'team_admin',
  PROJECT_USER: 'project_user',
  ADMIN: 'admin',
  RESEARCHER: 'researcher',
  CLINICIAN: 'clinician',
};

/** Per-team membership roles (ADR-004 / MVP v0.11). */
export const TEAM_MEMBER_ROLES = {
  TEAM_ADMIN: 'team_admin',
  MEMBER: 'member',
};

export const ROLE_LABELS = {
  [USER_ROLES.SUPER_ADMIN]: 'Super admin',
  [USER_ROLES.TEAM_ADMIN]: 'Team admin',
  [USER_ROLES.PROJECT_USER]: 'Project user',
  [USER_ROLES.ADMIN]: 'Super admin',
  [USER_ROLES.RESEARCHER]: 'Project user',
  [USER_ROLES.CLINICIAN]: 'Project user',
};

export const TEAM_MEMBER_ROLE_LABELS = {
  [TEAM_MEMBER_ROLES.TEAM_ADMIN]: 'Team admin',
  [TEAM_MEMBER_ROLES.MEMBER]: 'Member',
};

export function isSuperAdmin(role) {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN;
}

export function isTeamAdmin(role) {
  return role === USER_ROLES.TEAM_ADMIN;
}

/** Platform Admin UI ("W4H Toolkit Admin") — Super admin only. Prefer server `user.caps` when present. */
export function canAccessAdminUi(role, caps = null) {
  if (caps && typeof caps.platform_admin === 'boolean') {
    return caps.platform_admin;
  }
  return isSuperAdmin(role);
}

/** Team-scoped management (users/projects/datasets for own team) — not the platform Admin shell. */
export function canManageTeam(role, caps = null) {
  if (caps && typeof caps.team_admin === 'boolean') {
    return caps.team_admin;
  }
  return isSuperAdmin(role) || isTeamAdmin(role);
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || '';
}

export function teamMemberRoleLabel(role) {
  return TEAM_MEMBER_ROLE_LABELS[role] || role || 'Member';
}
