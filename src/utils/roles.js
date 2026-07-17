/** Canonical MVP platform roles (ADR-004). Legacy `admin` aliases Super admin. */

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  TEAM_ADMIN: 'team_admin',
  PROJECT_USER: 'project_user',
  ADMIN: 'admin',
  RESEARCHER: 'researcher',
  CLINICIAN: 'clinician',
};

export const ROLE_LABELS = {
  [USER_ROLES.SUPER_ADMIN]: 'Super admin',
  [USER_ROLES.TEAM_ADMIN]: 'Team admin',
  [USER_ROLES.PROJECT_USER]: 'Project user',
  [USER_ROLES.ADMIN]: 'Super admin',
  [USER_ROLES.RESEARCHER]: 'Project user',
  [USER_ROLES.CLINICIAN]: 'Project user',
};

export function isSuperAdmin(role) {
  return role === USER_ROLES.SUPER_ADMIN || role === USER_ROLES.ADMIN;
}

export function isTeamAdmin(role) {
  return role === USER_ROLES.TEAM_ADMIN;
}

export function canAccessAdminUi(role) {
  return isSuperAdmin(role) || isTeamAdmin(role);
}

export function roleLabel(role) {
  return ROLE_LABELS[role] || role || '';
}
