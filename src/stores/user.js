// src/stores/user.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useUIStore } from '@/stores/ui';

const SETUP_GUIDE_KEY = 'w4h.setupGuide';

export const useUserStore = defineStore('user', () => {
  const userJson = localStorage.getItem('w4h.user');
  const user = ref(userJson ? JSON.parse(userJson) : {});

  async function setUser(newuser) {
    // A different user id means a sign-in (not a session refresh).
    const signingIn = String(user.value?.id ?? '') !== String(newuser.id ?? '');
    // Preserve firstTimeLogin unless the caller explicitly sets it
    const nextFirstTime =
      newuser.firstTimeLogin !== undefined
        ? !!newuser.firstTimeLogin
        : !!user.value?.firstTimeLogin;

    user.value = {
      role: newuser.role,
      name: newuser.name,
      email: newuser.email,
      id: newuser.id,
      city_id: newuser.city_id,
      city_name: newuser.city_name,
      can_send: newuser.can_send,
      account_id: newuser.account_id,
      account_name: newuser.account_name,
      api_key: newuser.api_key,
      team_id: newuser.team_id ?? null,
      team_ids: Array.isArray(newuser.team_ids) ? newuser.team_ids : [],
      team_memberships: Array.isArray(newuser.team_memberships)
        ? newuser.team_memberships
        : (Array.isArray(user.value?.team_memberships) ? user.value.team_memberships : []),
      // Server-issued capability split (platform_admin vs team_admin)
      caps: newuser.caps && typeof newuser.caps === 'object' ? newuser.caps : null,
      firstTimeLogin: nextFirstTime,
      // Server-stored UI preferences (e.g. last_project_id).
      preferences:
        newuser.preferences && typeof newuser.preferences === 'object'
          ? newuser.preferences
          : (signingIn ? {} : (user.value?.preferences || {})),
    };

    if (signingIn) {
      // Reopen this user's last project, not whatever the browser last held.
      const ui = useUIStore();
      ui.setActiveTeamId('');
      ui.setActiveProjectId(user.value.preferences.last_project_id || '');
    }

    if (nextFirstTime) {
      markSetupGuidePending();
    }

    localStorage.setItem('w4h.user', JSON.stringify(user.value));
  }

  function markSetupGuidePending() {
    localStorage.setItem(SETUP_GUIDE_KEY, 'pending');
  }

  function isSetupGuidePending() {
    return localStorage.getItem(SETUP_GUIDE_KEY) === 'pending';
  }

  function clearFirstTimeLogin() {
    if (!user.value) return;
    user.value = { ...user.value, firstTimeLogin: false };
    localStorage.setItem('w4h.user', JSON.stringify(user.value));
    localStorage.setItem(SETUP_GUIDE_KEY, 'dismissed');
  }

  function setPreferences(prefs) {
    if (!user.value?.id) return;
    user.value = { ...user.value, preferences: { ...(user.value.preferences || {}), ...prefs } };
    localStorage.setItem('w4h.user', JSON.stringify(user.value));
  }

  function clearUser() {
    user.value = {};
    localStorage.removeItem('w4h.user');
  }

  function setTriggerMode(mode) {
    if (!user.value.mixinSettings) user.value.mixinSettings = {};
    user.value.mixinSettings.triggerMode = mode;
  }

  return {
    user,
    setUser,
    setPreferences,
    clearUser,
    clearFirstTimeLogin,
    markSetupGuidePending,
    isSetupGuidePending,
    setTriggerMode,
  };
});
