<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/home">Admin</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Database</li>
      </ol>
    </nav>

    <div class="row gy-3">
      <div class="col-12 col-lg-8">
        <div class="card p-3">
          <h5 class="card-title mb-3">Database Settings</h5>

          <div v-if="loading" class="text-muted">Loading settings...</div>

          <form v-else @submit.prevent="saveSettings">
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">Host</label>
                <input v-model="form.host" class="form-control" placeholder="localhost" />
              </div>
              <div class="col-md-4">
                <label class="form-label">Port</label>
                <input v-model="form.port" class="form-control" placeholder="5432" />
              </div>

              <div class="col-12">
                <label class="form-label">Database</label>
                <input v-model="form.database" class="form-control" placeholder="w4h-db" />
              </div>

              <div class="col-md-6">
                <label class="form-label">User</label>
                <input v-model="form.user" class="form-control" placeholder="postgres" />
              </div>

              <div class="col-md-6">
                <label class="form-label">Password</label>
                <input v-model="form.password" type="password" class="form-control"
                  placeholder="Leave blank to keep current password" />
                <div class="form-text">Leave empty to keep the currently configured password.</div>
              </div>
            </div>

            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-primary" :disabled="saving" type="submit">
                <span v-if="saving" class="spinner-border spinner-border-sm me-1" />
                Save Settings
              </button>
              <button class="btn btn-outline-secondary" :disabled="testing" type="button" @click="testConnection">
                <span v-if="testing" class="spinner-border spinner-border-sm me-1" />
                Test Connection
              </button>
              <button class="btn btn-outline-primary" :disabled="backingUp" type="button" @click="backupDocs">
                <span v-if="backingUp" class="spinner-border spinner-border-sm me-1" />
                Backup Docs
              </button>
            </div>
          </form>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="card p-3 h-100">
          <h6 class="mb-2">Status</h6>
          <div :class="['alert mb-0', configured ? 'alert-success' : 'alert-warning']">
            {{ configured ? 'Database is configured' : 'Database is not configured' }}
          </div>
        </div>
      </div>

      <div v-if="message" class="col-12">
        <div :class="['alert', messageType === 'success' ? 'alert-success' : 'alert-danger']">
          {{ message }}
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { api, authHeaders } from '@/utils/api';

const loading = ref(true);
const saving = ref(false);
const testing = ref(false);
const backingUp = ref(false);
const configured = ref(false);
const message = ref('');
const messageType = ref('success');

const form = ref({
  host: '',
  port: '5432',
  database: '',
  user: '',
  password: ''
});

function setMessage(text, type = 'success') {
  message.value = text;
  messageType.value = type;
}

async function loadStatus() {
  loading.value = true;
  try {
    const res = await api.get('config/status', authHeaders());
    configured.value = !!res.data.configured;

    if (res.data.details) {
      form.value.host = res.data.details.host || '';
      form.value.port = String(res.data.details.port || '5432');
      form.value.database = res.data.details.database || '';
      form.value.user = res.data.details.user || '';
    }
  } catch (error) {
    setMessage(error.response?.data?.error || 'Failed to load database status', 'error');
  } finally {
    loading.value = false;
  }
}

async function saveSettings() {
  if (!form.value.host || !form.value.port || !form.value.database || !form.value.user) {
    setMessage('Host, port, database, and user are required.', 'error');
    return;
  }

  saving.value = true;
  try {
    const res = await api.post(
      'config/database',
      {
        host: form.value.host,
        port: form.value.port,
        database: form.value.database,
        user: form.value.user,
        ...(form.value.password ? { password: form.value.password } : {})
      },
      authHeaders()
    );

    setMessage(res.data.message || 'Database settings saved successfully', 'success');
    form.value.password = '';
    await loadStatus();
  } catch (error) {
    const details = error.response?.data?.details || error.message;
    const err = error.response?.data?.error || 'Failed to save database settings';
    setMessage(`${err}${details ? `: ${details}` : ''}`, 'error');
  } finally {
    saving.value = false;
  }
}

async function testConnection() {
  testing.value = true;
  try {
    const res = await api.get('config/test', authHeaders());
    setMessage(res.data.message || 'Database connection successful', 'success');
  } catch (error) {
    const details = error.response?.data?.details || error.message;
    const err = error.response?.data?.error || 'Database connection failed';
    setMessage(`${err}${details ? `: ${details}` : ''}`, 'error');
  } finally {
    testing.value = false;
  }
}

async function backupDocs() {
  backingUp.value = true;
  try {
    const res = await api.get('config/docs-backup', authHeaders());

    const filename = res.data?.filename;
    const sql = res.data?.sql;

    if (!filename || !sql) {
      throw new Error('Invalid backup response: missing filename or sql');
    }

    const blob = new Blob([sql], { type: 'application/sql;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    setMessage('Docs backup downloaded successfully.', 'success');
  } catch (error) {
    setMessage(error.response?.data?.error || error.message || 'Failed to download docs backup', 'error');
  } finally {
    backingUp.value = false;
  }
}

onMounted(loadStatus);
</script>
