<template>
  <GuestAuthLayout>
    <form class="card text-start" autocomplete="on" method="post" action="/login"
      @submit.prevent="emailSent ? login() : sendCode()">
      <div class="card-body login-code-body">
          <h2 class="h4 mb-1">Sign in with email code</h2>

          <div class="login-code-step">
            <template v-if="!emailSent">
              <p class="text-muted small mb-3">
                Enter the account email from your invitation.
              </p>
              <label for="email" class="form-label">Email</label>
              <input id="email" name="username" v-model="email" type="email" class="form-control mb-3" required
                autofocus autocomplete="username" placeholder="you@example.com" @input="clearMessage" />
            </template>

            <template v-else>
              <p class="text-muted small mb-3">
                Enter the 6-digit code sent to <strong>{{ email }}</strong>.
              </p>
              <label for="code" class="form-label">Verification code</label>
              <input id="code" v-model="code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6"
                class="form-control mb-3 font-monospace" required autofocus autocomplete="one-time-code"
                @input="clearMessage" />
            </template>
          </div>

          <div v-if="message" class="alert mt-3 mb-0 py-2" :class="messageIsError ? 'alert-danger' : 'alert-success'"
            role="alert">
            {{ message }}
          </div>

          <button class="btn btn-primary w-100 mt-3" type="submit" :disabled="sending || verifying">
            <span v-if="sending || verifying" class="spinner-border spinner-border-sm me-2"></span>
            {{ emailSent ? 'Sign in' : 'Send code' }}
          </button>
      </div>
      <div class="card-footer bg-transparent text-center py-3">
        <button type="button" class="btn btn-link btn-sm" @click="goToPasswordLogin">
          Back to password sign in
        </button>
      </div>
    </form>
  </GuestAuthLayout>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../utils/api';
import GuestAuthLayout from '@/components/GuestAuthLayout.vue';
import { useUserStore } from '../stores/user';
import { useUIStore } from '@/stores/ui';
import { canAccessAdminUi } from '@/utils/roles';
import { readLastLoginEmail, rememberLoginEmail } from '@/utils/loginRemember';

const router = useRouter();
const userStore = useUserStore();
const uiStore = useUIStore();

const email = ref(readLastLoginEmail());
const code = ref('');
const emailSent = ref(false);
const message = ref('');
const messageIsError = ref(false);
const sending = ref(false);
const verifying = ref(false);

function clearMessage() {
  message.value = '';
}

function setMessage(text, isError = true) {
  message.value = text;
  messageIsError.value = isError;
}

function extractError(error) {
  const data = error.response?.data;
  if (data?.error?.message) return data.error.message;
  if (typeof data?.error === 'string') return data.error;
  if (data?.message) return data.message;
  if (error.response?.status === 404) {
    return 'Sign-in service not found. Make sure the API server is up to date.';
  }
  return 'Something went wrong. Please try again.';
}

function goToPasswordLogin() {
  router.push({ name: 'login' });
}

const sendCode = async () => {
  sending.value = true;
  clearMessage();
  try {
    const response = await api.post('users/send-code', { email: email.value.trim() });
    emailSent.value = true;
    code.value = '';
    setMessage(response.data.message || 'Sign-in code sent.', false);
  } catch (error) {
    setMessage(extractError(error));
  } finally {
    sending.value = false;
  }
};

const login = async () => {
  verifying.value = true;
  clearMessage();
  try {
    const response = await api.post('users/verify-code', {
      email: email.value.trim(),
      code: code.value.trim(),
    });

    if (response.data.error) {
      setMessage(response.data.error.message || 'Login failed.');
      return;
    }

    const { user, token } = response.data;
    rememberLoginEmail(email.value);
    localStorage.setItem('w4h.user.token', token);
    await userStore.setUser({ ...user, token });

    if (canAccessAdminUi(user.role, user.caps)) {
      uiStore.enterAdmin();
      router.push({ name: 'adminHome' });
    } else {
      uiStore.exitAdmin();
      router.push('/home');
    }
  } catch (error) {
    setMessage(extractError(error));
  } finally {
    verifying.value = false;
  }
};
</script>

<style scoped>
.login-code-body {
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

.login-code-step {
  min-height: 120px;
  flex: 1;
}
</style>
