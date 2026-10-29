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
  [USER_ROLES.TEAM_ADMIN]: 'Admin',
  [USER_ROLES.PROJECT_USER]: 'User',
  [USER_ROLES.ADMIN]: 'Super admin',
  [USER_ROLES.RESEARCHER]: 'User',
  [USER_ROLES.CLINICIAN]: 'User',
};

export const TEAM_MEMBER_ROLE_LABELS = {
  [TEAM_MEMBER_ROLES.TEAM_ADMIN]: 'Admin',
  [TEAM_MEMBER_ROLES.MEMBER]: 'User',
};

export function isSuperAdmin(role) {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN;
}

/**
 * Team admin is per-team (`team_members.role`), not a platform role. A non–Super-admin
 * "scoped Team admin" is whoever the server flags with `user.caps.team_admin`.
 */
export function isScopedTeamAdmin(user) {
  return !!user && !isSuperAdmin(user.role) && canManageTeam(user.role, user.caps);
}

/** Platform Admin UI ("W4H Toolkit Admin") — Super admin only. Prefer server `user.caps` when present. */
export function canAccessAdminUi(role, caps = null) {
  if (caps && typeof caps.platform_admin === 'boolean') {
    return caps.platform_admin;
  }
  return isSuperAdmin(role);
}

/** Team-scoped management (users/projects/datasets for own team) — not Super admin, not Platform Admin. */
export function canManageTeam(role, caps = null) {
  if (isSuperAdmin(role)) return false;
  if (caps && typeof caps.team_admin === 'boolean') {
    return caps.team_admin;
  }
  return isTeamAdmin(role);
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || '';
}

export function teamMemberRoleLabel(role) {
  return TEAM_MEMBER_ROLE_LABELS[role] || role || 'User';
}

/** Stored project_members.role → UI. Super admin is platform-only, not a project membership. */
export function projectMemberUiValue(storedRole) {
  return storedRole === 'owner' ? 'owner' : 'editor';
}

export function projectMemberRoleLabel(storedRole) {
  return storedRole === 'owner' ? 'Admin' : 'User';
}

/** UI labels for the project switcher. */
export function projectAccessRoleLabel(isAdmin) {
  return isAdmin ? 'Admin' : 'User';
}
