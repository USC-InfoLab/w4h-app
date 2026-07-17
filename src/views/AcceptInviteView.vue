<template>
  <div class="d-flex flex-column justify-content-center">
    <form class="form-signin w-100" style="max-width: 420px;" @submit.prevent="onSubmit">
      <img class="mt-5 mx-auto d-block" style="width: 230px" :src="logoSrc" :alt="`${APP_NAME} logo`" />
      <div class="logotype mb-4 text-center">{{ APP_NAME }}</div>

      <div class="card">
        <div class="card-body">
          <h5 class="card-title text-center mb-3">Activate your account</h5>

          <div v-if="loading" class="text-center py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="text-muted mt-2 mb-0">Checking invitation…</p>
          </div>

          <template v-else-if="inviteError">
            <div class="alert alert-danger mb-0" role="alert">{{ inviteError }}</div>
            <button type="button" class="btn btn-link mt-3 w-100" @click="goLogin">
              Go to sign in
            </button>
          </template>

          <template v-else>
            <p class="text-muted small mb-3">
              Set a password for <strong>{{ invite.email }}</strong> to activate your account.
            </p>

            <div class="mb-3">
              <label class="form-label" for="invite-name">Name</label>
              <input id="invite-name" v-model="name" type="text" class="form-control" autocomplete="name" />
            </div>

            <div class="mb-3">
              <label class="form-label" for="invite-password">Password</label>
              <div class="input-group">
                <input
                  id="invite-password"
                  v-model="password"
                  :type="showPassword ? 'text' : 'password'"
                  class="form-control"
                  autocomplete="new-password"
                  required
                />
                <button type="button" class="btn btn-outline-secondary" tabindex="-1" @click="showPassword = !showPassword">
                  <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
                </button>
              </div>
              <div class="form-text">{{ PASSWORD_REQUIREMENTS }}</div>
              <div v-if="password && !isSecurePassword" class="text-danger small mt-1">
                {{ PASSWORD_REQUIREMENTS }}
              </div>
            </div>

            <div class="mb-3">
              <label class="form-label" for="invite-password-confirm">Confirm password</label>
              <input
                id="invite-password-confirm"
                v-model="passwordConfirm"
                :type="showPassword ? 'text' : 'password'"
                class="form-control"
                autocomplete="new-password"
                required
              />
              <div v-if="passwordConfirm && password !== passwordConfirm" class="text-danger small mt-1">
                Passwords do not match
              </div>
            </div>

            <div v-if="submitError" class="alert alert-danger py-2" role="alert">{{ submitError }}</div>

            <button class="btn btn-primary w-100" type="submit" :disabled="!canSubmit || submitting">
              <span v-if="submitting" class="spinner-border spinner-border-sm me-2"></span>
              Activate account
            </button>
          </template>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';
import { validatePassword, PASSWORD_REQUIREMENTS } from '@/utils/password-validator';
import { useUserStore } from '@/stores/user';
import { useUIStore } from '@/stores/ui';
import { canAccessAdminUi } from '@/utils/roles';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const uiStore = useUIStore();

const logoSrc = computed(() => (uiStore.darkMode ? '/w4h-dark.svg' : '/w4h-light.svg'));

const token = computed(() => {
  const raw = route.params.token;
  return Array.isArray(raw) ? raw[0] : raw;
});

const loading = ref(true);
const invite = ref({ email: '', name: '' });
const inviteError = ref('');
const name = ref('');
const password = ref('');
const passwordConfirm = ref('');
const showPassword = ref(false);
const submitError = ref('');
const submitting = ref(false);

const isSecurePassword = computed(() => validatePassword(password.value));
const canSubmit = computed(() =>
  isSecurePassword.value &&
  password.value === passwordConfirm.value &&
  !!token.value
);

function goLogin() {
  router.push({ name: 'login' });
}

async function onSubmit() {
  if (!canSubmit.value) return;
  submitting.value = true;
  submitError.value = '';
  try {
    const { data } = await api.post('users/invite/accept', {
      token: token.value,
      password: password.value,
      name: name.value.trim() || undefined
    });
    const session = data?.user || data;
    if (!session?.token) {
      submitError.value = 'Activation succeeded but no session was returned.';
      return;
    }
    userStore.setUser(session);
    localStorage.setItem('w4h.user.token', session.token);
    if (canAccessAdminUi(session.role)) {
      uiStore.enterAdmin();
      router.push({ name: 'adminHome' });
    } else {
      router.push({ name: 'home' });
    }
  } catch (error) {
    submitError.value = error.response?.data?.error || error.message || 'Failed to activate account.';
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  document.title = `${APP_NAME} Activate account`;
  if (!token.value) {
    inviteError.value = 'Missing invitation token.';
    loading.value = false;
    return;
  }
  try {
    const { data } = await api.get(`users/invite/${encodeURIComponent(token.value)}`);
    invite.value = data;
    name.value = data.name || '';
  } catch (error) {
    inviteError.value = error.response?.data?.error || error.message || 'Invalid invitation link.';
  } finally {
    loading.value = false;
  }
});
</script>
