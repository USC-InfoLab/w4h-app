import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';

const THEME_MODE_STORAGE_KEY = 'w4h.theme.mode';
const LEGACY_DARK_MODE_KEY = 'darkMode';
const ACTIVE_TEAM_STORAGE_KEY = 'w4h.activeTeamId';
const ACTIVE_PROJECT_STORAGE_KEY = 'w4h.activeProjectId';
const THEME_MODES = ['light', 'dark', 'system'];

function getInitialThemeMode() {
  const storedMode = localStorage.getItem(THEME_MODE_STORAGE_KEY);
  if (THEME_MODES.includes(storedMode)) return storedMode;

  const legacyDarkMode = localStorage.getItem(LEGACY_DARK_MODE_KEY);
  if (legacyDarkMode === 'true') return 'dark';
  if (legacyDarkMode === 'false') return 'light';

  return 'system';
}

export const useUIStore = defineStore('ui', () => {
  const isAdminUI = ref(localStorage.getItem('isAdminUI') === 'true');
  const activeTeamId = ref(localStorage.getItem(ACTIVE_TEAM_STORAGE_KEY) || '');
  const activeProjectId = ref(localStorage.getItem(ACTIVE_PROJECT_STORAGE_KEY) || '');

  // --- Theme mode (light / dark / system) ---
  const themeMode = ref(getInitialThemeMode());
  const systemPrefersDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const darkMode = computed(() =>
    themeMode.value === 'dark' || (themeMode.value === 'system' && systemPrefersDark.value)
  );
  const resolvedTheme = computed(() => (darkMode.value ? 'dark' : 'light'));

  watch(themeMode, (newValue) => {
    localStorage.setItem(THEME_MODE_STORAGE_KEY, newValue);
    // Keep legacy key in sync during transition.
    localStorage.setItem(LEGACY_DARK_MODE_KEY, String(newValue === 'dark'));
  });

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => {
      systemPrefersDark.value = e.matches;
    });
  }

  // --- Admin UI ---
  watch(isAdminUI, (newValue) => {
    localStorage.setItem('isAdminUI', newValue);
  });

  watch(activeTeamId, (newValue) => {
    if (newValue) localStorage.setItem(ACTIVE_TEAM_STORAGE_KEY, String(newValue));
    else localStorage.removeItem(ACTIVE_TEAM_STORAGE_KEY);
  });

  watch(activeProjectId, (newValue) => {
    if (newValue) localStorage.setItem(ACTIVE_PROJECT_STORAGE_KEY, String(newValue));
    else localStorage.removeItem(ACTIVE_PROJECT_STORAGE_KEY);
  });

  function enterAdmin() {
    isAdminUI.value = true;
  }

  function exitAdmin() {
    isAdminUI.value = false;
  }

  function setActiveTeamId(teamId) {
    activeTeamId.value = teamId ? String(teamId) : '';
  }

  function setActiveProjectId(projectId) {
    activeProjectId.value = projectId ? String(projectId) : '';
  }

  function setThemeMode(mode) {
    if (!THEME_MODES.includes(mode)) return;
    themeMode.value = mode;
  }

  function toggleDarkMode() {
    themeMode.value = darkMode.value ? 'light' : 'dark';
  }

  return {
    isAdminUI,
    enterAdmin,
    exitAdmin,
    activeTeamId,
    setActiveTeamId,
    activeProjectId,
    setActiveProjectId,
    themeMode,
    setThemeMode,
    darkMode,
    resolvedTheme,
    toggleDarkMode,
  };
});
