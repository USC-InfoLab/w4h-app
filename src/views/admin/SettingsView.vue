<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/home">Admin</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Settings</li>
      </ol>
    </nav>

    <div class="row gy-3">
      <div class="col-12">
        <div class="card p-3">
          <h5 class="card-title mb-2">Settings</h5>
          <p class="text-muted mb-0">Manage infrastructure settings by section.</p>
        </div>
      </div>

      <div class="col-12 col-lg-8">
        <div class="card p-3 mb-3">
          <h5 class="card-title mb-3">Database</h5>

          <form @submit.prevent="saveDatabaseSettings">
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">Host</label>
                <input v-model="db.host" class="form-control" placeholder="localhost" />
              </div>
              <div class="col-md-4">
                <label class="form-label">Port</label>
                <input v-model="db.port" class="form-control" placeholder="5432" />
              </div>
              <div class="col-12">
                <label class="form-label">Database</label>
                <input v-model="db.database" class="form-control" placeholder="w4h-db" />
              </div>
              <div class="col-md-6">
                <label class="form-label">User</label>
                <input v-model="db.user" class="form-control" placeholder="postgres" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Password</label>
                <input v-model="db.password" type="password" class="form-control"
                  placeholder="Leave blank to keep current password" autocomplete="new-password" />
              </div>
            </div>
            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-primary" :disabled="savingDb" type="submit">Save Database</button>
              <button class="btn btn-outline-secondary" :disabled="testingDb" type="button" @click="testDatabase">Test
                Connection</button>
            </div>
            <div v-if="dbMessage"
              :class="['alert alert-dismissible mt-3 mb-0', dbMessageType === 'success' ? 'alert-success' : 'alert-danger']">
              {{ dbMessage }}
              <button type="button" class="btn-close" @click="dbMessage = ''"></button>
            </div>
          </form>
        </div>

        <div class="card p-3 mb-3">
          <h5 class="card-title mb-1">Documentation Management</h5>
          <p class="text-muted small mb-3">
            Export a backup of the documentation pages, or refresh from the source directory.<br>
            <span class="text-muted small">
              <strong>Warning:</strong> Refreshing docs will <u>overwrite</u> any pages with the same slug as the
              source. Local-only pages are not affected.
            </span>
          </p>
          <div class="gap-2 mt-2 d-flex">
            <button class="btn btn-primary me-2" :disabled="backingUpDocs" type="button" @click="backupDocs">
              <span v-if="backingUpDocs" class="spinner-border spinner-border-sm me-1" />
              Export Docs
            </button>
            <button class="btn btn-warning" :disabled="refreshingDocs" type="button" @click="refreshDocs">
              <span v-if="refreshingDocs" class="spinner-border spinner-border-sm me-1" />
              Refresh Docs
            </button>
          </div>
          <div v-if="docsMessage" class="mt-2 alert alert-dismissible"
            :class="docsMessageType === 'success' ? 'alert-success' : 'alert-danger'">
            {{ docsMessage }}
            <button type="button" class="btn-close" @click="docsMessage = ''"></button>
          </div>
        </div>

        <div class="card p-3">
          <h5 class="card-title mb-3">Mail Server</h5>
          <div class="mb-2 text-muted" style="font-size: 1rem;">
            Configure the SMTP server used to send emails from W4H. This is required for password resets, admin
            notifications, and user invitations.
            Use a service like Gmail, Outlook, or your organization's SMTP server. Credentials are stored securely and
            never shared.
          </div>
          <form @submit.prevent="saveMailerSettings">
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">SMTP Host</label>
                <input v-model="mailer.host" class="form-control" placeholder="smtp.example.com" />
              </div>
              <div class="col-md-4">
                <label class="form-label">Port</label>
                <input v-model="mailer.port" class="form-control" placeholder="587" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Username</label>
                <input v-model="mailer.user" class="form-control" autocomplete="username" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Password</label>
                <input v-model="mailer.password" type="password" class="form-control"
                  placeholder="Leave blank to keep current password" autocomplete="new-password" />
              </div>
              <div class="col-md-6">
                <label class="form-label">From</label>
                <input v-model="mailer.from" class="form-control" placeholder="W4H <noreply@example.com>" />
              </div>
              <div class="col-md-6">
                <label class="form-label">Reply-To (optional)</label>
                <input v-model="mailer.replyTo" class="form-control" placeholder="support@example.com" />
              </div>
              <div class="col-12">
                <div class="form-check">
                  <input id="smtpSecure" v-model="mailer.secure" type="checkbox" class="form-check-input" />
                  <label class="form-check-label" for="smtpSecure">Use SSL/TLS (SMTPS)</label>
                </div>
              </div>
            </div>

            <div class="d-flex gap-2 mt-3">
              <button class="btn btn-primary" :disabled="savingMailer" type="submit">Save SMTP</button>
              <button class="btn btn-outline-secondary" :disabled="testingMailer || !testRecipient" type="button"
                @click="sendTestEmail">Send Test Email</button>
            </div>

            <div class="row g-3 mt-1">
              <div class="col-md-8">
                <label class="form-label">Test Recipient</label>
                <input v-model="testRecipient" class="form-control" placeholder="you@example.com"
                  autocomplete="email" />
              </div>
            </div>

            <div v-if="mailerMessage"
              :class="['alert alert-dismissible mt-3 mb-0', mailerMessageType === 'success' ? 'alert-success' : 'alert-danger']">
              {{ mailerMessage }}
              <button type="button" class="btn-close" @click="mailerMessage = ''"></button>
            </div>
          </form>
        </div>
      </div>

      <div class="col-12 col-lg-4">

        <div class="card p-3 mb-3">
          <h5 class="card-title mb-1">Email</h5>
          <div class="row g-3 align-items-end mb-2">
            <div class="col-12">
              <label class="form-label">Help request email address</label>
              <input v-model="appSettings.helpEmail" class="form-control" type="email" placeholder="support@example.com"
                autocomplete="email" />
              <small class="text-muted">The email address users should be referred to if they encounter a
                problem.</small>
            </div>
            <div class="col-12 d-flex gap-2 mt-2">
              <button class="btn btn-primary" :disabled="savingAppSettings" @click="saveAppSettings">Save Email</button>
            </div>
          </div>
          <div v-if="appMessage"
            :class="['alert alert-dismissible mt-2 mb-0', appMessageType === 'success' ? 'alert-success' : 'alert-danger']">
            {{ appMessage }}
            <button type="button" class="btn-close" @click="appMessage = ''"></button>
          </div>
        </div>

        <div class="card p-3 mb-3">
          <h5 class="card-title mb-1">Usage tracking</h5>
          <div class="mb-1">
            <p class="fw-semibold mb-1">Send anonymous tracking data</p>
            <p class="text-muted small mb-2">Enable the collection of anonymous usage data to help improve W4H.</p>
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" id="usageTracking" v-model="appSettings.usageTracking"
                @change="saveAppSettings" />
              <label class="form-check-label" for="usageTracking">
                {{ appSettings.usageTracking ? 'Enabled' : 'Disabled' }}
              </label>
            </div>
          </div>
        </div>

        <div class="card p-3">
          <h6 class="mb-2">Status</h6>
          <div :class="['alert mb-2', dbConfigured ? 'alert-success' : 'alert-warning']">
            {{ dbConfigured ? 'Database is configured' : 'Database is not configured' }}
          </div>
          <div :class="['alert mb-0', mailerConfigured ? 'alert-success' : 'alert-warning']">
            {{ mailerConfigured ? 'SMTP is configured' : 'SMTP is not configured' }}
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

const dbConfigured = ref(false);
const mailerConfigured = ref(false);
const savingDb = ref(false);
const testingDb = ref(false);
const backingUpDocs = ref(false);
const refreshingDocs = ref(false);
const savingMailer = ref(false);
const testingMailer = ref(false);
const testRecipient = ref('');
const savingAppSettings = ref(false);

const db = ref({ host: '', port: '5432', database: '', user: '', password: '' });
const mailer = ref({ host: '', port: '587', secure: false, user: '', password: '', from: '', replyTo: '' });
const appSettings = ref({ helpEmail: '', usageTracking: false });

// Per-card message state
const dbMessage = ref('');
const dbMessageType = ref('success');
const docsMessage = ref('');
const docsMessageType = ref('success');
const mailerMessage = ref('');
const mailerMessageType = ref('success');
const appMessage = ref('');
const appMessageType = ref('success');

const timers = {};

function setMessage(msgRef, typeRef, text, type = 'success', key = 'default') {
  msgRef.value = text;
  typeRef.value = type;
  clearTimeout(timers[key]);
  timers[key] = setTimeout(() => { msgRef.value = ''; }, 4000);
}

async function loadSettings() {
  try {
    const dbRes = await api.get('config/status', authHeaders());
    dbConfigured.value = !!dbRes.data.configured;
    if (dbRes.data.details) {
      db.value.host = dbRes.data.details.host || '';
      db.value.port = String(dbRes.data.details.port || '5432');
      db.value.database = dbRes.data.details.database || '';
      db.value.user = dbRes.data.details.user || '';
    }
  } catch { /* ignore */ }

  try {
    const mailRes = await api.get('config/mailer-settings', authHeaders());
    const smtp = mailRes.data || {};
    mailer.value.host = smtp.host || '';
    mailer.value.port = smtp.port || '587';
    mailer.value.secure = !!smtp.secure;
    mailer.value.user = smtp.user || '';
    mailer.value.password = '';
    mailer.value.from = smtp.from || '';
    mailer.value.replyTo = smtp.replyTo || '';
    mailerConfigured.value = !!smtp.configured;
  } catch { /* ignore */ }

  try {
    const appRes = await api.get('config/app-settings', authHeaders());
    const app = appRes.data || {};
    appSettings.value.helpEmail = app.helpEmail || '';
    appSettings.value.usageTracking = !!app.usageTracking;
  } catch { /* ignore */ }
}

async function saveDatabaseSettings() {
  if (!db.value.host || !db.value.port || !db.value.database || !db.value.user) {
    setMessage(dbMessage, dbMessageType, 'Host, port, database, and user are required.', 'error', 'db');
    return;
  }

  savingDb.value = true;
  try {
    const payload = {
      host: db.value.host,
      port: db.value.port,
      database: db.value.database,
      user: db.value.user,
      ...(db.value.password ? { password: db.value.password } : {})
    };

    const res = await api.post('config/database', payload, authHeaders());
    setMessage(dbMessage, dbMessageType, res.data.message || 'Database settings saved.', 'success', 'db');
    db.value.password = '';
    await loadSettings();
  } catch (error) {
    setMessage(dbMessage, dbMessageType, error.response?.data?.error || error.message || 'Failed to save database settings.', 'error', 'db');
  } finally {
    savingDb.value = false;
  }
}

async function testDatabase() {
  testingDb.value = true;
  try {
    const res = await api.get('config/test', authHeaders());
    setMessage(dbMessage, dbMessageType, res.data.message || 'Database connection successful', 'success', 'db');
  } catch (error) {
    setMessage(dbMessage, dbMessageType, error.response?.data?.error || error.message || 'Database connection failed', 'error', 'db');
  } finally {
    testingDb.value = false;
  }
}

async function backupDocs() {
  backingUpDocs.value = true;
  try {
    const res = await api.get('docs/export', { ...authHeaders(), responseType: 'blob' });
    const disposition = res.headers['content-disposition'] || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : 'w4h-docs-bundle.zip';
    const blob = new Blob([res.data], { type: 'application/zip' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setMessage(docsMessage, docsMessageType, 'Docs archive ready, download and save the zip.', 'success', 'docs');
  } catch (error) {
    setMessage(docsMessage, docsMessageType, error.response?.data?.error || error.message || 'Failed to export docs', 'error', 'docs');
  } finally {
    backingUpDocs.value = false;
  }
}

async function refreshDocs() {
  refreshingDocs.value = true;
  docsMessage.value = '';
  try {
    const res = await api.post('docs/refresh', {}, authHeaders());
    if (res.data.success) {
      setMessage(docsMessage, docsMessageType, `Docs refreshed (${res.data.count} pages imported)`, 'success', 'docs');
    } else {
      setMessage(docsMessage, docsMessageType, res.data.reason || 'Refresh returned no results', 'error', 'docs');
    }
  } catch (e) {
    setMessage(docsMessage, docsMessageType, e.response?.data?.error || e.response?.data?.reason || 'Failed to refresh docs', 'error', 'docs');
  } finally {
    refreshingDocs.value = false;
  }
}

async function saveMailerSettings() {
  if (!mailer.value.host || !mailer.value.port || !mailer.value.from) {
    setMessage(mailerMessage, mailerMessageType, 'SMTP host, port, and from are required.', 'error', 'mailer');
    return;
  }

  savingMailer.value = true;
  try {
    const payload = {
      host: mailer.value.host,
      port: mailer.value.port,
      secure: mailer.value.secure,
      user: mailer.value.user,
      from: mailer.value.from,
      replyTo: mailer.value.replyTo,
      ...(mailer.value.password ? { password: mailer.value.password } : {})
    };

    const res = await api.post('config/mailer-settings', payload, authHeaders());
    setMessage(mailerMessage, mailerMessageType, res.data.message || 'SMTP settings saved.', 'success', 'mailer');
    mailer.value.password = '';
    await loadSettings();
  } catch (error) {
    setMessage(mailerMessage, mailerMessageType, error.response?.data?.error || error.message || 'Failed to save SMTP settings.', 'error', 'mailer');
  } finally {
    savingMailer.value = false;
  }
}

async function sendTestEmail() {
  testingMailer.value = true;
  try {
    const res = await api.post('config/mailer-test', { to: testRecipient.value }, authHeaders());
    setMessage(mailerMessage, mailerMessageType, res.data.message || 'Test email sent.', 'success', 'mailer');
  } catch (error) {
    setMessage(mailerMessage, mailerMessageType, error.response?.data?.error || error.message || 'Failed to send test email.', 'error', 'mailer');
  } finally {
    testingMailer.value = false;
  }
}

async function saveAppSettings() {
  savingAppSettings.value = true;
  try {
    const res = await api.post('config/app-settings', {
      helpEmail: appSettings.value.helpEmail,
      usageTracking: appSettings.value.usageTracking,
    }, authHeaders());
    setMessage(appMessage, appMessageType, res.data.message || 'App settings saved.', 'success', 'app');
  } catch (error) {
    setMessage(appMessage, appMessageType, error.response?.data?.error || error.message || 'Failed to save app settings.', 'error', 'app');
  } finally {
    savingAppSettings.value = false;
  }
}

onMounted(async () => {
  document.title = `${APP_NAME} Settings`;
  await loadSettings();
});
</script>