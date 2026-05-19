<script setup>
import { ref, computed, onMounted } from 'vue';
import FeatureCard from '@/components/FeatureCard.vue';

import { getCards, getFeatureCards } from '@/utils/cards';
import { validatePassword, PASSWORD_REQUIREMENTS } from '@/utils/password-validator';

import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { api } from '@/utils/api';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const markdownCards = ref([]);
const staticCards = computed(() => getCards());

// Password change modal
const showPasswordModal = ref(false);
const newPassword = ref('');
const confirmPassword = ref('');
const passwordLoading = ref(false);
const passwordError = ref('');

const changePassword = async () => {
  if (!newPassword.value || !confirmPassword.value) {
    passwordError.value = 'Both password fields are required';
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Passwords do not match';
    return;
  }

  if (!validatePassword(newPassword.value)) {
    passwordError.value = PASSWORD_REQUIREMENTS;
    return;
  }

  passwordLoading.value = true;
  passwordError.value = '';

  try {
    const res = await api.post('users/set', {
      username: 'admin',
      password: newPassword.value
    });

    if (res.data.success || res.data.error === null) {
      showPasswordModal.value = false;
      // Clear the firstTimeLogin flag from user
      user.value.firstTimeLogin = false;
    } else {
      passwordError.value = res.data.error || 'Failed to update password';
    }
  } catch (err) {
    passwordError.value = 'Failed to change password: ' + (err.response?.data?.error || err.message);
  } finally {
    passwordLoading.value = false;
  }
};

onMounted(async () => {
  markdownCards.value = await getFeatureCards();

  // Show password change modal on first login
  if (user.value?.firstTimeLogin) {
    showPasswordModal.value = true;
  }
});
</script>

<template>
  <main>

    <!-- First Time Login - Change Password Modal -->
    <div v-if="showPasswordModal" class="modal" style="display: block; background: rgba(0,0,0,0.7);">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-body p-4">
            <h5 class="modal-title mb-3" style="color: #ff6b6b;">⚠️ Set Your Password</h5>
            <p class="text-muted mb-4">
              The default admin credentials are temporary. You must set a new password now.
            </p>
            <div class="alert alert-info mb-3">
              <small><strong>Password requirements:</strong> Minimum 12 characters with uppercase, lowercase, number,
                and special character.</small>
            </div>

            <div v-if="passwordError" class="alert alert-danger mb-3" role="alert">
              {{ passwordError }}
            </div>

            <div class="mb-3">
              <label class="form-label">New Password</label>
              <input v-model="newPassword" type="password" class="form-control" placeholder="Enter new password"
                :disabled="passwordLoading" />
            </div>

            <div class="mb-4">
              <label class="form-label">Confirm Password</label>
              <input v-model="confirmPassword" type="password" class="form-control" placeholder="Confirm password"
                :disabled="passwordLoading" />
            </div>

            <button @click="changePassword" :disabled="passwordLoading || !newPassword || !confirmPassword"
              class="btn btn-primary w-100">
              <span v-if="passwordLoading" class="spinner-border spinner-border-sm me-2"></span>
              Set Password
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="row my-2">
      <FeatureCard v-for="card in staticCards" :key="card.card_title" :card="card" />
    </div>

    <hr v-if="markdownCards.length" class="my-4" />

    <div class="row my-2">
      <FeatureCard v-for="card in markdownCards" :key="card.card_title" :card="card" />
    </div>

    <!-- Access Info -->
    <div class="mb-3 ms-2">
      <div v-for="(access, index) in user.access" :key="index">
        You can create newsletters for {{ access.name }}
        {{ access.send ? ' and can send published newsletters to subscribers.' : '.' }}
      </div>
    </div>

  </main>
</template>//hmr test
