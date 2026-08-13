<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li v-if="isPlatformAdmin" class="breadcrumb-item">
          <router-link to="/admin/home">Admin</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Audit log</li>
      </ol>
    </nav>

    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div>
        <h5 class="mb-0">{{ isPlatformAdmin ? 'HIPAA audit log' : 'Project audit' }}</h5>
        <p class="text-muted small mb-0">
          <template v-if="isPlatformAdmin">
            Append-only ledger of authentication, ACL, and privileged actions (H-11 / ADR-011).
            Not the Usage dashboard.
          </template>
          <template v-else>
            Access events for
            <strong>{{ activeProjectName || 'the active project' }}</strong>,
            including project-admin access to this study’s data — not the platform-wide HIPAA ledger.
          </template>
        </p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="loading || exporting" @click="load">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1" />
          Refresh
        </button>
        <button type="button" class="btn btn-sm btn-outline-primary" :disabled="loading || exporting" @click="exportCsv">
          <span v-if="exporting" class="spinner-border spinner-border-sm me-1" />
          Export CSV
        </button>
        <router-link :to="{ name: 'docs', params: { slug: 'hipaa-compliance' } }" class="btn btn-sm btn-outline-secondary">
          HIPAA checklist
        </router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="card mb-3">
      <div class="card-body">
        <form class="row g-2 align-items-end" @submit.prevent="applyFilters">
          <div class="col-6 col-md-2">
            <label class="form-label small mb-0" for="audit-days">Period</label>
            <select id="audit-days" v-model.number="filters.days" class="form-select form-select-sm">
              <option :value="1">1 day</option>
              <option :value="7">7 days</option>
              <option :value="30">30 days</option>
              <option :value="90">90 days</option>
              <option :value="365">365 days</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small mb-0" for="audit-action">Action</label>
            <select id="audit-action" v-model="filters.action" class="form-select form-select-sm">
              <option value="">All actions</option>
              <option v-for="a in actionOptions" :key="a" :value="a">{{ a }}</option>
            </select>
          </div>
          <div class="col-6 col-md-2">
            <label class="form-label small mb-0" for="audit-rtype">Resource</label>
            <select id="audit-rtype" v-model="filters.resource_type" class="form-select form-select-sm">
              <option value="">All types</option>
              <option v-for="r in resourceTypeOptions" :key="r" :value="r">
                {{ r }}
              </option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small mb-0" for="audit-q">Search</label>
            <input
              id="audit-q"
              v-model.trim="filters.q"
              type="search"
              class="form-control form-control-sm"
              placeholder="email, action, resource id…"
            />
          </div>
          <div class="col-auto">
            <button type="submit" class="btn btn-sm btn-primary" :disabled="loading">Apply</button>
            <button type="button" class="btn btn-sm btn-link" :disabled="loading" @click="resetFilters">Reset</button>
          </div>
        </form>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-if="data">
      <p v-if="data.note" class="small text-muted mb-3">{{ data.note }}</p>

      <div class="row g-2 mb-3">
        <div v-for="kpi in summaryCards" :key="kpi.label" class="col-6 col-md-3">
          <div class="card h-100 kpi-card">
            <div class="card-body py-3">
              <div class="text-muted small">{{ kpi.label }}</div>
              <div class="fs-4 fw-semibold">{{ kpi.value }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-12 col-lg-7">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-title">Top actions</h6>
              <div v-if="!data.actions?.length" class="text-muted small">No events in this period.</div>
              <table v-else class="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th class="text-end">Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in data.actions.slice(0, 12)"
                    :key="row.action"
                    class="action-row"
                    @click="filterByAction(row.action)"
                  >
                    <td><code class="small">{{ row.action }}</code></td>
                    <td class="text-end">{{ row.count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-5">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-title">Resource types</h6>
              <div v-if="!data.resource_types?.length" class="text-muted small">No events in this period.</div>
              <table v-else class="table table-sm mb-0">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th class="text-end">Count</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in data.resource_types" :key="row.resource_type">
                    <td><code class="small">{{ row.resource_type }}</code></td>
                    <td class="text-end">{{ row.count }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <h6 class="card-title mb-0">Events</h6>
            <div class="small text-muted">
              {{ data.total }} total · page {{ data.page }} / {{ data.total_pages }}
            </div>
          </div>

          <div v-if="!data.rows?.length" class="text-muted small">
            No audit events match these filters.
          </div>
          <div v-else class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>IP</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in data.rows" :key="row.id">
                  <td class="small text-nowrap">{{ formatDateTime(row.timestamp) }}</td>
                  <td>
                    <div class="small fw-semibold">{{ row.user_name || '—' }}</div>
                    <div class="small text-muted">{{ row.user_email || (row.user_id ? `#${row.user_id}` : 'system') }}</div>
                    <div v-if="row.actor_role_label" class="small text-muted">{{ row.actor_role_label }}</div>
                  </td>
                  <td>
                    <code class="small">{{ row.action }}</code>
                    <span
                      v-if="isAttention(row.action)"
                      class="badge text-bg-warning ms-1"
                    >!</span>
                  </td>
                  <td class="small">
                    <div v-if="row.resource_type"><code>{{ row.resource_type }}</code></div>
                    <div v-if="row.resource_id" class="text-muted text-break">{{ row.resource_id }}</div>
                    <span v-if="!row.resource_type && !row.resource_id" class="text-muted">—</span>
                  </td>
                  <td class="small font-monospace">{{ row.ip_address || '—' }}</td>
                  <td class="small">
                    <button
                      v-if="row.details"
                      type="button"
                      class="btn btn-link btn-sm p-0"
                      @click="toggleDetails(row.id)"
                    >
                      {{ expandedId === row.id ? 'Hide' : 'Show' }}
                    </button>
                    <span v-else class="text-muted">—</span>
                    <pre v-if="expandedId === row.id" class="details-pre mt-1 mb-0">{{ formatDetails(row.details) }}</pre>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="d-flex justify-content-between align-items-center mt-3">
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="loading || page <= 1"
              @click="goPage(page - 1)"
            >
              Previous
            </button>
            <span class="small text-muted">Page {{ page }}</span>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              :disabled="loading || page >= (data.total_pages || 1)"
              @click="goPage(page + 1)"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status" />
      <p class="mt-2 text-muted">Loading audit log…</p>
    </div>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const isPlatformAdmin = computed(() => isSuperAdmin(user.value?.role));
const { activeProjectId, activeProjectName } = useTeamContext();

const loading = ref(false);
const exporting = ref(false);
const error = ref('');
const data = ref(null);
const page = ref(1);
const expandedId = ref(null);

const filters = reactive({
  days: 30,
  action: '',
  resource_type: '',
  q: '',
});

const actionOptions = computed(() => (data.value?.actions || []).map((a) => a.action));
const resourceTypeOptions = computed(() =>
  (data.value?.resource_types || [])
    .map((r) => r.resource_type)
    .filter((r) => r && r !== '(none)')
);

const summaryCards = computed(() => {
  const s = data.value?.summary || {};
  return [
    { label: 'Events (period)', value: s.total_period ?? data.value?.total ?? 0 },
    { label: 'Events (24h)', value: s.total_24h ?? 0 },
    { label: 'Distinct users', value: s.distinct_users ?? 0 },
    { label: 'Attention', value: s.attention_events ?? 0 },
  ];
});

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDetails(details) {
  if (!details) return '';
  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

function isAttention(action) {
  const a = String(action || '').toLowerCase();
  return a.includes('fail') || a.includes('break_glass');
}

function toggleDetails(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

function queryParams({ forExport = false } = {}) {
  const params = {
    days: filters.days,
    page: forExport ? 1 : page.value,
    limit: forExport ? 5000 : 50,
  };
  if (filters.action) params.action = filters.action;
  if (filters.resource_type) params.resource_type = filters.resource_type;
  if (filters.q) params.q = filters.q;
  if (!isPlatformAdmin.value && activeProjectId.value) {
    params.project_id = activeProjectId.value;
  }
  if (forExport) params.format = 'csv';
  return params;
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('config/audit-log', {
      ...authHeaders(),
      params: queryParams(),
    });
    data.value = res.data || null;
    if (data.value?.page) page.value = data.value.page;
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to load audit log.';
    data.value = null;
  } finally {
    loading.value = false;
  }
}

function applyFilters() {
  page.value = 1;
  load();
}

function resetFilters() {
  filters.days = 30;
  filters.action = '';
  filters.resource_type = '';
  filters.q = '';
  page.value = 1;
  load();
}

function filterByAction(action) {
  filters.action = action;
  page.value = 1;
  load();
}

function goPage(next) {
  page.value = next;
  load();
}

async function exportCsv() {
  exporting.value = true;
  error.value = '';
  try {
    const res = await api.get('config/audit-log', {
      ...authHeaders(),
      params: queryParams({ forExport: true }),
      responseType: 'blob',
    });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `w4h-audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Export failed.';
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  document.title = 'Audit log';
  load();
});
</script>

<style scoped>
.kpi-card {
  border-left: 3px solid var(--bs-primary);
}

.action-row {
  cursor: pointer;
}

.action-row:hover {
  background: rgba(127, 127, 127, 0.08);
}

.details-pre {
  max-width: 28rem;
  max-height: 12rem;
  overflow: auto;
  font-size: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
