<template>
  <div class="d-flex flex-column justify-content-center align-items-center vh-100">
    <div class="setup-container w-100" style="max-width: 450px;">
      <img class="mx-auto d-block" style="width: 180px" :src="logoSrc" alt="W4H Logo" />
      <h2 class="text-center mt-3">Database Setup</h2>
      <p class="text-muted text-center mb-3"><strong>Initial setup requires CREATEDB privilege.</strong></p>
      <p class="text-muted text-center mb-4" style="font-size: 0.85rem;">Database and schema will be created
        automatically if needed.</p>

      <form v-if="!success" @submit.prevent="testAndSaveConnection">
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
          <input v-model="db.database" class="form-control" placeholder="w4h_db" required />
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
          <input type="password" v-model="db.password" class="form-control" placeholder="••••••••" required />
        </div>

        <div class="mb-2">
          <label class="form-label">Admin Password</label>
          <input type="password" v-model="adminPassword" class="form-control" placeholder="Choose a strong password"
            required />
        </div>

        <div class="mb-4">
          <label class="form-label">Confirm Admin Password</label>
          <input type="password" v-model="adminPasswordConfirm" class="form-control" placeholder="Re-enter password"
            required />
        </div>

        <button :disabled="loading" class="btn btn-primary w-100 btn-lg" type="submit">
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          Initialize Database
        </button>
      </form>

      <div v-if="success" class="text-center">
        <div class="alert alert-success mb-4">
          <div class="fs-5 fw-bold mb-2">✓ Setup Complete!</div>
          <div>Infrastructure schema <strong>w4h</strong> is ready.</div>
        </div>

        <div class="alert alert-danger mb-4">
          <div class="fw-semibold mb-2">⚠️ CHANGE PASSWORD IMMEDIATELY</div>
          <div class="mb-3">An admin account was created with the password you entered.</div>
          <div style="font-size: 0.9rem; line-height: 1.6;" class="text-light">
            Please store the admin password securely. You can update it after you log in.
          </div>
        </div>

        <button class="btn btn-primary w-100 btn-lg" @click="proceedToLogin">
          Open Login Screen
        </button>
      </div>

      <div v-if="error" class="alert alert-danger mt-3">
        <div class="fw-bold mb-2">✗ Connection Failed</div>
        <div class="mb-2" style="white-space: pre-wrap;">{{ error }}</div>
        <div class="mb-0" style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 10px;">
          <small class="d-block fw-semibold mb-1">Troubleshooting tips:</small>
          <small class="d-block">✓ Is PostgreSQL running on host:port you specified?</small>
          <small class="d-block">✓ Check username and password are correct</small>
          <small class="d-block">✓ User must have CREATEDB privilege</small>
          <small class="d-block">✓ Check firewall/network connectivity to database host</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { api } from '../utils/api';
import { useRouter } from 'vue-router';
import { useUIStore } from '../stores/ui';

const router = useRouter();
const uiStore = useUIStore();
const loading = ref(false);
const error = ref('');
const success = ref(false);
const adminPassword = ref('');
const adminPasswordConfirm = ref('');

const logoSrc = computed(() => (uiStore.darkMode ? '/w4h-dark.svg' : '/w4h-light.svg'));

const db = reactive({
  host: '',
  port: '5432',
  database: '',
  user: '',
  password: ''
});

onMounted(async () => {
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
});

const testAndSaveConnection = async () => {
  loading.value = true;
  error.value = '';
  if (!adminPassword.value || !adminPasswordConfirm.value) {
    loading.value = false;
    error.value = 'Admin password and confirmation are required.';
    return;
  }

  if (adminPassword.value !== adminPasswordConfirm.value) {
    loading.value = false;
    error.value = 'Admin passwords do not match.';
    return;
  }

  try {
    const res = await api.post('setup/db-init', {
      ...db,
      adminPassword: adminPassword.value
    });
    if (res.data.success) {
      success.value = true;
    } else {
      error.value = res.data.message || 'Connection failed.';
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
      error.value = `${errorMsg}\n\nDetails: ${detailsMsg}`;
    } else {
      error.value = errorMsg;
    }
  } finally {
    loading.value = false;
  }
};

const proceedToLogin = () => {
  router.push({ name: 'login' });
};
</script>

<style scoped>
.setup-container {
  background: #1a1a1a;
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.form-label {
  color: #ccc;
  font-size: 0.9rem;
}

.form-control {
  background: #2d2d2d;
  border: 1px solid #444;
  color: white;
}

.form-control:focus {
  background: #333;
  color: white;
  border-color: #FFCC00;
  box-shadow: none;
}
</style>