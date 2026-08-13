<template>
  <nav ref="navEl" :class="['navbar', 'navbar-expand-md', 'navbar-dark', 'fixed-top', navbarColorClass]">
    <div class="container-fluid">
      <RouterLink
        class="navbar-brand w4h-admin-title"
        :class="{ active: isAdminHomeActive }"
        :to="{ name: 'adminHome' }"
        data-bs-toggle="tooltip"
        data-bs-placement="bottom"
        :data-bs-title="homeBrandTooltip"
        :title="homeBrandTooltip"
        :aria-label="homeBrandAriaLabel"
      >
        <img class="app-icon" src="/w4h-mark.svg" alt="" />
        <span class="brand-text d-none d-md-inline">W4H</span>
      </RouterLink>

      <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarCollapse"
        aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
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
            id="adminMenuDropdown"
            data-bs-toggle="dropdown"
            aria-expanded="false"
            aria-label="Account menu"
          >
            <i class="bi bi-person-circle account-avatar" aria-hidden="true"></i>
          </a>
          <ul class="dropdown-menu dropdown-menu-end account-menu" aria-labelledby="adminMenuDropdown">
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
                <div v-if="userRoleLabel" class="small text-secondary mt-1">{{ userRoleLabel }}</div>
              </RouterLink>
            </li>
            <li><hr class="dropdown-divider" /></li>
            <li>
              <button type="button" class="dropdown-item" @click="showAbout = true">
                About
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
</template>

<script setup>
import { onMounted, onBeforeUnmount, computed, watch, nextTick, ref } from 'vue';

import { Dropdown, Tooltip } from 'bootstrap';

import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();

import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

import { useUIStore } from '../stores/ui';
import { isSuperAdmin, roleLabel } from '@/utils/roles';
import AboutModal from '@/components/AboutModal.vue';
import { clearUsageSessionFlags } from '@/utils/clientUsage';
const uiStore = useUIStore();

const tooltipInstances = ref([]);
const navEl = ref(null);
const showAbout = ref(false);

function onSignOutClick() {
  localStorage.removeItem('w4h.user.token');
  clearUsageSessionFlags();
  userStore.clearUser();
  uiStore.exitAdmin();
  router.push({ name: 'login' });
}

const displayName = computed(() => {
  const name = String(user.value?.name || '').trim();
  const email = String(user.value?.email || '').trim();
  if (!name || (email && name.toLowerCase() === email.toLowerCase())) {
    return '';
  }
  return name;
});

const userRoleLabel = computed(() => roleLabel(user.value?.role));

const homeBrandTooltip = computed(() => 'W4H home');
const homeBrandAriaLabel = computed(() => 'W4H home');

const brandTip = ref(null);

function syncBrandTooltip() {
  const root = navEl.value;
  const el = root?.querySelector('.navbar-brand');
  if (!el) return;
  el.setAttribute('data-bs-title', homeBrandTooltip.value);
  el.setAttribute('title', homeBrandTooltip.value);
  let tip = Tooltip.getInstance(el);
  if (!tip) {
    tip = new Tooltip(el, {
      placement: 'bottom',
      fallbackPlacements: ['bottom'],
      trigger: 'hover focus',
      container: 'body',
      title: homeBrandTooltip.value,
    });
    brandTip.value = tip;
  } else if (typeof tip.setContent === 'function') {
    tip.setContent({ '.tooltip-inner': homeBrandTooltip.value });
  }
}

const showTeams = computed(() => isSuperAdmin(user.value?.role));
const showSettings = computed(() => isSuperAdmin(user.value?.role));

const isAdminHomeActive = computed(() => route.name === 'adminHome');
const isSettingsActive = computed(() =>
  route.name === 'adminSettings' || route.name === 'adminDatabase'
);
const isStyleGuideActive = computed(() => route.name === 'adminStyleGuide');
const isAuditLogActive = computed(() => route.name === 'adminAuditLog');
const isUsageActive = computed(() => route.name === 'adminUsage');
const isTeamsActive = computed(() =>
  route.name === 'adminTeams' ||
  route.name === 'adminTeamsAdd' ||
  route.name === 'adminTeamsEdit'
);
const isUsersActive = computed(() =>
  route.name === 'users' ||
  route.name === 'usersEdit' ||
  route.name === 'usersAdd'
);
const isDatasetsActive = computed(() =>
  route.name === 'adminDatasets' ||
  route.name === 'adminDatasetsAdd' ||
  route.name === 'adminDatasetsEdit' ||
  route.name === 'adminDatasetsShares'
);
const isHelpActive = computed(() =>
  route.name === 'docs' || route.name === 'docNew'
);

const navItems = computed(() => [
  {
    key: 'teams',
    label: 'Teams',
    icon: 'bi bi-people-fill',
    to: { name: 'adminTeams' },
    active: isTeamsActive.value,
    show: showTeams.value,
  },
  {
    key: 'users',
    label: 'Users',
    icon: 'bi bi-people',
    to: { name: 'users' },
    active: isUsersActive.value,
    show: true,
  },
  {
    key: 'datasets',
    label: 'Datasets',
    icon: 'bi bi-database',
    to: { name: 'adminDatasets' },
    active: isDatasetsActive.value,
    show: true,
  },
  {
    key: 'audit',
    label: 'Audit',
    icon: 'bi bi-journal-text',
    to: { name: 'adminAuditLog' },
    active: isAuditLogActive.value,
    show: showSettings.value,
  },
  {
    key: 'usage',
    label: 'Usage',
    icon: 'bi bi-graph-up',
    to: { name: 'adminUsage' },
    active: isUsageActive.value,
    show: showSettings.value,
  },
  {
    key: 'help',
    label: 'Help',
    icon: 'bi bi-question-circle',
    to: { name: 'docs', params: { slug: 'home' } },
    active: isHelpActive.value,
    show: true,
  },
  {
    key: 'styleGuide',
    label: 'UI kit',
    icon: 'bi bi-palette',
    to: { name: 'adminStyleGuide' },
    active: isStyleGuideActive.value,
    show: showSettings.value,
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: 'bi bi-toggles',
    to: { name: 'adminSettings' },
    active: isSettingsActive.value,
    show: showSettings.value,
  },
]);

const visibleNavItems = computed(() => navItems.value.filter((item) => item.show));

watch(
  () => userStore.user,
  (newUser) => {
    user.value = newUser;
  }
);

const navbarColorClass = computed(() =>
  uiStore.darkMode ? 'w4h-dark-nav' : 'w4h-nav'
);

function safeDisposeTooltip(t) {
  try {
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
    const accountToggle = navEl.value?.querySelector('#adminMenuDropdown');
    if (accountToggle) Dropdown.getOrCreateInstance(accountToggle);
    syncTooltips();
    syncBrandTooltip();
  });
  tooltipMqLink = window.matchMedia('(min-width: 768px) and (max-width: 1199.98px)');
  tooltipMqLink.addEventListener('change', onViewportChange);
});

onBeforeUnmount(() => {
  disposeTooltips();
  safeDisposeTooltip(brandTip.value);
  brandTip.value = null;
  const brand = navEl.value?.querySelector('.navbar-brand');
  safeDisposeTooltip(brand ? Tooltip.getInstance(brand) : null);
  tooltipMqLink?.removeEventListener('change', onViewportChange);
});

watch(visibleNavItems, () => {
  nextTick(() => syncTooltips());
});

watch(homeBrandTooltip, () => {
  nextTick(() => syncBrandTooltip());
});
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

.w4h-admin-title span,
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
  font-size: 1.35rem;
  line-height: 1;
}

.account-menu {
  min-width: 14rem;
}

.user-account-link {
  white-space: normal;
}

.account-email {
  word-break: break-all;
}

/*
 * md–lg: icon-only (tooltips) so the fixed bar stays one row.
 * xl+: show labels — same ::after underline baseline.
 */
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

  .dropdown {
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
