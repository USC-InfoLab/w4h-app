// src/stores/user.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

const SETUP_GUIDE_KEY = 'w4h.setupGuide';

export const useUserStore = defineStore('user', () => {
  const userJson = localStorage.getItem('w4h.user');
  const user = ref(userJson ? JSON.parse(userJson) : {});

  async function setUser(newuser) {
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
      firstTimeLogin: nextFirstTime,
    };

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
    clearUser,
    clearFirstTimeLogin,
    markSetupGuidePending,
    isSetupGuidePending,
    setTriggerMode,
  };
});
