<template>
  <div class="d-flex flex-column justify-content-center">
    <form class="form-signin w-100" @submit.prevent="emailSent ? login() : sendCode()" style="max-width: 360px;">
      <img class="login-mark login-mark-hero mt-5 mx-auto d-block" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
      <div class="logotype mb-4 text-center">{{ APP_NAME }}</div>

      <div class="card login-code-card">
        <div class="card-body login-code-body">
          <h5 class="card-title text-center mb-3">Sign in with email code</h5>

          <div class="login-code-step">
            <template v-if="!emailSent">
              <p class="text-muted small mb-3">
                Enter your account email and we will send a one-time sign-in code.
              </p>
              <label for="email" class="form-label">Email</label>
              <input id="email" v-model="email" type="email" class="form-control mb-3" required autofocus
                autocomplete="username" @input="clearMessage" />
            </template>

            <template v-else>
              <p class="text-muted small mb-3">
                Enter the 6-digit code sent to <strong>{{ email }}</strong>.
              </p>
              <label for="code" class="form-label">Verification code</label>
              <input id="code" v-model="code" type="text" inputmode="numeric" pattern="[0-9]{6}"
                maxlength="6" class="form-control mb-3 font-monospace" required autofocus
                autocomplete="one-time-code" @input="clearMessage" />
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
      </div>

      <button type="button" class="btn btn-link mt-3 w-100 text-center" @click="goToPasswordLogin">
        ← Back to password sign in
      </button>
    </form>

    <p id="footer" class="text-muted mt-4 mb-3 text-center">{{ copyright }}</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '../utils/api';
import { APP_NAME } from '@/utils/defs';
import { useUserStore } from '../stores/user';
import { useUIStore } from '@/stores/ui';
import { canAccessAdminUi } from '@/utils/roles';

const router = useRouter();
const userStore = useUserStore();
const uiStore = useUIStore();

const copyright = import.meta.env.VITE_COPYRIGHT;

const email = ref('');
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
#footer {
  position: static;
}

.form-signin {
  width: 100%;
  max-width: 330px;
  padding: 0 15px;
  margin: 50px auto 0;
}

.logotype {
  margin: 20px 0;
  font-size: 1.5em;
  font-weight: bolder;
}

.login-mark {
  width: 140px;
  height: auto;
}

.login-mark-hero {
  width: 180px;
}

.login-code-card {
  text-align: left;
}

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
