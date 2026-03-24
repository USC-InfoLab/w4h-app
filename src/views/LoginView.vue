<template>
  <div class="d-flex flex-column justify-content-center">
    <div v-if="showDbConfig" class="card w-100 mx-auto" style="max-width: 450px;">
      <div class="card-body">
        <img class="mx-auto d-block mt-2" style="width: 180px" :src="logoSrc" :alt="`${APP_NAME} logo`" />
        <h2 class="text-center mt-3">{{ APP_NAME }} Setup</h2>
        <p class="text-muted text-center mb-3"></p>
        <div class="alert alert-info" role="alert">
          <div class="mt-1">
            <strong>Postgres user must have CREATEDB privilege</strong> to create the database and
            schema if they don't exist.
          </div>
        </div>

        <form @submit.prevent="testAndSaveConnection">
          <div class="row g-2 mb-3">
            <div class="col-md-9">
              <label class="form-label">Host</label>
              <input v-model="db.host" class="form-control" placeholder="localhost" required />
            </div>
            <div class="col-md-3">
              <label class="form-label">Port</label>
              <input v-model="db.port" class="form-control" placeholder="5432" required />
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Database Name</label>
            <input v-model="db.database" class="form-control" placeholder="w4h-db" required />
            <small class="form-text text-muted">Database will be created if it doesn't exist. The <strong>w4h</strong>
              schema will be created inside.</small>
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
        <img class="mx-auto d-block mt-2" style="width: 180px" :src="logoSrc" :alt="`${APP_NAME} logo`" />
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

    <div v-else-if="backendError" class="card w-100 mx-auto" style="max-width: 450px;">
      <div class="card-body text-center">
        <img class="mx-auto d-block mt-2" style="width: 180px" :src="logoSrc" :alt="`${APP_NAME} logo`" />
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

    <form v-else class="form-signin w-100" @submit.prevent="login()" style="max-width: 360px;">
      <img class="mt-5 mx-auto d-block" style="width: 230px" :src="logoSrc" :alt="`${APP_NAME} logo`" />
      <div class="logotype mb-4 text-center">{{ APP_NAME }}</div>

      <label for="inputEmail" class="visually-hidden">Email</label>
      <input id="inputEmail" class="form-control" placeholder="Email" required autofocus v-model="email"
        @input="resetMessage" />

      <label for="inputPassword" class="visually-hidden">Password</label>
      <div class="position-relative mb-3">
        <input :type="showLoginPassword ? 'text' : 'password'" id="inputPassword" class="form-control"
          placeholder="Password" required v-model="password" @input="resetMessage" autocomplete="on" />
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
import { ref, reactive, onMounted, computed } from 'vue';
import { api } from '../utils/api';
import { validatePassword, PASSWORD_REQUIREMENTS } from '@/utils/password-validator';
import { APP_NAME } from '@/utils/defs';
import { useRouter } from 'vue-router';
const router = useRouter();

import { useUserStore } from '../stores/user';
const userStore = useUserStore();

const copyright = import.meta.env.VITE_COPYRIGHT;

import { useUIStore } from '@/stores/ui';
const uiStore = useUIStore();

const logoSrc = computed(() => (uiStore.darkMode ? '/w4h-dark.svg' : '/w4h-light.svg'));

const dbConfigured = ref(true);
const showDbConfig = ref(false);
const showAdminSetup = ref(false);
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
  email: import.meta.env.VITE_APP_ADMIN_EMAIL || '',
  name: import.meta.env.VITE_APP_ADMIN_NAME || '',  //XXX: needed?
  password: import.meta.env.VITE_APP_ADMIN_PASSWORD || '',
  passwordConfirm: import.meta.env.VITE_APP_ADMIN_PASSWORD || ''
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

const fetchDatabaseSettings = async () => {
  try {
    const res = await api.get('config/database-settings');
    console.log('Fetched database settings:', res.data);
    if (res.data.host) db.host = res.data.host;
    if (res.data.port) db.port = res.data.port;
    if (res.data.database) db.database = res.data.database;
    if (res.data.user) db.user = res.data.user;
  } catch (err) {
    // Silently fail - just use default values
    console.log('Could not fetch database settings:', err.message);
  }
};

const checkDbStatus = async () => {

  try {
    const res = await api.get('config/status');
    dbConfigured.value = !!res.data.configured;
    showDbConfig.value = !dbConfigured.value;
    showAdminSetup.value = false;
    backendError.value = '';

    // If database config is needed, prefill any existing settings
    if (!dbConfigured.value) {
      await fetchDatabaseSettings();
    }
  } catch (err) {
    // Only treat as "not configured" if status code is 503 (Service Unavailable)
    // Other errors (network, auth, etc.) should not show DB config form
    if (err.response?.status === 503) {
      dbConfigured.value = false;
      showDbConfig.value = true;
      showAdminSetup.value = false;
      backendError.value = '';
      await fetchDatabaseSettings();
    } else {
      console.error('Failed to check database status:', err);
      showDbConfig.value = false;
      backendError.value = 'Backend server is not available. Please check if the API server is running.';
    }
  }
};

const login = async () => {
  try {
    const response = await api.post('users/login', {
      email: email.value.trim(),
      password: password.value.trim(),
    });

    if (response.data.error) {
      message.value = response.data.error.message;
    } else {
      const user = response.data;
      localStorage.setItem('w4h.user.token', user.token);
      await userStore.setUser(user);

      if (user.role === 'admin') uiStore.exitAdmin();

      router.push('/home');
    }
  } catch (error) {
    message.value = 'Login failed:' + error;
  }
};

const testAndSaveConnection = async () => {
  dbLoading.value = true;
  dbError.value = '';

  try {
    const res = await api.post('config/database', {
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
      localStorage.setItem('w4h.user.token', res.data.token);
      await userStore.setUser(res.data.user);
      router.push('/home');
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

const resetMessage = () => {
  message.value = '';
};

const email = ref('');
const password = ref('');
const message = ref('');

/**
 * Prefill login from `.env` in dev only.
 * Uses `VITE_APP_LOGIN_EMAIL` / `VITE_APP_LOGIN_PASSWORD`, or falls back to
 * `VITE_APP_ADMIN_EMAIL` / `VITE_APP_ADMIN_PASSWORD` (same keys as admin setup).
 */
function applyDevLoginPrefill() {
  if (!import.meta.env.DEV) return;
  if (showDbConfig.value || showAdminSetup.value || backendError.value) return;
  const devEmail =
    import.meta.env.VITE_APP_LOGIN_EMAIL?.trim() ||
    import.meta.env.VITE_APP_ADMIN_EMAIL?.trim();
  const devPassword =
    import.meta.env.VITE_APP_LOGIN_PASSWORD?.trim() ||
    import.meta.env.VITE_APP_ADMIN_PASSWORD?.trim();
  if (devEmail) email.value = devEmail;
  if (devPassword) password.value = devPassword;
}

onMounted(async () => {
  await checkDbStatus();
  applyDevLoginPrefill();
});
</script>

<style scoped>
/* REMOVED: body { min-height: 50vh; } */

#footer {
  position: static;
}

.form-signin {
  width: 100%;
  max-width: 330px;
  padding: 0px 15px;
  /* ADJUSTMENT: Add margin-top to place the dialog closer to the top of the page */
  margin: 50px auto 0;
  /* Add margin to push the form down from the top */
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
