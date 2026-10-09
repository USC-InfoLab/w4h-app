<template>
  <main role="main" class="container-fluid">
    <div class="row align-items-center mb-3">
      <div class="col">
        <h5 class="mb-0"><i class="bi bi-person-plus me-1"></i> Access requests</h5>
        <p class="small text-muted mb-0 mt-1">
          USC researchers who confirmed their email. <strong>Approve</strong> sends them an Admin invitation —
          that is all you do. They create and define their own teams after signing in. Decide on who they are,
          not on the trial.
        </p>
      </div>
    </div>

    <ul class="nav nav-pills mb-3">
      <li v-for="t in tabs" :key="t.value" class="nav-item">
        <button type="button" class="nav-link py-1" :class="{ active: status === t.value }" @click="setStatus(t.value)">
          {{ t.label }}
        </button>
      </li>
    </ul>

    <div v-if="message" class="alert py-2 small" :class="messageIsError ? 'alert-danger' : 'alert-success'">
      {{ message }}
      <code v-if="inviteUrl" class="d-block user-select-all mt-1">{{ inviteUrl }}</code>
    </div>

    <div v-if="loading" class="text-center mt-5"><div class="spinner-border text-primary" role="status"></div></div>
    <p v-else-if="!rows.length" class="text-muted">No {{ status === 'all' ? '' : status }} requests.</p>

    <div v-for="r in rows" :key="r.id" class="card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between flex-wrap gap-2">
          <div>
            <div class="fw-semibold">{{ r.name }} <span class="text-muted fw-normal">· {{ r.email }}</span></div>
            <div class="small text-muted">{{ formatDate(r.created_at) }} · {{ r.affiliation }}</div>
          </div>
          <span class="badge align-self-start" :class="badgeClass(r.status)">{{ r.status }}</span>
        </div>
        <p class="mt-2 mb-2" style="white-space: pre-wrap;">{{ r.purpose }}</p>

        <div v-if="r.status !== 'pending'" class="small text-muted">
          <span v-if="r.status === 'fulfilled'">Approved </span>
          {{ formatDate(r.handled_at) }}<span v-if="r.handled_by_name"> by {{ r.handled_by_name }}</span>
          <span v-if="r.note"> · {{ r.note }}</span>
        </div>

        <div v-if="r.status === 'pending'">
          <div v-if="open[r.id]?.mode === 'decline'" class="row g-2 align-items-end">
            <div class="col-md-7">
              <label class="form-label small mb-0">Note (optional)</label>
              <input v-model.trim="open[r.id].note" class="form-control form-control-sm" maxlength="500" />
            </div>
            <div class="col-md-5 d-flex gap-2 align-items-center">
              <div class="form-check mb-0">
                <input :id="`n-${r.id}`" v-model="open[r.id].notify" type="checkbox" class="form-check-input" />
                <label :for="`n-${r.id}`" class="form-check-label small">Email them</label>
              </div>
              <button class="btn btn-sm btn-danger" :disabled="busy" @click="decline(r)">Decline</button>
              <button class="btn btn-sm btn-link" @click="close(r)">Cancel</button>
            </div>
          </div>
          <div v-else class="d-flex gap-2">
            <button class="btn btn-sm btn-primary" :disabled="busy" @click="fulfill(r)">Approve</button>
            <button class="btn btn-sm btn-outline-danger" @click="openDecline(r)">Decline…</button>
            <button class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="spam(r)">Mark spam</button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api, authHeaders } from '@/utils/api';

const tabs = [
  { value: 'pending', label: 'Pending' },
  { value: 'fulfilled', label: 'Fulfilled' },
  { value: 'declined', label: 'Declined' },
  { value: 'spam', label: 'Spam' },
  { value: 'all', label: 'All' },
];
const status = ref('pending');
const rows = ref([]);
const loading = ref(true);
const busy = ref(false);
const message = ref('');
const messageIsError = ref(false);
const inviteUrl = ref('');
const open = reactive({});

function formatDate(v) {
  return v ? new Date(v).toLocaleString() : '';
}
function badgeClass(s) {
  return { pending: 'text-bg-warning', fulfilled: 'text-bg-success', declined: 'text-bg-secondary', spam: 'text-bg-dark' }[s] || 'text-bg-light';
}

async function load() {
  loading.value = true;
  try {
    const res = await api.get('access-requests', { ...authHeaders(), params: { status: status.value } });
    rows.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    rows.value = [];
    flash(false, e.response?.data?.error || 'Failed to load requests.');
  } finally {
    loading.value = false;
  }
}

function flash(ok, text, url = '') {
  messageIsError.value = !ok;
  message.value = text;
  inviteUrl.value = url;
}

function setStatus(value) {
  status.value = value;
  message.value = '';
  load();
}

const openDecline = (r) => { open[r.id] = { mode: 'decline', note: '', notify: false }; };
const close = (r) => { delete open[r.id]; };

async function act(r, path, body, okText) {
  busy.value = true;
  try {
    const res = await api.post(`access-requests/${r.id}/${path}`, body, authHeaders());
    delete open[r.id];
    flash(true, okText(res.data), res.data?.inviteUrl || '');
    if (res.data?.mailWarning) flash(true, `${okText(res.data)} ${res.data.mailWarning}`, res.data.inviteUrl || '');
    await load();
  } catch (e) {
    flash(false, e.response?.data?.error || 'Request failed.');
  } finally {
    busy.value = false;
  }
}

const fulfill = (r) =>
  act(r, 'fulfill', {}, (d) =>
    d.invited
      ? `Approved. Admin invitation sent to ${r.email}.`
      : `Approved. ${r.email} already has an account and can now create a team.`);
const decline = (r) =>
  act(r, 'decline', { note: open[r.id]?.note, notify: !!open[r.id]?.notify }, () => 'Request declined.');
const spam = (r) => act(r, 'spam', {}, () => 'Marked as spam.');

onMounted(load);
</script>
