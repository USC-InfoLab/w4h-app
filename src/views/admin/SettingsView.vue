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
              <button class="btn btn-outline-primary" :disabled="backingUpDocs" type="button" @click="backupDocs">
                <span v-if="backingUpDocs" class="spinner-border spinner-border-sm me-1" />
                Export docs (Markdown ZIP)
              </button>
            </div>
            <div v-if="message"
              :class="['alert alert-dismissible mt-3 mb-0', messageType === 'success' ? 'alert-success' : 'alert-danger']">
              {{ message }}
              <button type="button" class="btn-close" @click="message = ''"></button>
            </div>
          </form>
        </div>

        <div class="card p-3">
          <h5 class="card-title mb-3">Email (SMTP)</h5>

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
          </form>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="card p-3 h-100">
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

const message = ref('');
const messageType = ref('success');
const dbConfigured = ref(false);
const mailerConfigured = ref(false);
const savingDb = ref(false);
const testingDb = ref(false);
const backingUpDocs = ref(false);
const savingMailer = ref(false);
const testingMailer = ref(false);
const testRecipient = ref('');

const db = ref({ host: '', port: '5432', database: '', user: '', password: '' });
const mailer = ref({ host: '', port: '587', secure: false, user: '', password: '', from: '', replyTo: '' });

let messageTimer = null;

function setMessage(text, type = 'success') {
  message.value = text;
  messageType.value = type;
  clearTimeout(messageTimer);
  messageTimer = setTimeout(() => { message.value = ''; }, 4000);
}

async function loadSettings() {
  try {
    const [dbRes, mailRes] = await Promise.all([
      api.get('config/status', authHeaders()),
      api.get('config/mailer-settings', authHeaders())
    ]);

    dbConfigured.value = !!dbRes.data.configured;
    if (dbRes.data.details) {
      db.value.host = dbRes.data.details.host || '';
      db.value.port = String(dbRes.data.details.port || '5432');
      db.value.database = dbRes.data.details.database || '';
      db.value.user = dbRes.data.details.user || '';
    }

    const smtp = mailRes.data || {};
    mailer.value.host = smtp.host || '';
    mailer.value.port = smtp.port || '587';
    mailer.value.secure = !!smtp.secure;
    mailer.value.user = smtp.user || '';
    mailer.value.password = '';
    mailer.value.from = smtp.from || '';
    mailer.value.replyTo = smtp.replyTo || '';
    mailerConfigured.value = !!smtp.configured;
  } catch (error) {
    setMessage(error.response?.data?.error || 'Failed to load settings', 'error');
  }
}

async function saveDatabaseSettings() {
  if (!db.value.host || !db.value.port || !db.value.database || !db.value.user) {
    setMessage('Host, port, database, and user are required.', 'error');
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
    setMessage(res.data.message || 'Database settings saved.', 'success');
    db.value.password = '';
    await loadSettings();
  } catch (error) {
    setMessage(error.response?.data?.error || error.message || 'Failed to save database settings.', 'error');
  } finally {
    savingDb.value = false;
  }
}

async function testDatabase() {
  testingDb.value = true;
  try {
    const res = await api.get('config/test', authHeaders());
    setMessage(res.data.message || 'Database connection successful', 'success');
  } catch (error) {
    setMessage(error.response?.data?.error || error.message || 'Database connection failed', 'error');
  } finally {
    testingDb.value = false;
  }
}

async function backupDocs() {
  backingUpDocs.value = true;
  try {
    const res = await api.get('docs/export/markdown.zip', {
      ...authHeaders(),
      responseType: 'blob'
    });

    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: 'application/zip' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'w4h-docs-markdown.zip';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    setMessage('Markdown export downloaded successfully.', 'success');
  } catch (error) {
    let msg = error.response?.data?.error || error.message || 'Failed to export docs';
    if (error.response?.data instanceof Blob) {
      try {
        const text = await error.response.data.text();
        const parsed = JSON.parse(text);
        msg = parsed.error || msg;
      } catch {
        /* keep msg */
      }
    }
    setMessage(msg, 'error');
  } finally {
    backingUpDocs.value = false;
  }
}

async function saveMailerSettings() {
  if (!mailer.value.host || !mailer.value.port || !mailer.value.from) {
    setMessage('SMTP host, port, and from are required.', 'error');
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
    setMessage(res.data.message || 'SMTP settings saved.', 'success');
    mailer.value.password = '';
    await loadSettings();
  } catch (error) {
    setMessage(error.response?.data?.error || error.message || 'Failed to save SMTP settings.', 'error');
  } finally {
    savingMailer.value = false;
  }
}

async function sendTestEmail() {
  testingMailer.value = true;
  try {
    const res = await api.post('config/mailer-test', { to: testRecipient.value }, authHeaders());
    setMessage(res.data.message || 'Test email sent.', 'success');
  } catch (error) {
    setMessage(error.response?.data?.error || error.message || 'Failed to send test email.', 'error');
  } finally {
    testingMailer.value = false;
  }
}

onMounted(async () => {
  document.title = `${APP_NAME} Settings`;
  await loadSettings();
});
</script>
