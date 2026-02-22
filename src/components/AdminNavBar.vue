<template>
  <nav :class="['navbar', 'navbar-expand-md', 'navbar-dark', 'fixed-top', navbarColorClass]">
    <div class="container-fluid">
      <RouterLink class="navbar-brand" :to="{ name: 'adminHome' }">
        <img class="app-icon" :src="iconSrc" alt="W4H Logo" />
        <!-- {{ user.account_name }} -->
      </RouterLink>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse"
        aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarCollapse">

        <div class="d-none d-md-flex flex-grow-1 justify-content-center">
          <ul class="navbar-nav">
            <li class="nav-item">
              <RouterLink :to="{ name: 'docs' }" class="nav-link" active-class="active">
                <i class="bi bi-book"></i> Docs
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink :to="{ name: 'accounts' }" class="nav-link" active-class="active"
                :class="{ active: route.name === 'accounts' || route.name === 'accountsAdd' || route.name === 'accountsEdit' }">
                <i class="bi bi-building"></i> Accounts
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink :to="{ name: 'users' }" class="nav-link" active-class="active">
                <i class="bi bi-person"></i> Users
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink :to="{ name: 'adminDatasets' }" class="nav-link" active-class="active">
                <i class="bi bi-database"></i> Data
              </RouterLink>
            </li>
          </ul>
        </div>

        <ul class="navbar-nav d-md-none">
          <li class="nav-item">
            <RouterLink :to="{ name: 'adminHome' }" class="nav-link" active-class="active">
              <i class="bi bi-person"></i> Home
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :to="{ name: 'users' }" class="nav-link" :class="isUsersActive ? 'active' : ''">
              <i class="bi bi-person"></i> Users
            </RouterLink>
          </li>
          <li class="nav-item">
            <RouterLink :to="{ name: 'adminDatasets' }" class="nav-link" active-class="active">
              <i class="bi bi-database"></i> Data
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
  uiStore.exitAdmin();   // update store
  router.push({ name: 'home' }); // navigate
}

const isUsersActive = computed(() => {
  return (
    route.name === 'users' ||
    route.name === 'usersEdit' ||
    route.name === 'usersAdd'
  );
});

// Watch for changes in the user property
watch(
  () => userStore.user,
  (newUser) => {
    // Update the user reference with the new value
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
  background-color: rgb(99, 0, 0) !important;
  color: white !important;
}

.w4h-dark-nav {
  background-color: rgb(99, 0, 0) !important;
  color: white !important;
}

.nav-link {
  color: white !important;
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