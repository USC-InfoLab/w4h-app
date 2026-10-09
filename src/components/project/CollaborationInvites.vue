<script setup>
import { computed, onMounted, ref } from 'vue';
import { api, authHeaders } from '@/utils/api';

// ADR-027: the invited team's Admin accepts a collaboration and contributes datasets.
const rows = ref([]);
const catalog = ref([]);
const picks = ref({});
const busy = ref(false);
const message = ref('');
const error = ref('');

const pending = computed(() => rows.value.filter((r) => r.status === 'pending'));
const active = computed(() => rows.value.filter((r) => r.status === 'active'));

function datasetsFor(row) {
  return catalog.value.filter(
    (d) => String(d.team_id) === String(row.team_id) && (d.status || 'active') === 'active'
  );
}

function key(row) {
  return `${row.project_id}:${row.team_id}`;
}

async function load() {
  try {
    const res = await api.get('projects/collaboration-invites', authHeaders());
    rows.value = Array.isArray(res.data) ? res.data : [];
    if (active.value.length) {
      const cat = await api.get('datasets', { ...authHeaders(), params: { catalog: '1' } });
      catalog.value = Array.isArray(cat.data) ? cat.data : [];
    }
  } catch {
    rows.value = [];
  }
}

async function run(fn, okMessage) {
  busy.value = true;
  message.value = '';
  error.value = '';
  try {
    await fn();
    message.value = okMessage;
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || e.message || 'Request failed.';
  } finally {
    busy.value = false;
  }
}

const accept = (row) =>
  run(
    () => api.post(`projects/${row.project_id}/teams/${row.team_id}/accept`, {}, authHeaders()),
    `${row.team_name} joined ${row.project_name}.`
  );

const decline = (row) =>
  run(
    () => api.delete(`projects/${row.project_id}/teams/${row.team_id}`, authHeaders()),
    'Collaboration removed.'
  );

const contribute = (row) =>
  run(
    () =>
      api.post(
        `projects/${row.project_id}/datasets/${encodeURIComponent(picks.value[key(row)])}/link`,
        {},
        authHeaders()
      ),
    'Dataset contributed. You can remove it from the project at any time.'
  ).then(() => {
    picks.value[key(row)] = '';
  });

onMounted(load);
</script>

<template>
  <div v-if="rows.length" class="card p-3 mb-3">
    <h6 class="card-title">Collaborations with other teams</h6>
    <div v-if="message" class="alert alert-success py-1 small">{{ message }}</div>
    <div v-if="error" class="alert alert-danger py-1 small">{{ error }}</div>

    <div v-for="r in pending" :key="key(r)" class="d-flex align-items-center justify-content-between mb-2">
      <div class="small">
        <strong>{{ r.owning_team_name }}</strong> invited <strong>{{ r.team_name }}</strong> to
        <strong>{{ r.project_name }}</strong>. You will only see that project.
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-primary" :disabled="busy" @click="accept(r)">Accept</button>
        <button class="btn btn-sm btn-outline-danger" :disabled="busy" @click="decline(r)">Decline</button>
      </div>
    </div>

    <div v-for="r in active" :key="key(r)" class="border-top pt-2 mt-2">
      <div class="d-flex align-items-center justify-content-between">
        <div class="small">
          <strong>{{ r.team_name }}</strong> in <strong>{{ r.project_name }}</strong>
          <span class="text-muted">· owned by {{ r.owning_team_name }}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger" :disabled="busy" @click="decline(r)">Leave</button>
      </div>
      <div class="row g-2 align-items-end mt-1">
        <div class="col-9">
          <select v-model="picks[key(r)]" class="form-select form-select-sm">
            <option value="">Contribute one of your datasets…</option>
            <option v-for="d in datasetsFor(r)" :key="d.id" :value="d.id">{{ d.name || d.id }}</option>
          </select>
        </div>
        <div class="col-3">
          <button class="btn btn-sm btn-primary w-100" :disabled="busy || !picks[key(r)]" @click="contribute(r)">
            Contribute
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
