<template>
  <nav ref="navEl" :class="['navbar', 'navbar-expand-md', 'navbar-dark', 'fixed-top', navbarColorClass]">
    <div class="container-fluid">
      <div class="d-flex align-items-center navbar-context">
        <RouterLink
          class="navbar-brand"
          :to="{ name: 'home' }"
          aria-label="W4H home"
        >
          <img class="app-icon" src="/w4h-mark.svg" alt="" />
          <span class="brand-text d-none d-md-inline">W4H</span>
        </RouterLink>

        <TeamProjectSwitcher />
        <div class="nav-context-divider d-none d-md-block" aria-hidden="true"></div>
      </div>

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
              <span class="nav-link-label" :data-text="item.label">{{ item.label }}</span>
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
import AboutModal from '@/components/AboutModal.vue';
import ReportIssueModal from '@/components/ReportIssueModal.vue';
import TeamProjectSwitcher from '@/components/TeamProjectSwitcher.vue';
import { clearUsageSessionFlags } from '@/utils/clientUsage';
import { useTeamContext } from '@/composables/useTeamContext';

const router = useRouter();
const route = useRoute();

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const uiStore = useUIStore();
const {
  isActiveProjectAdmin,
  activeProject,
} = useTeamContext();

const tooltipInstances = ref([]);
const navEl = ref(null);
const showAbout = ref(false);
const showReportIssue = ref(false);

const navbarColorClass = computed(() => (uiStore.darkMode ? 'w4h-dark-nav' : 'w4h-nav'));
const showAdminNav = computed(() => isActiveProjectAdmin.value);

const displayName = computed(() => {
  const name = String(user.value?.name || '').trim();
  const email = String(user.value?.email || '').trim();
  if (!name || (email && name.toLowerCase() === email.toLowerCase())) {
    return '';
  }
  return name;
});

const isProjectActive = computed(() =>
  route.name === 'projects' ||
  route.name === 'projectWorkspace' ||
  route.name === 'adminProjects' ||
  route.name === 'adminProjectsAdd' ||
  route.name === 'adminProjectsEdit' ||
  route.name === 'adminTeamsEdit'
);
const isHelpActive = computed(() => route.name === 'docs' || route.name === 'docNew');
const isAuditActive = computed(() => route.name === 'adminAuditLog');

const projectTo = computed(() => {
  const p = activeProject.value;
  if (!p) return { name: 'adminProjects' };
  return { name: 'adminProjectsEdit', params: { id: p.slug || p.id } };
});

const navItems = computed(() => [
  {
    key: 'project',
    label: 'Project',
    icon: 'bi bi-beaker',
    to: projectTo.value,
    active: isProjectActive.value,
    show: true,
  },
  {
    key: 'audit',
    label: 'Audit',
    icon: 'bi bi-journal-text',
    to: { name: 'adminAuditLog' },
    active: isAuditActive.value,
    show: showAdminNav.value,
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

watch(isActiveProjectAdmin, (admin) => {
  if (admin) return;
  const memberBlocked = new Set([
    'adminTeams',
    'adminTeamsAdd',
    'users',
    'usersAdd',
    'usersEdit',
    'adminProjects',
    'adminProjectsAdd',
    'adminDatasetsAdd',
    'adminDatasetsShares',
    'adminUsage',
    'adminSettings',
    'adminStyleGuide',
  ]);
  if (memberBlocked.has(route.name)) {
    router.push({ name: 'home' });
  }
});

function safeDisposeTooltip(t) {
  try {
    // Avoid Bootstrap hide-transition callbacks on a disposed instance
    // (_isWithActiveTrigger → Object.values(null)).
    if (t?._activeTrigger) {
      t._activeTrigger = {};
    }
    t?.dispose?.();
  } catch {
    /* tip node may already be gone */
  }
}

function disposeTooltips() {
  tooltipInstances.value.forEach(safeDisposeTooltip);
  tooltipInstances.value = [];
}

/** Icon-only strip (md–lg): tooltips help. Small / xl+ show labels — tooltips are redundant. */
function shouldShowNavLinkTooltips() {
  return window.matchMedia('(min-width: 768px) and (max-width: 1199.98px)').matches;
}

/** Add tips for new links only — never dispose/recreate living instances (team switch). */
function syncTooltips() {
  const root = navEl.value;
  if (!root) return;

  if (!shouldShowNavLinkTooltips()) {
    disposeTooltips();
    return;
  }

  tooltipInstances.value = tooltipInstances.value.filter((t) => {
    const el = t?._element;
    if (!el || !el.isConnected) {
      safeDisposeTooltip(t);
      return false;
    }
    return true;
  });

  const tracked = new Set(tooltipInstances.value.map((t) => t._element));
  root.querySelectorAll('.nav-link[data-bs-toggle="tooltip"]').forEach((el) => {
    if (!el.isConnected || tracked.has(el)) return;
    const existing = Tooltip.getInstance(el);
    if (existing) {
      tooltipInstances.value.push(existing);
      return;
    }
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
  nextTick(() => syncTooltips());
}

let tooltipMqLink;

onMounted(() => {
  nextTick(() => {
    const accountToggle = navEl.value?.querySelector('#menuDropdown');
    if (accountToggle) Dropdown.getOrCreateInstance(accountToggle);
    syncTooltips();
  });
  tooltipMqLink = window.matchMedia('(min-width: 768px) and (max-width: 1199.98px)');
  tooltipMqLink.addEventListener('change', onViewportChange);
});

onBeforeUnmount(() => {
  disposeTooltips();
  tooltipMqLink?.removeEventListener('change', onViewportChange);
});

watch(visibleNavItems, () => {
  nextTick(() => syncTooltips());
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
  margin-right: 0.35rem;
}

.navbar-context {
  min-width: 0;
}

.nav-context-divider {
  width: 1px;
  height: 1.15rem;
  margin: 0 0.65rem 0 0.35rem;
  background: rgba(255, 255, 255, 0.55);
  flex-shrink: 0;
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

.navbar-nav .nav-link i {
  font-weight: 400;
}

.nav-link-label {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  font-weight: 500;
}

.nav-link-label::after {
  content: attr(data-text);
  height: 0;
  overflow: hidden;
  font-weight: 600;
  visibility: hidden;
  pointer-events: none;
  user-select: none;
  display: block;
}

.navbar-nav .nav-link.active .nav-link-label {
  font-weight: 600;
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

  .navbar-nav .nav-link.active {
    background: rgba(255, 255, 255, 0.12);
    border-radius: 0.35rem;
  }
}

@media (max-width: 767.98px) {
  .nav-link-label {
    display: inline-flex;
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

  .navbar-collapse .dropdown {
    width: 100%;
  }

  .dropdown-menu {
    width: 100%;
  }
}

@media (min-width: 1200px) {
  .nav-link-label {
    display: inline-flex;
  }
}
</style>
