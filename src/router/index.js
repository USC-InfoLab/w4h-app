import { createRouter, createWebHistory } from 'vue-router'

import Login from '../views/LoginView.vue'
import LoginWithCode from '../views/LoginWithCode.vue'
import { useUserStore } from '@/stores/user';

import api from '../utils/api'

const routes = [
  { path: '/login', name: 'login', component: Login, meta: { guest: true } },
  { path: '/loginCode', name: 'loginCode', component: LoginWithCode, meta: { guest: true } },
  { path: '/logout', redirect: '/login' },
  { path: '/', name: 'default', component: Login, meta: { guest: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: Login, meta: { guest: true } },

  { path: '/home', name: 'home', component: () => import('../views/HomeView.vue'), meta: { requiresAuth: true } },
  { path: '/datasets', name: 'projects', component: () => import('../views/ProjectsListView.vue'), meta: { requiresAuth: true } },
  { path: '/datasets/:id', name: 'projectWorkspace', component: () => import('../views/ProjectWorkspaceView.vue'), props: true, meta: { requiresAuth: true } },
  { path: '/userProfileEdit', name: 'userProfileEdit', component: () => import('../views/UserProfileEdit.vue'), meta: { requiresAuth: true } },

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
  { path: '/admin/home', name: 'adminHome', component: () => import('../views/admin/HomeView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/settings', name: 'adminSettings', component: () => import('../views/admin/SettingsView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/database', name: 'adminDatabase', redirect: '/admin/settings' },
  { path: '/admin/studies', redirect: '/admin/projects' },
  { path: '/admin/studies/add', redirect: '/admin/projects/add' },
  { path: '/admin/studies/:id/edit', redirect: (to) => ({ path: `/admin/projects/${to.params.id}/edit` }) },
  { path: '/admin/projects', name: 'adminProjects', component: () => import('../views/admin/AdminProjectsListView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/projects/add', name: 'adminProjectsAdd', component: () => import('../views/admin/AdminProjectsAdd.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/projects/:id/edit', name: 'adminProjectsEdit', component: () => import('../views/admin/AdminProjectsEdit.vue'), props: true, meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/accounts', name: 'accounts', component: () => import('../views/admin/AccountsView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/accounts/:id/edit', name: 'accountsEdit', component: () => import('../views/admin/AccountsEdit.vue'), props: true, meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/accounts/add', name: 'accountsAdd', component: () => import('../views/admin/AccountsAdd.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/users', name: 'users', component: () => import('../views/admin/UsersView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/usersAdd', name: 'usersAdd', component: () => import('../views/admin/UsersAdd.vue'), meta: { requiresAuth: true, adminPage: true } },
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

  if (to.meta.adminPage) {
    const userStore = useUserStore();
    const user = userStore.user;

    if (user.role !== 'admin') {
      return next({ path: '/home' });
    }
  }

  next();
});

export default router
