<template>
  <nav ref="navEl" :class="['navbar', 'navbar-expand-md', 'navbar-dark', 'fixed-top', navbarColorClass]">
    <div class="container-fluid">
      <RouterLink
        class="navbar-brand"
        :class="{ active: isHomeActive }"
        :to="{ name: 'home' }"
        data-bs-toggle="tooltip"
        data-bs-placement="bottom"
        data-bs-title="W4H Toolkit"
        aria-label="W4H Toolkit home"
      >
        <img class="app-icon" src="/w4h-mark.svg" alt="" />
        <span class="brand-text d-none d-xl-inline">W4H Toolkit</span>
        <span class="brand-text d-none d-md-inline d-xl-none">W4H</span>
      </RouterLink>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarCollapse"
        aria-controls="navbarCollapse"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarCollapse">
        <ul class="navbar-nav">
          <li v-for="item in visibleNavItems" :key="item.key" class="nav-item">
            <RouterLink
              :to="item.to"
              class="nav-link nav-link-compact"
              :class="{ active: item.active }"
              data-bs-toggle="tooltip"
              data-bs-placement="bottom"
              :data-bs-title="item.label"
              :aria-label="item.label"
            >
              <i :class="item.icon" aria-hidden="true"></i>
              <span class="nav-link-label">{{ item.label }}</span>
            </RouterLink>
          </li>
        </ul>

        <div class="dropdown ms-md-auto mt-2 mt-md-0">
          <a
            class="dropdown-toggle text-reset d-flex align-items-center account-trigger"
            href="#"
            role="button"
            id="menuDropdown"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="Account menu"
          >
            <i class="bi bi-person-circle account-avatar" aria-hidden="true"></i>
          </a>
          <ul class="dropdown-menu dropdown-menu-end account-menu" aria-labelledby="menuDropdown">
            <li>
              <RouterLink class="dropdown-item user-account-link" :to="{ name: 'userProfileEdit' }">
                <div class="small text-secondary">Signed in as</div>
                <div v-if="displayName" class="fw-semibold">{{ displayName }}</div>
                <div
                  v-if="user.email"
                  class="account-email"
                  :class="displayName ? 'small text-secondary' : 'fw-semibold'"
                >
                  {{ user.email }}
                </div>
              </RouterLink>
            </li>
            <li><hr class="dropdown-divider" /></li>
            <li>
              <button type="button" class="dropdown-item" @click="showAbout = true">
                About
              </button>
            </li>
            <li>
              <button type="button" class="dropdown-item" @click="showReportIssue = true">
                Report an issue
              </button>
            </li>
            <li><hr class="dropdown-divider" /></li>
            <li>
              <a data-cy="logout-menu-item" class="dropdown-item" href="#" @click.prevent="onSignOutClick">
                Sign out
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </nav>

  <AboutModal :open="showAbout" @close="showAbout = false" />
  <ReportIssueModal :open="showReportIssue" @close="showReportIssue = false" />
</template>

<script setup>
import { onMounted, onBeforeUnmount, computed, watch, nextTick, ref } from 'vue';
import { Dropdown, Tooltip } from 'bootstrap';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '../stores/user';
import { useUIStore } from '../stores/ui';
import { storeToRefs } from 'pinia';
import { canManageTeam } from '@/utils/roles';
import AboutModal from '@/components/AboutModal.vue';
import ReportIssueModal from '@/components/ReportIssueModal.vue';
import { clearUsageSessionFlags } from '@/utils/clientUsage';

const router = useRouter();
const route = useRoute();

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const uiStore = useUIStore();

const tooltipInstances = ref([]);
const navEl = ref(null);
const showAbout = ref(false);
const showReportIssue = ref(false);

const navbarColorClass = computed(() => (uiStore.darkMode ? 'w4h-dark-nav' : 'w4h-nav'));
const showTeamNav = computed(() => canManageTeam(user.value?.role, user.value?.caps));

const displayName = computed(() => {
  const name = String(user.value?.name || '').trim();
  const email = String(user.value?.email || '').trim();
  if (!name || (email && name.toLowerCase() === email.toLowerCase())) {
    return '';
  }
  return name;
});

const isHomeActive = computed(() => route.name === 'home');
const isProjectsActive = computed(() =>
  route.name === 'projects' ||
  route.name === 'projectWorkspace' ||
  route.name === 'adminProjects' ||
  route.name === 'adminProjectsAdd' ||
  route.name === 'adminProjectsEdit'
);
const isUsersActive = computed(() =>
  route.name === 'users' || route.name === 'usersAdd' || route.name === 'usersEdit'
);
const isDatasetsActive = computed(() =>
  route.name === 'adminDatasets' ||
  route.name === 'adminDatasetsAdd' ||
  route.name === 'adminDatasetsEdit'
);
const isTeamsActive = computed(() =>
  route.name === 'adminTeams' || route.name === 'adminTeamsEdit'
);
const isHelpActive = computed(() => route.name === 'docs' || route.name === 'docNew');

const navItems = computed(() => [
  {
    key: 'projects',
    label: 'Projects',
    icon: 'bi bi-beaker',
    to: showTeamNav.value ? { name: 'adminProjects' } : { name: 'projects' },
    active: isProjectsActive.value,
    show: true,
  },
  {
    key: 'datasets',
    label: 'Datasets',
    icon: 'bi bi-database',
    to: { name: 'adminDatasets' },
    active: isDatasetsActive.value,
    show: showTeamNav.value,
  },
  {
    key: 'teams',
    label: 'Teams',
    icon: 'bi bi-people-fill',
    to: { name: 'adminTeams' },
    active: isTeamsActive.value,
    show: showTeamNav.value,
  },
  {
    key: 'users',
    label: 'Users',
    icon: 'bi bi-people',
    to: { name: 'users' },
    active: isUsersActive.value,
    show: showTeamNav.value,
  },
  {
    key: 'help',
    label: 'Help',
    icon: 'bi bi-question-circle',
    to: { name: 'docs', params: { slug: 'home' } },
    active: isHelpActive.value,
    show: true,
  },
]);

const visibleNavItems = computed(() => navItems.value.filter((item) => item.show));

function disposeTooltips() {
  tooltipInstances.value.forEach((t) => t.dispose());
  tooltipInstances.value = [];
}

/** Icon-only strip (md–lg): tooltips help. Small / xl+ show labels — tooltips are redundant. */
function shouldShowNavLinkTooltips() {
  return window.matchMedia('(min-width: 768px) and (max-width: 1199.98px)').matches;
}

function shouldShowBrandTooltip() {
  return window.matchMedia('(max-width: 767.98px)').matches;
}

function initTooltips() {
  disposeTooltips();
  const root = navEl.value;
  if (!root) return;

  const linkTips = shouldShowNavLinkTooltips();
  const brandTip = shouldShowBrandTooltip();

  root.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    const isBrand = el.classList.contains('navbar-brand');
    if (isBrand && !brandTip) return;
    if (!isBrand && !linkTips) return;

    tooltipInstances.value.push(
      new Tooltip(el, {
        placement: 'bottom',
        fallbackPlacements: ['bottom'],
        trigger: 'hover focus',
        container: 'body',
      })
    );
  });
}

function onViewportChange() {
  nextTick(() => initTooltips());
}

let tooltipMqLink;
let tooltipMqBrand;

onMounted(() => {
  nextTick(() => {
    document.querySelectorAll('[data-bs-toggle="dropdown"]').forEach((el) => new Dropdown(el));
    initTooltips();
  });
  tooltipMqLink = window.matchMedia('(min-width: 768px) and (max-width: 1199.98px)');
  tooltipMqBrand = window.matchMedia('(max-width: 767.98px)');
  tooltipMqLink.addEventListener('change', onViewportChange);
  tooltipMqBrand.addEventListener('change', onViewportChange);
});

onBeforeUnmount(() => {
  disposeTooltips();
  tooltipMqLink?.removeEventListener('change', onViewportChange);
  tooltipMqBrand?.removeEventListener('change', onViewportChange);
});

watch(visibleNavItems, () => {
  nextTick(() => initTooltips());
});

function onSignOutClick() {
  localStorage.removeItem('w4h.user.token');
  clearUsageSessionFlags();
  userStore.clearUser();
  uiStore.exitAdmin();
  router.push({ name: 'login' });
}
</script>

<style scoped>
.app-icon {
  width: 28px;
  height: 28px;
  display: block;
  flex-shrink: 0;
}

.w4h-nav,
.w4h-dark-nav {
  background-color: var(--w4h-nav-bg) !important;
}

.navbar-brand,
.nav-link,
.account-trigger {
  color: #ffffff !important;
}

.navbar-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  padding-top: 0.4rem;
  padding-bottom: 0.4rem;
  margin-right: 1rem;
}

.brand-text {
  line-height: 1.2;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.navbar-nav .nav-link {
  font-weight: 500;
  position: relative;
  text-decoration: none;
}

.navbar-brand.active {
  text-decoration: none;
}

.navbar-brand.active .brand-text {
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 0.35em;
}

.navbar-nav .nav-link.active {
  font-weight: 600;
}

.navbar-nav .nav-link.active::after {
  content: '';
  position: absolute;
  left: 0.55rem;
  right: 0.55rem;
  bottom: 0.35em;
  height: 2px;
  background: currentColor;
  border-radius: 1px;
  pointer-events: none;
}

.nav-item,
.navbar-brand {
  cursor: pointer;
}

.nav-link-compact {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  position: relative;
}

.account-trigger {
  text-decoration: none;
  padding: 0.35rem 0.5rem;
}

.account-avatar {
  font-size: 1.5rem;
}

.dropdown-item {
  cursor: pointer !important;
}

.account-menu {
  min-width: 16rem;
}

.user-account-link {
  white-space: normal;
  line-height: 1.25;
}

.account-email {
  white-space: nowrap;
}

@media (min-width: 768px) and (max-width: 1199.98px) {
  .nav-link-label {
    display: none;
  }

  .nav-link-compact {
    padding-left: 0.65rem;
    padding-right: 0.65rem;
  }
}

@media (max-width: 767.98px) {
  .nav-link-label {
    display: inline;
  }

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

  .navbar-nav .nav-link.active::after {
    left: 1rem;
    right: 1rem;
  }

  .dropdown {
    width: 100%;
  }

  .dropdown-menu {
    width: 100%;
  }
}

@media (min-width: 1200px) {
  .nav-link-label {
    display: inline;
  }

  .navbar-nav .nav-link.active::after {
    left: 0.5rem;
    right: 0.5rem;
  }
}
</style>
