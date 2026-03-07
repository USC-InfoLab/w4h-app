import { createRouter, createWebHistory } from 'vue-router'

import Login from '../views/LoginView.vue'
import LoginWithCode from '../views/LoginWithCode.vue'
import { useUserStore } from '@/stores/user';

import api from '../utils/api'

const routes = [
  // Public routes
  { path: '/login', name: 'login', component: Login, meta: { guest: true } },
  { path: '/loginCode', name: 'loginCode', component: LoginWithCode, meta: { guest: true } },
  { path: '/logout', redirect: '/login' },
  { path: '/', name: 'default', component: Login, meta: { guest: true } },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: Login, meta: { guest: true } },

  // User routes
  { path: '/home', name: 'home', component: () => import('../views/HomeView.vue'), meta: { requiresAuth: true } },
  // { path: '/storyEdit/:id', name: 'storyEdit', component: () => import('../views/StoryEdit.vue'), meta: { requiresAuth: true } },
  // { path: '/storyAdd', name: 'storyAdd', component: () => import('../views/StoryAdd.vue'), meta: { requiresAuth: true } },
  { path: '/datasets', name: 'studies', component: () => import('../views/StudiesView.vue'), meta: { requiresAuth: true } },
  // { path: '/print/:id', name: 'print', component: () => import('../views/admin/Print.vue'), meta: { requiresAuth: true } },
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
  { path: '/admin/database', name: 'adminDatabase', component: () => import('../views/admin/DatabaseView.vue'), meta: { requiresAuth: true, adminPage: true } },
  // { path: '/admin/studies', name: 'adminStudies', component: () => import('../views/admin/studies.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/studies', name: 'adminStudies', component: () => import('../views/admin/StudiesView.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/studies/add', name: 'adminStudiesAdd', component: () => import('../views/admin/StudiesAdd.vue'), meta: { requiresAuth: true, adminPage: true } },
  { path: '/admin/studies/:id/edit', name: 'adminStudiesEdit', component: () => import('../views/admin/StudiesEdit.vue'), props: true, meta: { requiresAuth: true, adminPage: true } },
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

    if (user.role !== 'admin') {
      return next({ path: '/home' }); // or 403 page
    }
  }

  next();
});

export default router
