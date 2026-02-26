// src/stores/user.js
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUserStore = defineStore('user', () => {
  const userJson = localStorage.getItem('w4h.user');
  const user = ref(userJson ? JSON.parse(userJson) : {});

  async function setUser(newuser) {
    user.value = {
      role: newuser.role,
      name: newuser.name,
      email: newuser.email,
      city_id: newuser.city_id,
      city_name: newuser.city_name,
      can_send: newuser.can_send,
      account_id: newuser.account_id,
      account_name: newuser.account_name,
      api_key: newuser.api_key,
    };

    // Save to localStorage
    localStorage.setItem('w4h.user', JSON.stringify(user.value));
  };

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
    setTriggerMode,
  };
});
