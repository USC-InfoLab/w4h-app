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
import { onMounted, onBeforeUnmount, computed } from 'vue'
import NavBar from '@/components/NavBar.vue'
import AdminNavBar from '@/components/AdminNavBar.vue'

import { useRoute } from 'vue-router'
const route = useRoute()

import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

import { useUIStore } from '@/stores/ui';
const uiStore = useUIStore();

const isGuest = computed(() => route.meta.requiresAuth === false);
const isAdminUI = computed(() => {
  return user.value?.role === 'admin' && uiStore.isAdminUI;
});

onMounted(() => {
  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)')
  prefersDarkTheme.addEventListener('change', handleThemeChange)
  handleThemeChange(prefersDarkTheme);
})

onBeforeUnmount(() => {
  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)')
  prefersDarkTheme.removeEventListener('change', handleThemeChange)
})

function handleThemeChange(event) {
  // console.log('Theme change detected:', event.matches ? 'dark' : 'light');
  // update bootstrap 5 dark mode
  document.body.dataset.bsTheme = event.matches ? 'dark' : 'light';
}

</script>
