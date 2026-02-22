import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useUIStore = defineStore('ui', () => {
  const isAdminUI = ref(localStorage.getItem('isAdminUI') === 'true');

  // --- Dark mode ---
  const darkMode = ref(
    localStorage.getItem('darkMode') !== null
      ? localStorage.getItem('darkMode') === 'true'
      : window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  // persist darkMode
  watch(darkMode, (newValue) => {
    localStorage.setItem('darkMode', newValue);
  });

  // react to system theme changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      darkMode.value = e.matches;
    });
  }

  // --- Admin UI ---
  watch(isAdminUI, (newValue) => {
    localStorage.setItem('isAdminUI', newValue);
  });

  function enterAdmin() {
    isAdminUI.value = true;
  }

  function exitAdmin() {
    isAdminUI.value = false;
  }

  function toggleDarkMode() {
    darkMode.value = !darkMode.value;
  }

  return { isAdminUI, enterAdmin, exitAdmin, darkMode, toggleDarkMode };
});