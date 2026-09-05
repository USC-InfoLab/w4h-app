<template>
  <div class="d-flex flex-column align-items-center justify-content-center">
    <div v-if="showDbConfig" class="card w-100 mx-auto" style="max-width: 450px;">
      <div class="card-body">
        <img class="login-mark mx-auto d-block mt-2" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
        <h2 class="text-center mt-3">{{ APP_NAME }} Setup</h2>
        <p class="text-muted text-center mb-3"></p>
        <div class="alert alert-info" role="alert">
          <div class="mt-1">
            Enter your <strong>PostgreSQL database credentials</strong> to connect W4H to your database.
            The database and the schema will be created automatically if they don't exist
            — the Postgres user must have <strong>CREATEDB privilege</strong> for that.
          </div>
          <div class="mt-2 small">
            <strong>Docker:</strong> if Postgres runs on your machine (not in this compose stack), use host
            <code>host.docker.internal</code> — not <code>localhost</code> or <code>127.0.0.1</code>
            (those point at the API container itself).
          </div>
        </div>

        <form @submit.prevent="testAndSaveConnection">
          <div class="row g-2 mb-3">
            <div class="col-md-9">
              <label class="form-label">Host</label>
              <input v-model="db.host" class="form-control" placeholder="host.docker.internal" required />
              <small class="form-text text-muted">On Docker Desktop (Mac/Windows), use <code>host.docker.internal</code> for Postgres on your laptop.</small>
            </div>
            <div class="col-md-3">
              <label class="form-label">Port</label>
              <input v-model="db.port" class="form-control" placeholder="5432" required />
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Database Name</label>
            <input v-model="db.database" class="form-control" placeholder="w4h-db" required />
            <small class="form-text text-muted">Name the W4H database. Database will be created if it doesn't exist. The
              <strong>w4h</strong> schema will be created inside.</small>
          </div>

          <div class="mb-3">
            <label class="form-label">Username</label>
            <input v-model="db.user" class="form-control" placeholder="postgres" required />
            <small class="form-text text-muted">Must have CREATEDB privilege (to create database if needed).</small>
          </div>

          <div class="mb-4">
            <label class="form-label">Password</label>
            <div class="input-group">
              <input :type="showDbPassword ? 'text' : 'password'" v-model="db.password" class="form-control"
                placeholder="********" required />
              <button type="button" class="btn btn-outline-secondary" @click="showDbPassword = !showDbPassword">
                {{ showDbPassword ? 'Hide' : 'Show' }}
              </button>
            </div>
          </div>

          <button :disabled="dbLoading" class="btn btn-primary w-100 btn-lg" type="submit">
            <span v-if="dbLoading" class="spinner-border spinner-border-sm me-2"></span>
            Connect to Database
          </button>
        </form>


        <div v-if="dbError" class="alert alert-danger mt-3">
          <div class="fw-bold mb-2">❌ Connection Failed</div>
          <div class="mb-2" style="white-space: pre-wrap;">{{ dbError }}</div>
          <div class="mb-3" style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;">
            <small class="d-block fw-semibold mb-1">Troubleshooting tips:</small>
            <small class="d-block">✓ Is PostgreSQL running on host:port you specified?</small>
            <small class="d-block">✓ Check username and password are correct</small>
            <small class="d-block">✓ User must have CREATEDB privilege</small>
            <small class="d-block">✓ Check firewall/network connectivity to database host</small>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="showAdminSetup" class="card w-100 mx-auto" style="max-width: 450px;">
      <form class="card-body" @submit.prevent="setupInitialAdmin">
        <img class="login-mark mx-auto d-block mt-2" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
        <h2 class="text-center mt-3">{{ APP_NAME }} Admin Setup</h2>

        <div class="mb-3">
          <label class="form-label">Admin Email (used for login)</label>
          <input type="email" v-model="admin.email" class="form-control" placeholder="admin@example.com" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Name (optional)</label>
          <input v-model="admin.name" class="form-control" placeholder="Administrator" />
        </div>

        <div class="alert alert-info mb-3">
          <small><strong>Password requirements:</strong> Minimum 12 characters with uppercase, lowercase,
            number, and special character.</small>
        </div>

        <div class="mb-2">
          <label class="form-label">Password</label>
          <div class="input-group">
            <input :type="showAdminPassword ? 'text' : 'password'" v-model="admin.password" class="form-control"
              placeholder="Choose a strong password" required />
            <button type="button" class="btn btn-outline-secondary" @click="showAdminPassword = !showAdminPassword"
              tabindex="-1">
              <i :class="showAdminPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
          </div>
          <div class="mt-1">
            <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none" @click="suggestAdminPassword">
              <i class="bi bi-key me-1"></i>Suggest password
            </button>
          </div>
        </div>

        <div class="mb-4">
          <label class="form-label">Confirm Password</label>
          <div class="input-group">
            <input :type="showAdminConfirmPassword ? 'text' : 'password'" v-model="admin.passwordConfirm"
              class="form-control" placeholder="Re-enter password" required />
            <button type="button" class="btn btn-outline-secondary"
              @click="showAdminConfirmPassword = !showAdminConfirmPassword" tabindex="-1">
              <i :class="showAdminConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
          </div>
        </div>

        <button :disabled="adminLoading" class="btn btn-primary w-100 btn-lg" type="submit">
          <span v-if="adminLoading" class="spinner-border spinner-border-sm me-2"></span>
          Create Admin Account
        </button>

        <div v-if="adminError" class="alert alert-danger mt-3">
          <div class="fw-bold mb-2">❌ Admin Setup Failed</div>
          <div style="white-space: pre-wrap;">{{ adminError }}</div>
        </div>
      </form>
    </div>

    <div v-else-if="showApiKeyReveal" class="card w-100 mx-auto" style="max-width: 450px;">
      <div class="card-body">
        <img class="login-mark mx-auto d-block mt-2" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
        <h2 class="text-center mt-3">Your Personal API Key</h2>
        <p class="text-muted text-center mb-3">
          Generated automatically with your account — use it to authenticate notebooks and CLI tools.
        </p>

        <div class="mb-2">
          <CopyBox :data="issuedApiKey?.key || ''" />
        </div>

        <div class="alert alert-warning py-2 small">
          <strong>Copy this now — it will not be shown again.</strong>
          If you lose it, generate a new one later from Profile → API keys.
          Never put it in source code, repositories, or notebooks you share.
        </div>

        <button class="btn btn-primary w-100 btn-lg" type="button" @click="continueAfterApiKeySetup">
          Continue to {{ APP_NAME }}
        </button>
      </div>
    </div>

    <div v-else-if="backendError" class="card w-100 mx-auto" style="max-width: 450px;">
      <div class="card-body text-center">
        <img class="login-mark mx-auto d-block mt-2" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
        <h2 class="text-center mt-3">Backend Unavailable</h2>
        <div class="alert alert-danger mt-4" role="alert">
          <div class="fw-bold mb-2">⚠️ Cannot Connect to API Server</div>
          <div>{{ backendError }}</div>
        </div>
        <button class="btn btn-primary mt-3" @click="checkDbStatus()">
          Retry Connection
        </button>
      </div>
    </div>

    <form
      v-else
      class="form-signin mx-auto"
      autocomplete="on"
      method="post"
      action="/login"
      @submit.prevent="login()"
    >
      <img class="login-mark login-mark-hero mt-5 mx-auto d-block" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
      <div class="logotype mb-4 text-center">{{ APP_NAME }}</div>

      <label for="inputEmail" class="form-label text-start w-100 mb-1">Email</label>
      <input
        id="inputEmail"
        name="username"
        type="email"
        class="form-control"
        placeholder="you@example.com"
        required
        autofocus
        v-model="email"
        autocomplete="username"
        @input="resetMessage"
        @change="syncLoginFromDom"
        @animationstart="onLoginAutofill"
      />

      <label for="inputPassword" class="form-label text-start w-100 mb-1 mt-2">Password</label>
      <div class="position-relative mb-3">
        <input
          id="inputPassword"
          name="password"
          :type="showLoginPassword ? 'text' : 'password'"
          class="form-control"
          placeholder="Password"
          required
          v-model="password"
          autocomplete="current-password"
          @input="onPasswordInput"
          @change="syncLoginFromDom"
          @animationstart="onLoginAutofill"
        />
        <button type="button" class="btn-eye-toggle" @click="showLoginPassword = !showLoginPassword" tabindex="-1">
          <i :class="showLoginPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
        </button>
      </div>

      <button class="w-100 btn btn-lg btn-primary" type="submit">Sign in</button>

      <div class="btn btn-link mt-3 w-100 text-center" @click="router.push({ name: 'loginCode' })">
        Login with email code
      </div>

      <p class="mt-2 fw-bold text-danger text-center">{{ message }}</p>
    </form>

    <p id="footer" class="text-muted mt-4 mb-3 text-center">{{ copyright }}</p>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue';
import { api } from '../utils/api';
import { validatePassword, PASSWORD_REQUIREMENTS } from '@/utils/password-validator';
import { APP_NAME } from '@/utils/defs';
import { readLastLoginEmail, rememberLoginEmail } from '@/utils/loginRemember';
import { getLoginCredential, storeLoginCredential } from '@/utils/browserCredentials';
import CopyBox from '@/components/CopyBox.vue';
import { useRouter } from 'vue-router';
const router = useRouter();

import { useUserStore } from '../stores/user';
const userStore = useUserStore();

const copyright = import.meta.env.VITE_COPYRIGHT;

import { useUIStore } from '@/stores/ui';
import { canAccessAdminUi } from '@/utils/roles';
const uiStore = useUIStore();

const dbConfigured = ref(true);
const showDbConfig = ref(false);
const showAdminSetup = ref(false);
const showApiKeyReveal = ref(false);
const issuedApiKey = ref(null);
const dbLoading = ref(false);
const dbError = ref('');
const adminLoading = ref(false);
const adminError = ref('');
const backendError = ref('');
const showLoginPassword = ref(false);
const showDbPassword = ref(false);
const showAdminPassword = ref(false);
const showAdminConfirmPassword = ref(false);

const db = reactive({
  host: '',
  port: '5432',
  database: '',
  user: '',
  password: ''
});

const admin = reactive({
  email: '',
  name: '',
  password: '',
  passwordConfirm: ''
});

function suggestAdminPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@$!%*?&#^_+-';
  const all = upper + lower + digits + special;
  const arr = new Uint32Array(16);
  crypto.getRandomValues(arr);
  let pw = [
    upper[arr[0] % upper.length],
    lower[arr[1] % lower.length],
    digits[arr[2] % digits.length],
    special[arr[3] % special.length],
  ];
  for (let i = 4; i < arr.length; i++) {
    pw.push(all[arr[i] % all.length]);
  }
  for (let i = pw.length - 1; i > 0; i--) {
    const j = arr[i % arr.length] % (i + 1);
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  const generated = pw.join('');
  admin.password = generated;
  admin.passwordConfirm = generated;
  showAdminPassword.value = true;
  showAdminConfirmPassword.value = true;
}

const checkDbStatus = async () => {

  try {
    const res = await api.get('config/status');

    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);

    if (typeof res.data !== 'object') {
      backendError.value = 'Application is not configured correctly. Please set VITE_API_URL in your .env file and restart.';
      return;
    }

    console.log(res);
    dbConfigured.value = !!res.data.configured;
    showDbConfig.value = !dbConfigured.value;
    showAdminSetup.value = dbConfigured.value && !!res.data.requiresAdminSetup;
    backendError.value = '';

    // If database config is needed, prefill any existing settings from the status response
    if (!dbConfigured.value && res.data.details) {
      const d = res.data.details;
      if (d.host) db.host = d.host;
      if (d.port) db.port = d.port;
      if (d.database) db.database = d.database;
      if (d.user) db.user = d.user;
    }
  } catch (err) {
    // Only treat as "not configured" if status code is 503 (Service Unavailable)
    // Other errors (network, auth, etc.) should not show DB config form
    if (err.response?.status === 503) {
      dbConfigured.value = false;
      showDbConfig.value = true;
      showAdminSetup.value = false;
      backendError.value = '';
    } else {
      console.error('Failed to check database status:', err);
      showDbConfig.value = false;
      backendError.value = 'Backend server is not available. Please check if the API server is running.';
    }
  }
};

const login = async () => {
  syncLoginFromDom();
  const passEl = document.getElementById('inputPassword');
  const pwd = String(passEl?.value || password.value || '');
  password.value = pwd;
  try {
    const response = await api.post('users/login', {
      email: email.value.trim(),
      password: pwd,
    });

    if (response.data.error) {
      message.value = response.data.error.message;
    } else {
      const user = response.data;
      rememberLoginEmail(email.value);
      await storeLoginCredential(email.value, password.value);
      localStorage.setItem('w4h.user.token', user.token);
      await userStore.setUser(user);

      // Super admins land in Platform Admin; Team admins / others use the app shell.
      if (canAccessAdminUi(user.role, user.caps)) {
        uiStore.enterAdmin();
        router.push({ name: 'adminHome' });
      } else {
        uiStore.exitAdmin();
        router.push('/home');
      }
    }
  } catch (error) {
    message.value = 'Login failed:' + error;
  }
};

const testAndSaveConnection = async () => {
  dbLoading.value = true;
  dbError.value = '';

  try {
    const res = await api.post('config/init-database', {
      ...db
    });

    if (res.data.success) {
      showDbConfig.value = false;
      showAdminSetup.value = true;
      dbError.value = '';
    } else {
      dbError.value = res.data.error || res.data.message || 'Connection failed.';
    }
  } catch (err) {
    // Show specific error from server if available
    let errorMsg = err.response?.data?.error || err.response?.data?.message;
    let detailsMsg = err.response?.data?.details;

    if (!errorMsg) {
      if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
        errorMsg = 'Connection refused - PostgreSQL may not be running or host/port is incorrect';
      } else if (err.message?.includes('ENOTFOUND')) {
        errorMsg = 'Host not found - check the database host address';
      } else if (err.message?.includes('ETIMEDOUT')) {
        errorMsg = 'Connection timed out - check firewall and network connectivity';
      } else {
        errorMsg = 'Connection failed. Check your database settings.';
      }
    }

    // If we have additional details, append them
    if (detailsMsg && detailsMsg !== errorMsg) {
      dbError.value = `${errorMsg}\n\nDetails: ${detailsMsg}`;
    } else {
      dbError.value = errorMsg;
    }
  } finally {
    dbLoading.value = false;
  }
};

const setupInitialAdmin = async () => {
  adminLoading.value = true;
  adminError.value = '';

  if (!admin.email || !admin.password || !admin.passwordConfirm) {
    adminLoading.value = false;
    adminError.value = 'Email, password, and confirmation are required.';
    return;
  }

  if (admin.password !== admin.passwordConfirm) {
    adminLoading.value = false;
    adminError.value = 'Admin passwords do not match.';
    return;
  }

  if (!validatePassword(admin.password)) {
    adminLoading.value = false;
    adminError.value = PASSWORD_REQUIREMENTS;
    return;
  }

  try {
    const res = await api.post('config/admin-setup', {
      email: admin.email,
      name: admin.name,
      password: admin.password
    });

    if (res.data.success) {
      rememberLoginEmail(admin.email);
      await storeLoginCredential(admin.email, admin.password);
      localStorage.setItem('w4h.user.token', res.data.token);
      await userStore.setUser(res.data.user);
      userStore.markSetupGuidePending();
      uiStore.enterAdmin();

      // D-16a: a personal API key is auto-issued with the account. Show it once
      // (same "copy now, won't be shown again" pattern as Profile → API keys)
      // before continuing into the app — otherwise it's generated but never seen.
      if (res.data.api_key) {
        issuedApiKey.value = { key: res.data.api_key, prefix: res.data.api_key_prefix };
        showAdminSetup.value = false;
        showApiKeyReveal.value = true;
      } else {
        router.push({ name: 'adminHome' });
      }
    } else {
      adminError.value = res.data.error || res.data.message || 'Failed to create admin account.';
    }
  } catch (err) {
    let errorMsg = err.response?.data?.error || err.response?.data?.message;
    let detailsMsg = err.response?.data?.details;

    if (!errorMsg) {
      errorMsg = 'Failed to create admin account.';
    }

    if (detailsMsg && detailsMsg !== errorMsg) {
      adminError.value = `${errorMsg}\n\nDetails: ${detailsMsg}`;
    } else {
      adminError.value = errorMsg;
    }
  } finally {
    adminLoading.value = false;
  }
};

const continueAfterApiKeySetup = () => {
  issuedApiKey.value = null;
  showApiKeyReveal.value = false;
  router.push({ name: 'adminHome' });
};

const resetMessage = () => {
  message.value = '';
};

function initialLoginFields() {
  const lastEmail = readLastLoginEmail();
  return { email: lastEmail, password: '' };
}

const seeded = initialLoginFields();
const email = ref(seeded.email);
const password = ref(seeded.password);
const message = ref('');

function syncLoginFromDom() {
  const userEl = document.getElementById('inputEmail');
  const passEl = document.getElementById('inputPassword');
  if (userEl?.value) email.value = userEl.value;
  if (passEl?.value) password.value = passEl.value;
}

function onPasswordInput(event) {
  resetMessage();
  password.value = event?.target?.value ?? '';
}

function onLoginAutofill(event) {
  const name = String(event.animationName || '');
  if (!name.includes('w4h-onAutoFillStart')) return;
  syncLoginFromDom();
  nextTick(syncLoginFromDom);
}

async function hydrateLoginFields() {
  syncLoginFromDom();
  if (!password.value) {
    const saved = await getLoginCredential();
    if (saved?.email && !email.value) email.value = saved.email;
    if (saved?.password) password.value = saved.password;
  }
  if (!email.value || !password.value) {
    const again = initialLoginFields();
    if (!email.value) email.value = again.email;
    if (!password.value) password.value = again.password;
  }
  syncLoginFromDom();
}

onMounted(async () => {
  await checkDbStatus();
  await nextTick();
  await hydrateLoginFields();
  window.setTimeout(syncLoginFromDom, 50);
  window.setTimeout(syncLoginFromDom, 300);
});
</script>

<style scoped>
/* REMOVED: body { min-height: 50vh; } */

#footer {
  position: static;
}

.form-signin {
  width: 100%;
  max-width: 360px;
  padding: 0px 15px;
  margin: 50px auto 0;
}

/* ... rest of existing styles ... */
.form-signin .checkbox {
  font-weight: 400;
}

.form-signin .form-control {
  position: relative;
  box-sizing: border-box;
  height: auto;
  padding: 10px;
  font-size: 16px;
}

.form-signin h1 {
  font-size: 6em;
}

.form-signin .form-control:focus {
  z-index: 2;
}

.form-signin input[type='email'] {
  margin-bottom: -1px;
  border-bottom-right-radius: 0;
  border-bottom-left-radius: 0;
}

.form-signin #inputPassword {
  margin-bottom: 0;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
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

.btn-eye-toggle {
  position: absolute;
  right: 10px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  z-index: 3;
}

.btn-eye-toggle:hover {
  color: inherit;
}

#inputEmail {
  border-bottom-left-radius: 0px !important;
  border-bottom-right-radius: 0px !important;
}
</style>

<style>
.form-signin #inputEmail:-webkit-autofill,
.form-signin #inputPassword:-webkit-autofill {
  animation-name: w4h-onAutoFillStart;
  animation-duration: 0.001s;
}

.form-signin #inputEmail:not(:-webkit-autofill),
.form-signin #inputPassword:not(:-webkit-autofill) {
  animation-name: w4h-onAutoFillCancel;
  animation-duration: 0.001s;
}

@keyframes w4h-onAutoFillStart {
  from { opacity: 0.99; }
  to { opacity: 1; }
}

@keyframes w4h-onAutoFillCancel {
  from { opacity: 0.99; }
  to { opacity: 1; }
}
</style>
