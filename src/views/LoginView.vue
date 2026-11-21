<template>
  <GuestAuthLayout :panel="setupPanel" :db-mode="layoutDbMode">
    <div v-if="showDbChoice" class="card guest-card text-start">
      <div class="card-body">
        <img class="login-mark mx-auto d-block mt-2" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
        <h2 class="text-center mt-3">{{ APP_NAME }} Setup</h2>
        <p class="text-muted text-center mb-4">Choose where W4H keeps its data.</p>

        <button type="button" class="btn btn-primary w-100 btn-lg" @click="chooseBuiltin">
          Built-in database (this computer)
        </button>
        <p class="small text-muted mt-1 mb-4">
          Recommended. W4H sets up its own database on this computer. No database knowledge needed.
        </p>

        <button type="button" class="btn btn-outline-secondary w-100" @click="chooseExternal">
          Connect to your own PostgreSQL
        </button>
        <p class="small text-muted mt-1 mb-0">
          For a server you already run. You need its host, port, user and password.
        </p>
      </div>
    </div>

    <div v-else-if="showBuiltinSetup" class="card guest-card text-start">
      <form class="card-body" @submit.prevent="setupBuiltin">
        <img class="login-mark mx-auto d-block mt-2" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
        <h2 class="text-center mt-3">Create your account</h2>
        <p class="text-muted text-center small mb-3">
          You become the Admin of a new team. W4H also creates a separate Super admin account
          for recovery and shows its password once on the next screen.
        </p>

        <div class="mb-3">
          <label for="builtinName" class="form-label">Your name</label>
          <input id="builtinName" v-model="builtin.name" class="form-control" placeholder="Jane Doe" required
            autocomplete="name" />
          <small class="form-text text-muted">Your team is named after you. You can rename it later.</small>
        </div>

        <div class="mb-3">
          <label for="builtinEmail" class="form-label">Email (used for sign-in)</label>
          <input id="builtinEmail" type="email" v-model="builtin.email" class="form-control"
            placeholder="you@example.com" required autocomplete="username" />
        </div>

        <div class="alert alert-info mb-3">
          <small><strong>Password requirements:</strong> {{ PASSWORD_REQUIREMENTS }}</small>
        </div>

        <div class="mb-2">
          <label for="builtinPassword" class="form-label">Password</label>
          <div class="input-group">
            <input id="builtinPassword" :type="showBuiltinPassword ? 'text' : 'password'" v-model="builtin.password"
              class="form-control" placeholder="Choose a strong password" required autocomplete="new-password" />
            <button type="button" class="btn btn-outline-secondary" @click="showBuiltinPassword = !showBuiltinPassword"
              tabindex="-1" :aria-label="showBuiltinPassword ? 'Hide password' : 'Show password'">
              <i :class="showBuiltinPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
          </div>
          <div class="mt-1">
            <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none" @click="suggestBuiltinPassword">
              <i class="bi bi-key me-1"></i>Suggest password
            </button>
          </div>
        </div>

        <div class="mb-3">
          <label for="builtinPasswordConfirm" class="form-label">Confirm password</label>
          <div class="input-group">
            <input id="builtinPasswordConfirm" :type="showBuiltinConfirmPassword ? 'text' : 'password'"
              v-model="builtin.passwordConfirm" class="form-control" placeholder="Re-enter password" required
              autocomplete="new-password" />
            <button type="button" class="btn btn-outline-secondary"
              @click="showBuiltinConfirmPassword = !showBuiltinConfirmPassword" tabindex="-1"
              :aria-label="showBuiltinConfirmPassword ? 'Hide password' : 'Show password'">
              <i :class="showBuiltinConfirmPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
          </div>
        </div>

        <div class="form-check mb-4">
          <input id="builtinLoadSamples" v-model="builtin.loadSamples" class="form-check-input" type="checkbox" />
          <label class="form-check-label" for="builtinLoadSamples">
            Load sample data
            <small class="d-block text-muted">Shows you which Jupyter notebook loads a synthetic Fitbit sample.</small>
          </label>
        </div>

        <button :disabled="builtinLoading" class="btn btn-primary w-100 btn-lg" type="submit">
          <span v-if="builtinLoading" class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
          {{ builtinLoading ? 'Setting up the database… this can take a minute' : 'Set up W4H' }}
        </button>

        <div v-if="builtinError" class="alert alert-danger mt-3" role="alert">
          <div class="fw-bold mb-2">❌ Setup Failed</div>
          <div style="white-space: pre-wrap;">{{ builtinError }}</div>
          <button v-if="builtinErrorStatus === 409" type="button" class="btn btn-sm btn-outline-secondary mt-2"
            @click="builtinError = ''; checkDbStatus()">
            Go to sign in
          </button>
        </div>

        <button v-if="builtinAvailable && !builtinLoading" type="button" class="btn btn-link btn-sm w-100 mt-2"
          @click="backToChoice">
          Back
        </button>
      </form>
    </div>

    <div v-else-if="showRecovery" class="card guest-card text-start">
      <div class="card-body">
        <img class="login-mark mx-auto d-block mt-2" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
        <h2 class="text-center mt-3">Save your recovery record</h2>
        <p class="text-muted small mb-3">
          Keep this in a password manager or on another device. It will not be shown again.
          The Super admin account manages this installation (settings, usage export); you use your own account
          for daily work.
        </p>

        <div v-if="recoveryWarning" class="alert alert-warning small" role="alert">
          <strong>Warning:</strong> {{ recoveryWarning }}
        </div>

        <dl class="mb-3">
          <template v-for="field in recoveryFields" :key="field.key">
            <dt class="small text-muted fw-normal">{{ field.label }}</dt>
            <dd class="mb-2">
              <CopyBox :data="field.value" />
            </dd>
          </template>
        </dl>

        <button type="button" class="btn btn-outline-primary w-100 mb-3" @click="downloadRecovery">
          <i class="bi bi-download me-1" aria-hidden="true"></i>Download recovery record
        </button>

        <div v-if="recoverySamples?.requested" class="alert alert-info small" role="note">
          <strong>Sample data:</strong> after you continue, open Jupyter and run
          <code>{{ recoverySamples.notebook }}</code>. Jupyter uses your API key automatically; if a
          notebook asks for one, copy it from Profile → API keys.
        </div>

        <div class="form-check mb-3">
          <input id="recoverySaved" v-model="recoverySaved" class="form-check-input" type="checkbox" />
          <label class="form-check-label" for="recoverySaved">I've saved this</label>
        </div>

        <button class="btn btn-primary w-100 btn-lg" type="button" :disabled="!recoverySaved"
          @click="continueAfterRecovery">
          Continue to {{ APP_NAME }}
        </button>
      </div>
    </div>

    <div v-else-if="showDbConfig" class="card guest-card text-start">
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
              <small class="form-text text-muted">On Docker Desktop (Mac/Windows), use <code>host.docker.internal</code>
                for Postgres on your laptop.</small>
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

        <button v-if="builtinAvailable && !dbLoading" type="button" class="btn btn-link btn-sm w-100 mt-2"
          @click="backToChoice">
          Back
        </button>


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

    <div v-else-if="showAdminSetup" class="card guest-card text-start">
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

    <div v-else-if="showApiKeyReveal" class="card guest-card text-start">
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

    <div v-else-if="backendError" class="card guest-card">
      <div class="card-body text-center">
        <img class="login-mark mx-auto d-block mt-2" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
        <h2 class="text-center mt-3">{{ dbUnreachable ? 'Database Not Reachable' : 'Backend Unavailable' }}</h2>
        <div class="alert alert-danger mt-4" role="alert">
          <div class="fw-bold mb-2">⚠️ {{ dbUnreachable ? 'W4H cannot reach its database' : 'Cannot Connect to API Server' }}</div>
          <div>{{ backendError }}</div>
        </div>
        <button class="btn btn-primary mt-3" @click="checkDbStatus()">
          Retry Connection
        </button>
      </div>
    </div>

    <form v-else class="card guest-card text-start" autocomplete="on" method="post" action="/login"
      @submit.prevent="login()">
      <div class="card-body p-4">
        <h2 class="h4 mb-1">Sign in</h2>
        <p class="text-muted small mb-4">Use the email from your invitation.</p>

        <label for="inputEmail" class="form-label">Email</label>
        <input id="inputEmail" name="username" type="email" class="form-control mb-3" placeholder="you@usc.edu" required
          autofocus v-model="email" autocomplete="username" @input="resetMessage" @change="syncLoginFromDom"
          @animationstart="onLoginAutofill" />

        <label for="inputPassword" class="form-label">Password</label>
        <div class="position-relative mb-3">
          <input id="inputPassword" name="password" :type="showLoginPassword ? 'text' : 'password'"
            class="form-control pe-5" placeholder="Password" required v-model="password"
            autocomplete="current-password" @input="onPasswordInput" @change="syncLoginFromDom"
            @animationstart="onLoginAutofill" />
          <button type="button" class="btn-eye-toggle" @click="showLoginPassword = !showLoginPassword" tabindex="-1"
            :aria-label="showLoginPassword ? 'Hide password' : 'Show password'">
            <i :class="showLoginPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
          </button>
        </div>

        <p v-if="loginNotice && !message" class="text-success small mb-3" role="status">{{ loginNotice }}</p>
        <p v-if="message" class="text-danger small mb-3" role="alert">{{ message }}</p>

        <button class="w-100 btn btn-lg btn-primary" type="submit">Sign in</button>

        <button v-if="mailConfigured" type="button" class="btn btn-link w-100 mt-2"
          @click="router.push({ name: 'loginCode' })">
          Sign in with email code
        </button>
      </div>
      <div v-if="dbMode !== 'builtin'" class="card-footer bg-transparent text-center py-3">
        <span class="text-muted small">New PI?</span>
        <button type="button" class="btn btn-link btn-sm py-0" @click="router.push({ name: 'requestAccess' })">
          Request access
        </button>
      </div>
    </form>
  </GuestAuthLayout>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { api } from '../utils/api';
import { validatePassword, PASSWORD_REQUIREMENTS } from '@/utils/password-validator';
import { APP_NAME } from '@/utils/defs';
import { readLastLoginEmail, rememberLoginEmail } from '@/utils/loginRemember';
import { getLoginCredential, storeLoginCredential } from '@/utils/browserCredentials';
import CopyBox from '@/components/CopyBox.vue';
import GuestAuthLayout from '@/components/GuestAuthLayout.vue';
import { useRouter } from 'vue-router';
const router = useRouter();

import { useUserStore } from '../stores/user';
const userStore = useUserStore();

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
// ADR-031 built-in install (config/status flags; defaults match an api without them).
const builtinAvailable = ref(false);
const dbMode = ref(null);
const mailConfigured = ref(false);
const dbUnreachable = ref(false);
const showDbChoice = ref(false);
const showBuiltinSetup = ref(false);
const showRecovery = ref(false);
const builtinLoading = ref(false);
const builtinError = ref('');
const builtinErrorStatus = ref(0);
const showBuiltinPassword = ref(false);
const showBuiltinConfirmPassword = ref(false);
const recovery = ref(null);
const recoverySession = ref(null);
const recoverySamples = ref(null);
const recoveryWarning = ref('');
const recoverySaved = ref(false);
const loginNotice = ref('');
// Guest layout copy follows the path the person is on; server db_mode is null until setup completes.
const layoutDbMode = computed(() => {
  if (showDbChoice.value) return 'choice';
  if (showBuiltinSetup.value || showRecovery.value) return 'builtin';
  return dbMode.value;
});
const setupPanel = computed(() =>
  (showDbChoice.value || showBuiltinSetup.value || showRecovery.value
    || showDbConfig.value || showAdminSetup.value || showApiKeyReveal.value) ? 'setup' : 'welcome'
);

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

const builtin = reactive({
  name: '',
  email: '',
  password: '',
  passwordConfirm: '',
  loadSamples: false,
});

function randomPassword() {
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
  return pw.join('');
}

function suggestAdminPassword() {
  const generated = randomPassword();
  admin.password = generated;
  admin.passwordConfirm = generated;
  showAdminPassword.value = true;
  showAdminConfirmPassword.value = true;
}

function suggestBuiltinPassword() {
  const generated = randomPassword();
  builtin.password = generated;
  builtin.passwordConfirm = generated;
  showBuiltinPassword.value = true;
  showBuiltinConfirmPassword.value = true;
}

function hideSetupPanels() {
  showDbChoice.value = false;
  showBuiltinSetup.value = false;
  showDbConfig.value = false;
  showAdminSetup.value = false;
  dbUnreachable.value = false;
}

/**
 * Pick the first-run panel from `config/status` (ADR-031 contract).
 * `!configured && db_mode` means setup happened but the database is unreachable now.
 */
function applyStatus(data) {
  const configured = !!data.configured;
  builtinAvailable.value = !!data.builtin_available;
  dbMode.value = data.db_mode || null;
  mailConfigured.value = !!data.mail_configured;
  dbConfigured.value = configured;
  hideSetupPanels();
  backendError.value = '';

  if (!configured && dbMode.value) {
    dbUnreachable.value = true;
    backendError.value = 'The database W4H was set up with is not reachable. '
      + 'If W4H was just started, wait a moment and retry.';
  } else if (!configured) {
    if (builtinAvailable.value) showDbChoice.value = true;
    else showDbConfig.value = true;
  } else if (data.requiresAdminSetup) {
    // A half-finished built-in setup must never offer admin-setup: it would make the person Super admin.
    if (dbMode.value === 'builtin') showBuiltinSetup.value = true;
    else showAdminSetup.value = true;
  }
}

function chooseBuiltin() {
  hideSetupPanels();
  showBuiltinSetup.value = true;
}

function chooseExternal() {
  hideSetupPanels();
  showDbConfig.value = true;
}

function backToChoice() {
  hideSetupPanels();
  builtinError.value = '';
  dbError.value = '';
  showDbChoice.value = true;
}

const PROMOTE_HINT = 'If the Super admin password was never saved, set a new one from the W4H folder: '
  + 'docker compose exec api node bin/w4h reset-password (account superadmin@w4h.local)';

function errorText(err, fallback) {
  const errorMsg = err.response?.data?.error || err.response?.data?.message || fallback;
  const detailsMsg = err.response?.data?.details;
  const warning = err.response?.data?.warning;
  let text = detailsMsg && detailsMsg !== errorMsg ? `${errorMsg}\n\nDetails: ${detailsMsg}` : errorMsg;
  if (warning) text += `\n\nWarning: ${warning}`;
  return text;
}

async function setupBuiltin() {
  builtinError.value = '';
  builtinErrorStatus.value = 0;
  builtin.name = builtin.name.trim();
  builtin.email = builtin.email.trim();
  if (!builtin.name || !builtin.email || !builtin.password || !builtin.passwordConfirm) {
    builtinError.value = 'Name, email, password, and confirmation are required.';
    return;
  }
  if (builtin.password !== builtin.passwordConfirm) {
    builtinError.value = 'Passwords do not match.';
    return;
  }
  if (!validatePassword(builtin.password)) {
    builtinError.value = PASSWORD_REQUIREMENTS;
    return;
  }

  builtinLoading.value = true;
  // A reload while the API works would lose the one-time recovery record.
  window.addEventListener('beforeunload', warnBeforeUnload);
  try {
    const res = await api.post('config/init-builtin', {
      name: builtin.name,
      email: builtin.email,
      password: builtin.password,
      load_samples: builtin.loadSamples,
    });
    if (!res.data?.success || !res.data.recovery) {
      window.removeEventListener('beforeunload', warnBeforeUnload);
      builtinError.value = res.data?.error || 'Built-in setup failed.';
      return;
    }
    // The recovery record is the only plaintext copy of the Super admin password: keep it first.
    recovery.value = res.data.recovery;
    rememberLoginEmail(builtin.email);
    storeLoginCredential(builtin.email, builtin.password); // best-effort, never throws
    recoverySession.value = res.data.session || null;
    recoverySamples.value = res.data.samples || null;
    recoveryWarning.value = res.data.warning || '';
    recoverySaved.value = false;
    builtin.password = '';
    builtin.passwordConfirm = '';
    dbMode.value = 'builtin';
    dbConfigured.value = true;
    hideSetupPanels();
    showRecovery.value = true;
  } catch (err) {
    window.removeEventListener('beforeunload', warnBeforeUnload);
    const status = err.response?.status || 0;
    builtinErrorStatus.value = status;
    // The API's own errors (e.g. 503 "built-in database not reachable yet") carry a JSON string
    // `error` and changed nothing: retry is safe. Proxy 502/504 pages and no response do not.
    const apiAnswered = typeof err.response?.data?.error === 'string';
    if (!err.response || (status >= 502 && !apiAnswered)) {
      // The request may have reached the API and committed; its answer (the recovery record) was lost.
      builtinErrorStatus.value = 409;
      builtinError.value = `No answer from the API (${status ? `HTTP ${status}` : 'no response'}). `
        + 'Setup may have finished on the server: do not retry yet. Reload this page and sign in with the '
        + `account you just entered. ${PROMOTE_HINT}`;
    } else {
      builtinError.value = errorText(err, 'Built-in setup failed.') + (status === 409 ? `\n\n${PROMOTE_HINT}` : '');
    }
  } finally {
    builtinLoading.value = false;
  }
}

const recoveryFields = computed(() => {
  const r = recovery.value || {};
  return [
    { key: 'super_admin_email', label: 'Super admin email', value: r.super_admin_email || '' },
    { key: 'super_admin_password', label: 'Super admin password', value: r.super_admin_password || '' },
    { key: 'db_user', label: 'Database user', value: r.db_user || '' },
    { key: 'db_password', label: 'Database password', value: r.db_password || '' },
    { key: 'version', label: 'W4H version', value: r.version || '' },
    { key: 'created_at', label: 'Created', value: r.created_at || '' },
  ];
});

function warnBeforeUnload(event) {
  event.preventDefault();
  event.returnValue = '';
}

function downloadRecovery() {
  const lines = [
    `${APP_NAME} recovery record`,
    '',
    ...recoveryFields.value.map((f) => `${f.label}: ${f.value}`),
    '',
    'If this record is lost, set a new Super admin password from the W4H folder:',
    '  docker compose exec api node bin/w4h reset-password',
    '  (account superadmin@w4h.local)',
    '',
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `W4H-recovery-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking at once can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function continueAfterRecovery() {
  window.removeEventListener('beforeunload', warnBeforeUnload);
  const session = recoverySession.value;
  recovery.value = null;
  recoverySession.value = null;
  showRecovery.value = false;
  if (session?.token) {
    try {
      await finishSignIn(session);
      return;
    } catch (err) {
      console.error('Sign-in after built-in setup failed:', err);
      localStorage.removeItem('w4h.user.token');
    }
  }
  // No session (built after commit and may fail) or it could not start: sign in normally.
  email.value = builtin.email;
  password.value = '';
  loginNotice.value = 'Your account is ready. Sign in with your email and password.';
}

/** Store the session and route by shell (Super admin → Platform Admin, others → app shell). */
async function finishSignIn(user) {
  localStorage.setItem('w4h.user.token', user.token);
  await userStore.setUser(user);
  if (canAccessAdminUi(user.role, user.caps)) {
    uiStore.enterAdmin();
    router.push({ name: 'adminHome' });
  } else {
    uiStore.exitAdmin();
    router.push('/home');
  }
}

const checkDbStatus = async () => {

  try {
    const res = await api.get('config/status');

    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);

    if (typeof res.data !== 'object') {
      backendError.value = 'Application is not configured correctly. Please set VITE_API_URL in your .env file and restart.';
      return;
    }

    applyStatus(res.data);

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
      applyStatus({ ...(err.response.data || {}), configured: false });
    } else {
      console.error('Failed to check database status:', err);
      hideSetupPanels();
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
      await finishSignIn(user);
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
  // Dev only: prefill from .env.development.local (not loaded by production builds).
  if (import.meta.env.DEV && import.meta.env.VITE_DEV_LOGIN_EMAIL) {
    return {
      email: String(import.meta.env.VITE_DEV_LOGIN_EMAIL).trim(),
      password: String(import.meta.env.VITE_DEV_LOGIN_PASSWORD || ''),
    };
  }
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

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', warnBeforeUnload);
  recovery.value = null;
});

onMounted(async () => {
  await checkDbStatus();
  await nextTick();
  await hydrateLoginFields();
  window.setTimeout(syncLoginFromDom, 50);
  window.setTimeout(syncLoginFromDom, 300);
});
</script>

<style scoped>
.guest-card {
  width: 100%;
  text-align: left;
}

.login-mark {
  width: 88px;
  height: auto;
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
  color: var(--w4h-muted, #888);
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  z-index: 3;
}

.btn-eye-toggle:hover {
  color: inherit;
}
</style>

<style>
#inputEmail:-webkit-autofill,
#inputPassword:-webkit-autofill {
  animation-name: w4h-onAutoFillStart;
  animation-duration: 0.001s;
}

#inputEmail:not(:-webkit-autofill),
#inputPassword:not(:-webkit-autofill) {
  animation-name: w4h-onAutoFillCancel;
  animation-duration: 0.001s;
}

@keyframes w4h-onAutoFillStart {
  from {
    opacity: 0.99;
  }

  to {
    opacity: 1;
  }
}

@keyframes w4h-onAutoFillCancel {
  from {
    opacity: 0.99;
  }

  to {
    opacity: 1;
  }
}
</style>
