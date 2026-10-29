import { createRouter, createWebHistory } from 'vue-router'

import Login from '../views/LoginView.vue'
import LoginWithCode from '../views/LoginWithCode.vue'
import { useUserStore } from '@/stores/user'
import { canAccessAdminUi, canManageTeam, isSuperAdmin } from '@/utils/roles'
import { useUIStore } from '@/stores/ui'

import api from '../utils/api'

const routes = [
  // Public routes
  { path: '/login', name: 'login', component: Login, meta: { guest: true } },
  { path: '/loginCode', name: 'loginCode', component: LoginWithCode, meta: { guest: true } },
  { path: '/request-access', name: 'requestAccess', component: () => import('../views/RequestAccessView.vue'), meta: { guest: true } },
  { path: '/request-access/verify', name: 'requestAccessVerify', component: () => import('../views/RequestAccessVerifyView.vue'), meta: { guest: true } },
  { path: '/invite/:token', name: 'acceptInvite', component: () => import('../views/AcceptInviteView.vue'), meta: { guest: true } },
  { path: '/logout', redirect: '/login' },
  { path: '/', name: 'default', component: Login, meta: { guest: true } },

  // User routes
  { path: '/home', name: 'home', component: () => import('../views/HomeView.vue'), meta: { requiresAuth: true } },
  { path: '/projects', name: 'projects', component: () => import('../views/ProjectsView.vue'), meta: { requiresAuth: true } },
  { path: '/projects/:id', name: 'projectWorkspace', component: () => import('../views/ProjectWorkspaceView.vue'), props: true, meta: { requiresAuth: true } },
  { path: '/contributions', name: 'contributions', component: () => import('../views/ContributionsView.vue'), meta: { requiresAuth: true } },
  { path: '/contributions/:slug', name: 'contributionDetail', component: () => import('../views/ContributionDetailView.vue'), props: true, meta: { requiresAuth: true } },
  { path: '/packages', redirect: '/contributions' },
  { path: '/packages/:slug', redirect: (to) => ({ name: 'contributionDetail', params: { slug: to.params.slug } }) },
  { path: '/userProfileEdit', name: 'userProfileEdit', component: () => import('../views/UserProfileEdit.vue'), meta: { requiresAuth: true } },
  { path: '/team/new', name: 'newTeam', component: () => import('../views/NewTeamView.vue'), meta: { requiresAuth: true } },
  { path: '/team/settings', name: 'teamSettings', component: () => import('../views/TeamSettingsView.vue'), meta: { requiresAuth: true } },

  // Docs routes
  {
    path: '/docs/new',
    name: 'docNew',
    component: () => import('../views/docs/DocsView.vue'),
    meta: { requiresAuth: true },
    props: { isNewDoc: true }
  },
  {
    path: '/docs',
    redirect: '/docs/home'
  },
  {
    path: '/docs/:slug',
    name: 'docs',
    component: () => import('../views/docs/DocsView.vue'),
    meta: { requiresAuth: true },
    props: true
  },

  // Platform Admin UI — Super admin only
  { path: '/admin/home', name: 'adminHome', component: () => import('../views/admin/HomeView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/access-requests', name: 'adminAccessRequests', component: () => import('../views/admin/AccessRequestsView.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/invite-admin', name: 'adminInviteAdmin', component: () => import('../views/admin/UsersAdd.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true, platformInviteAdmin: true } },
  { path: '/admin/contributions', name: 'adminContributions', component: () => import('../views/admin/ContributionsAdminView.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/settings', name: 'adminSettings', component: () => import('../views/admin/SettingsView.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/audit-log', name: 'adminAuditLog', component: () => import('../views/admin/AuditLogView.vue'), meta: { requiresAuth: true } },
  { path: '/admin/usage', name: 'adminUsage', component: () => import('../views/admin/UsageView.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/api-usage', redirect: '/admin/usage' },
  { path: '/admin/style-guide', name: 'adminStyleGuide', component: () => import('../views/admin/StyleGuideView.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/database', name: 'adminDatabase', redirect: '/admin/settings' },
  { path: '/admin/accounts', name: 'accounts', component: () => import('../views/admin/AccountsView.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/accounts/:id/edit', name: 'accountsEdit', component: () => import('../views/admin/AccountsEdit.vue'), props: true, meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/accounts/add', name: 'accountsAdd', component: () => import('../views/admin/AccountsAdd.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },

  // Team management — Super admin or Team admin; rendered in the normal app shell (not platform Admin UI)
  { path: '/admin/teams', name: 'adminTeams', component: () => import('../views/admin/TeamsView.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/teams/:id/edit', name: 'adminTeamsEdit', component: () => import('../views/admin/TeamsEdit.vue'), props: true, meta: { requiresAuth: true } },
  { path: '/admin/projects', name: 'adminProjects', component: () => import('../views/admin/ProjectsView.vue'), meta: { requiresAuth: true } },
  { path: '/admin/projects/add', name: 'adminProjectsAdd', component: () => import('../views/admin/ProjectsAdd.vue'), meta: { requiresAuth: true, teamAdminPage: true } },
  { path: '/admin/projects/:id/edit', name: 'adminProjectsEdit', component: () => import('../views/admin/ProjectsEdit.vue'), props: true, meta: { requiresAuth: true } },
  { path: '/admin/datasets', name: 'adminDatasets', component: () => import('../views/admin/DatasetsView.vue'), meta: { requiresAuth: true } },
  { path: '/admin/datasets/add', name: 'adminDatasetsAdd', component: () => import('../views/admin/DatasetsAdd.vue'), meta: { requiresAuth: true, teamAdminPage: true } },
  { path: '/admin/datasets/shares', name: 'adminDatasetsShares', component: () => import('../views/admin/DatasetsSharesView.vue'), meta: { requiresAuth: true, teamAdminPage: true } },
  { path: '/admin/datasets/:id/edit', name: 'adminDatasetsEdit', component: () => import('../views/admin/DatasetsEdit.vue'), props: true, meta: { requiresAuth: true, teamAdminPage: true } },
  { path: '/admin/users', name: 'users', component: () => import('../views/admin/UsersView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/users/add', name: 'usersAdd', component: () => import('../views/admin/UsersAdd.vue'), meta: { requiresAuth: true, teamAdminPage: true } },
  { path: '/admin/usersAdd', redirect: '/admin/users/add' },
  { path: '/admin/usersEdit/:email', name: 'usersEdit', component: () => import('../views/admin/UsersEdit.vue'), meta: { requiresAuth: true, teamAdminPage: true } },

  { path: '/:pathMatch(.*)*', name: 'not-found', component: Login, meta: { guest: true } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      const id = to.hash.startsWith('#') ? to.hash.slice(1) : to.hash
      const target = id ? document.getElementById(id) : null
      // Help pages load HTML async; scrolling to top here races DocsView's
      // hash scroll and leaves /docs/…#section stuck at the start of the page.
      if (!target) {
        return false
      }
      return {
        el: to.hash,
        behavior: 'smooth',
      }
    } else {
      return { top: 0 }
    }
  }
})

router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('w4h.user.token');

  if (to.meta.requiresAuth && !token) {
    return next({ path: '/' });
  }

  if (token) {
    try {
      const res = await api.post('users/token-valid', { token });

      if (res.data.tokenExpired) {
        localStorage.removeItem('w4h.user.token');
        return next({ path: '/' });
      }
    } catch (error) {
      console.log('Token validation error:', error);
      localStorage.removeItem('w4h.user.token');
      return next({ path: '/' });
    }
  }

  const userStore = useUserStore();
  const user = userStore.user;
  const uiStore = useUIStore();

  // Never leave non–platform-admins stuck in platform Admin UI mode
  if (token && !canAccessAdminUi(user?.role, user?.caps) && uiStore.isAdminUI) {
    uiStore.exitAdmin();
  }

  // Super admin always stays in Platform Admin (bootstrap / ops — not the team app shell)
  if (token && canAccessAdminUi(user?.role, user?.caps)) {
    uiStore.enterAdmin();
    if (to.name === 'home' || to.name === 'projects' || to.name === 'default') {
      return next({ name: 'adminHome' });
    }
  }

  // An approved Admin with no team yet (ADR-028) creates their team first.
  if (
    token &&
    !isSuperAdmin(user?.role) &&
    user?.caps?.can_create_teams &&
    !(user?.team_memberships || []).length &&
    to.name !== 'newTeam' &&
    !to.meta.guest
  ) {
    return next({ name: 'newTeam' });
  }

  if (to.meta.adminPage) {
    if (!canAccessAdminUi(user?.role, user?.caps)) {
      return next({ path: '/home' });
    }
    if (to.meta.superAdminOnly && !isSuperAdmin(user?.role)) {
      return next({ path: '/admin/home' });
    }
  }

  if (to.meta.teamAdminPage) {
    if (isSuperAdmin(user?.role)) {
      return next({ name: 'adminHome' });
    }
    if (!canManageTeam(user?.role, user?.caps)) {
      return next({ path: '/home' });
    }
    if (to.meta.superAdminOnly && !isSuperAdmin(user?.role)) {
      return next({ path: '/admin/teams' });
    }
  }

  const trialOperatorRoutes = new Set([
    'adminTeams',
    'adminTeamsEdit',
    'adminProjects',
    'adminProjectsAdd',
    'adminProjectsEdit',
    'adminDatasets',
    'adminDatasetsAdd',
    'adminDatasetsEdit',
    'adminDatasetsShares',
    'users',
    'usersEdit',
    'projects',
    'projectWorkspace',
    'home',
    'newTeam',
    'teamSettings',
  ]);
  if (token && isSuperAdmin(user?.role) && trialOperatorRoutes.has(to.name)) {
    return next({ name: 'adminHome' });
  }

  next();
});

export default router
