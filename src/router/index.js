import { createRouter, createWebHistory } from 'vue-router'

import Login from '../views/LoginView.vue'
import LoginWithCode from '../views/LoginWithCode.vue'
import { useUserStore } from '@/stores/user';
import { canAccessAdminUi, isSuperAdmin } from '@/utils/roles';

import api from '../utils/api'

const routes = [
  // Public routes
  { path: '/login', name: 'login', component: Login, meta: { guest: true } },
  { path: '/loginCode', name: 'loginCode', component: LoginWithCode, meta: { guest: true } },
  { path: '/invite/:token', name: 'acceptInvite', component: () => import('../views/AcceptInviteView.vue'), meta: { guest: true } },
  { path: '/logout', redirect: '/login' },
  { path: '/', name: 'default', component: Login, meta: { guest: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: Login, meta: { guest: true } },

  // User routes
  { path: '/home', name: 'home', component: () => import('../views/HomeView.vue'), meta: { requiresAuth: true } },
  { path: '/projects', name: 'projects', component: () => import('../views/ProjectsView.vue'), meta: { requiresAuth: true } },
  { path: '/projects/:id', name: 'projectWorkspace', component: () => import('../views/ProjectWorkspaceView.vue'), props: true, meta: { requiresAuth: true } },
  { path: '/userProfileEdit', name: 'userProfileEdit', component: () => import('../views/UserProfileEdit.vue'), meta: { requiresAuth: true } },

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
  // Admin routes
  { path: '/admin/home', name: 'adminHome', component: () => import('../views/admin/HomeView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/settings', name: 'adminSettings', component: () => import('../views/admin/SettingsView.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/database', name: 'adminDatabase', redirect: '/admin/settings' },
  { path: '/admin/teams', name: 'adminTeams', component: () => import('../views/admin/TeamsView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/teams/add', name: 'adminTeamsAdd', component: () => import('../views/admin/TeamsAdd.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/teams/:id/edit', name: 'adminTeamsEdit', component: () => import('../views/admin/TeamsEdit.vue'), props: true, meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/projects', name: 'adminProjects', component: () => import('../views/admin/ProjectsView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/projects/add', name: 'adminProjectsAdd', component: () => import('../views/admin/ProjectsAdd.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/projects/:id/edit', name: 'adminProjectsEdit', component: () => import('../views/admin/ProjectsEdit.vue'), props: true, meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/datasets', name: 'adminDatasets', component: () => import('../views/admin/DatasetsView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/datasets/add', name: 'adminDatasetsAdd', component: () => import('../views/admin/DatasetsAdd.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/datasets/:id/edit', name: 'adminDatasetsEdit', component: () => import('../views/admin/DatasetsEdit.vue'), props: true, meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/accounts', name: 'accounts', component: () => import('../views/admin/AccountsView.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/accounts/:id/edit', name: 'accountsEdit', component: () => import('../views/admin/AccountsEdit.vue'), props: true, meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/accounts/add', name: 'accountsAdd', component: () => import('../views/admin/AccountsAdd.vue'), meta: { requiresAuth: true, adminPage: true, superAdminOnly: true } },
  { path: '/admin/users', name: 'users', component: () => import('../views/admin/UsersView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/users/add', name: 'usersAdd', component: () => import('../views/admin/UsersAdd.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/usersAdd', redirect: '/admin/users/add' },
  { path: '/admin/usersEdit/:email', name: 'usersEdit', component: () => import('../views/admin/UsersEdit.vue'), meta: { requiresAuth: true, adminPage: true } },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else if (to.hash) {
      const target = document.querySelector(to.hash)
      if (!target) {
        return { top: 0 }
      }
      return {
        el: to.hash,
        behavior: 'smooth', // smooth scroll to anchor
      }
    } else {
      return { top: 0 }
    }
  }
})

router.beforeEach(async (to, from, next) => {
  const token = localStorage.getItem('w4h.user.token');

  // 1. Auth required
  if (to.meta.requiresAuth && !token) {
    return next({ path: '/' });
  }

  // 2. Validate token if present
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

  // 3. Admin check
  if (to.meta.adminPage) {
    const userStore = useUserStore();
    const user = userStore.user;

    if (!canAccessAdminUi(user.role)) {
      return next({ path: '/home' });
    }

    if (to.meta.superAdminOnly && !isSuperAdmin(user.role)) {
      return next({ path: '/admin/home' });
    }
  }

  next();
});

export default router
