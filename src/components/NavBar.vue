<template>
  <nav :class="['navbar', 'navbar-expand-md', 'fixed-top', navbarColorClass]">
    <div class="container-fluid">
      <RouterLink class="navbar-brand" :class="{ active: isHomeActive }" :to="{ name: 'home' }">
        <img class="app-icon" :src="iconSrc" alt="W4H Logo" />
        W4H Toolkit
      </RouterLink>

      <!-- Hamburger button for small screens -->
      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse"
        aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarCollapse">
        <!-- CENTER: Navigation -->
        <div class="flex-grow-1 d-md-flex justify-content-center">
          <ul class="navbar-nav w-100 justify-content-center flex-md-row flex-column">
            <li class="nav-item">
              <RouterLink :to="{ name: 'projects' }" class="nav-link" :class="{ active: isProjectsActive }">
                <i class="bi bi-beaker"></i> Projects
              </RouterLink>
            </li>
            <li class="nav-item">
              <RouterLink :to="{ name: 'docs', params: { slug: 'home' } }" class="nav-link" :class="{ active: isHelpActive }">
                <i class="bi bi-question-circle"></i> Help
              </RouterLink>
            </li>
          </ul>
        </div>

        <!-- RIGHT: User dropdown -->
        <form class="d-flex mt-2 mt-md-0">
          <div class="dropdown w-100 w-md-auto">
            <a class="dropdown-toggle text-reset d-flex align-items-center" href="#" role="button" id="menuDropdown"
              data-bs-toggle="dropdown" aria-expanded="false" style="text-decoration: none;">
              <i class="bi bi-person-circle me-2" style="font-size: 1.25rem;"></i>
              {{ user.name ? user.name : '' }}
            </a>
            <ul class="dropdown-menu dropdown-menu-end" aria-labelledby="menuDropdown">
              <li class="dropdown-item">{{ user.name }}</li>
              <!-- <li class="dropdown-header text-secondary">{{ user.email }}</li> -->
              <li>
                <hr class="dropdown-divider">
              </li>
              <li><a class="dropdown-item" @click="onProfileButtonClick">
                  <i class="bi bi-gear me-2"></i> Account Settings
                </a></li>
              <li v-if="user.role === 'admin'"><a class="dropdown-item admin-entry" @click="onAdminButtonClick">
                  <i class="bi bi-toggles me-2"></i> Admin Settings
                </a></li>
              <li><a data-cy='logout-menu-item' class="dropdown-item" @click="onSignOutClick">Sign out</a></li>
            </ul>
          </div>
        </form>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { onMounted, computed, nextTick } from 'vue';
import { Dropdown } from 'bootstrap';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useUIStore } from '../stores/ui';
import { storeToRefs } from 'pinia';

const router = useRouter();
const route = useRoute();

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const uiStore = useUIStore();

const navbarColorClass = computed(() => uiStore.darkMode ? 'w4h-dark-nav' : 'w4h-nav');
const iconSrc = computed(() => uiStore.darkMode ? '/w4h-dark.svg' : '/w4h-light.svg');

const isHomeActive = computed(() => route.name === 'home');
const isProjectsActive = computed(() =>
  route.name === 'projects' || route.name === 'projectWorkspace'
);
const isHelpActive = computed(() =>
  route.name === 'docs' || route.name === 'docNew'
);

onMounted(() => {
  nextTick(() => {
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(el => new Dropdown(el));
  });
});

function onProfileButtonClick() {
  router.push({ name: 'userProfileEdit' });
}

function onAdminButtonClick() {
  uiStore.enterAdmin();
  router.push({ name: 'adminHome' });
}

function onSignOutClick() {
  localStorage.removeItem('w4h.user.token');
  userStore.clearUser();
  uiStore.exitAdmin();
  router.push({ name: 'login' });
}
</script>

<style scoped>
.app-icon {
  width: 32px;
  padding: 2px;
}

/* Navbar background */
.w4h-nav,
.w4h-dark-nav {
  background-color: rgb(99, 0, 0) !important;
  color: white !important;
  /* dark gray text */
}

.w4h-dark-nav,
.navbar-brand,
.navbar-nav .nav-link {
  color: white !important;
  /* dark gray text */
}

/* Active link underline */
.navbar-brand.active,
.navbar-nav .nav-link.active {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 0.35em;
  font-weight: 600;
}

.navbar-brand,
.nav-item>a {
  cursor: pointer;
}

.dropdown-item {
  cursor: pointer !important;
}

/* Combined rule for both modes */
.w4h-nav,
.w4h-dark-nav {
  background-color: rgb(99, 0, 0) !important;
  color: whitesmoke !important;
}

.navbar-nav .nav-link {
  font-weight: 500;
}

/* Admin entry keeps original dark background with light text */
.w4h-dark-nav .admin-entry {
  background-color: rgb(99, 0, 0) !important;
  color: whitesmoke !important;
}

.w4h-nav .admin-entry,
.w4h-dark-nav .admin-entry {
  background-color: #767676 !important;
  color: white !important;
}

/* Small screen adjustments */
@media (max-width: 767.98px) {
  .navbar-nav {
    flex-direction: column;
    align-items: flex-start;
  }

  .navbar-nav .nav-item {
    width: 100%;
  }

  .navbar-nav .nav-link {
    width: 100%;
    padding-left: 1rem;
    padding-right: 1rem;
  }

  form.d-flex {
    width: 100%;
    margin-top: 0.5rem;
  }

  .dropdown-menu {
    width: 100%;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  }
}
</style>
