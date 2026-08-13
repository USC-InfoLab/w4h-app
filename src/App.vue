<template>
  <div :class="{ 'dark-mode': uiStore.darkMode }">
    <template v-if="!isGuest">
      <AdminNavBar v-if="isAdminUI" />
      <NavBar v-else />
    </template>
    <router-view />
  </div>
</template>

<script setup>
import { computed, watch } from 'vue'
import NavBar from '@/components/NavBar.vue'
import AdminNavBar from '@/components/AdminNavBar.vue'
import { trackPageView, trackSessionStart } from '@/utils/clientUsage'

import { useRoute } from 'vue-router'
const route = useRoute()

import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

import { useUIStore } from '@/stores/ui';
import { canAccessAdminUi } from '@/utils/roles';
const uiStore = useUIStore();

const isGuest = computed(() => route.meta.guest === true);
// Super admin always uses Platform Admin chrome — no toggle into the team app shell.
const isAdminUI = computed(() => canAccessAdminUi(user.value?.role, user.value?.caps));

function syncBootstrapTheme(theme) {
  document.body.dataset.bsTheme = theme;
  document.documentElement.dataset.w4hTheme = theme;
}

watch(
  () => uiStore.resolvedTheme,
  (theme) => syncBootstrapTheme(theme),
  { immediate: true }
);

watch(
  () => [route.fullPath, route.name, isGuest.value, user.value?.email],
  ([, , guest, email]) => {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('w4h.user.token') : null;
    if (guest || !token || !email) return;
    trackSessionStart();
    trackPageView({ path: route.fullPath, routeName: route.name });
  },
  { immediate: true }
);

</script>
