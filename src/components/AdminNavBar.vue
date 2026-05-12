<template>
  <nav :class="['navbar', 'navbar-expand-md', 'navbar-dark', 'fixed-top', navbarColorClass]">
    <div class="container-fluid">
      <RouterLink class="navbar-brand" :to="{ name: 'adminHome' }">
        <img class="app-icon" :src="iconSrc" alt="W4H Logo" />
        {{ user.account_name }}
      </RouterLink>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse"
        aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarCollapse">

        <ul class="navbar-nav d-none d-md-flex">
          <li class="nav-item">
            <RouterLink :to="{ name: 'adminSettings' }" class="nav-link" active-class="active">
              <i class="bi bi-gear"></i> Settings
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :to="{ name: 'adminProjects' }" class="nav-link" active-class="active">
              <i class="bi bi-folder"></i> Projects
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :to="{ name: 'users' }" class="nav-link" :class="{ active: isUsersActive }">
              <i class="bi bi-people"></i> Users
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :to="{ name: 'docs', params: { slug: 'home' } }" class="nav-link" active-class="active">
              <i class="bi bi-question-circle"></i> Help
            </RouterLink>
          </li>
        </ul>

        <ul class="navbar-nav d-md-none">
          <li class="nav-item">
            <RouterLink :to="{ name: 'adminHome' }" class="nav-link" active-class="active">
              <i class="bi bi-house"></i> Home
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :to="{ name: 'adminSettings' }" class="nav-link" active-class="active">
              <i class="bi bi-gear"></i> Settings
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :to="{ name: 'adminProjects' }" class="nav-link" active-class="active">
              <i class="bi bi-folder"></i> Projects
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :to="{ name: 'users' }" class="nav-link" :class="isUsersActive ? 'active' : ''">
              <i class="bi bi-people"></i> Users
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :to="{ name: 'docs', params: { slug: 'home' } }" class="nav-link" active-class="active">
              <i class="bi bi-question-circle"></i> Help
            </RouterLink>
          </li>
        </ul>

        <button type="button" class="nav-link btn btn-link ms-md-auto"
          :class="{ active: routepath === '/' || routepath === '/home' }" @click="exitAdminAndGoHome"
          style="display: flex; align-items: center; gap: 0.3em;">
          <i class="bi bi-box-arrow-right"></i> Exit Admin
        </button>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { onMounted, computed, watch, nextTick } from 'vue';

import { Dropdown } from 'bootstrap';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

import { useUIStore } from '../stores/ui';
const uiStore = useUIStore();

function exitAdminAndGoHome() {
  uiStore.exitAdmin();
  router.push({ name: 'home' });
}

const isUsersActive = computed(() => {
  return (
    route.name === 'users' ||
    route.name === 'usersEdit' ||
    route.name === 'usersAdd'
  );
});

watch(
  () => userStore.user,
  (newUser) => {
    user.value = newUser;
  }
);

const navbarColorClass = computed(() =>
  uiStore.darkMode ? 'w4h-dark-nav' : 'w4h-nav'
)

const iconSrc = computed(() =>
  uiStore.darkMode ? '/w4h-dark.svg' : '/w4h-light.svg'
)

const routepath = computed(() => {
  return route.path;
});

onMounted(() => {
  nextTick(() => {
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => {
      new Dropdown(el)
    });
  });
});

</script>

<style scoped>
.app-icon {
  width: 32px;
  padding: 2px;
}

.w4h-nav {
  background-color: #FFCC00 !important;
  color: rgb(49, 49, 49) !important;
}

.w4h-dark-nav {
  background-color: #FFCC00 !important;
  color: rgb(49, 49, 49) !important;
}

.nav-link {
  color: rgb(49, 49, 49) !important;
}

.navbar-nav .nav-link {
  font-weight: 500;
}

.navbar-nav .nav-link.active {
  border-bottom: 2px solid currentColor;
}

.nav-item,
.navbar-brand {
  cursor: pointer;
}
</style>