<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/home">Admin</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Usage</li>
      </ol>
    </nav>

    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div>
        <h5 class="mb-0">Usage</h5>
        <p class="text-muted small mb-0">
          Platform adoption and SC-CTSI study metrics (D-19*) — not the HIPAA audit ledger.
        </p>
      </div>
      <div class="d-flex flex-wrap align-items-center gap-2">
        <label class="small text-muted mb-0" for="usage-days">Period</label>
        <select id="usage-days" v-model.number="days" class="form-select form-select-sm" style="width: auto;" @change="load">
          <option :value="7">7 days</option>
          <option :value="14">14 days</option>
          <option :value="30">30 days</option>
          <option :value="90">90 days</option>
        </select>
        <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="loading" @click="load">
          <span v-if="loading" class="spinner-border spinner-border-sm me-1" />
          Refresh
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <template v-if="data">
      <p v-if="data.note" class="small text-muted mb-3">{{ data.note }}</p>

      <!-- Adoption -->
      <section class="mb-4">
        <h6 class="section-title">Adoption</h6>
        <p class="small text-muted mb-2">
          UI sessions (logins, page views) and API-key usage. Full detail lives here — admin home stays a thin snapshot.
        </p>
        <div class="row g-2 mb-3">
          <div v-for="kpi in adoptionCards" :key="kpi.label" class="col-6 col-md-4 col-xl-3">
            <div class="card h-100 kpi-card">
              <div class="card-body py-3">
                <div class="text-muted small">{{ kpi.label }}</div>
                <div class="fs-4 fw-semibold">{{ kpi.value }}</div>
                <div v-if="kpi.hint" class="small text-muted">{{ kpi.hint }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="row g-3">
          <div class="col-12 col-lg-7">
            <div class="card h-100">
              <div class="card-body">
                <h6 class="card-title">Requests per day</h6>
                <div v-if="!data.daily?.length" class="text-muted small">No usage events yet.</div>
                <div v-else class="daily-chart">
                  <div
                    v-for="d in data.daily"
                    :key="d.day"
                    class="daily-bar-wrap"
                    :title="`${d.day}: ${d.count}`"
                  >
                    <div class="daily-bar" :style="{ height: barHeight(d.count) }" />
                    <div class="daily-label">{{ shortDay(d.day) }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="col-12 col-lg-5">
            <div class="card h-100">
              <div class="card-body">
                <h6 class="card-title">By role (period)</h6>
                <div v-if="!data.by_role?.length" class="text-muted small">No events in this period.</div>
                <table v-else class="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th class="text-end">Events</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in data.by_role" :key="row.role">
                      <td><span class="badge text-bg-secondary">{{ row.role }}</span></td>
                      <td class="text-end">{{ row.count }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- System performance -->
      <section class="mb-4">
        <h6 class="section-title">System performance</h6>
        <p class="small text-muted mb-2">Latency and reliability from logged API-key requests.</p>
        <div class="row g-2 mb-3">
          <div v-for="kpi in performanceCards" :key="kpi.label" class="col-6 col-md-4 col-xl">
            <div class="card h-100 kpi-card kpi-card-perf">
              <div class="card-body py-3">
                <div class="text-muted small">{{ kpi.label }}</div>
                <div class="fs-4 fw-semibold">{{ kpi.value }}</div>
                <div v-if="kpi.hint" class="small text-muted">{{ kpi.hint }}</div>
              </div>
            </div>
          </div>
        </div>
        <div class="row g-3">
          <div class="col-12 col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <h6 class="card-title">By event type</h6>
                <div v-if="!data.by_event_type?.length" class="text-muted small">No events in this period.</div>
                <table v-else class="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th class="text-end">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in data.by_event_type" :key="row.event_type">
                      <td><code class="small">{{ row.event_type }}</code></td>
                      <td class="text-end">{{ row.count }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="col-12 col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <h6 class="card-title">Response status (period)</h6>
                <ul class="list-unstyled small mb-0">
                  <li class="mb-1">2xx / 3xx: <strong>{{ data.summary?.success_count ?? 0 }}</strong></li>
                  <li class="mb-1">4xx: <strong>{{ data.summary?.error_4xx ?? 0 }}</strong></li>
                  <li class="mb-1">5xx: <strong>{{ data.summary?.error_5xx ?? 0 }}</strong></li>
                  <li class="text-muted">Unknown status: {{ data.summary?.status_unknown ?? 0 }}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Workflow -->
      <section class="mb-4">
        <h6 class="section-title">Workflow outcomes</h6>
        <p class="small text-muted mb-2">Ingest and query completion when richer event types are logged (D-19b).</p>
        <div class="card">
          <div class="card-body">
            <p class="small text-muted mb-2">{{ data.workflow?.note }}</p>
            <div v-if="data.workflow?.event_types_present?.length" class="small">
              Present types:
              <code
                v-for="t in data.workflow.event_types_present"
                :key="t"
                class="me-1"
              >{{ t }}</code>
            </div>
            <div v-else class="text-muted small">No workflow events yet — currently logging <code>api.request</code> only.</div>
          </div>
        </div>
      </section>

      <!-- Knowledge transfer -->
      <section class="mb-4">
        <h6 class="section-title">Knowledge transfer</h6>
        <p class="small text-muted mb-2">Onboarding proxies until invite → first successful task milestones (D-19c).</p>
        <div class="row g-2 mb-2">
          <div v-for="kpi in knowledgeCards" :key="kpi.label" class="col-6 col-md-3">
            <div class="card h-100 kpi-card kpi-card-kt">
              <div class="card-body py-3">
                <div class="text-muted small">{{ kpi.label }}</div>
                <div class="fs-4 fw-semibold">{{ kpi.value }}</div>
                <div v-if="kpi.hint" class="small text-muted">{{ kpi.hint }}</div>
              </div>
            </div>
          </div>
        </div>
        <p v-if="data.knowledge_transfer?.note" class="small text-muted mb-0">{{ data.knowledge_transfer.note }}</p>
      </section>

      <!-- Usability -->
      <section class="mb-4">
        <h6 class="section-title">Usability</h6>
        <p class="small text-muted mb-2">Survey aggregates for SC-CTSI reporting (D-19d).</p>
        <div class="card">
          <div class="card-body">
            <div class="row g-2">
              <div class="col-6 col-md-3">
                <div class="text-muted small">Survey responses</div>
                <div class="fs-5 fw-semibold">{{ data.usability?.responses ?? 0 }}</div>
              </div>
              <div class="col-6 col-md-3">
                <div class="text-muted small">Usability / SUS</div>
                <div class="fs-5 fw-semibold">{{ data.usability?.usability_responses ?? 0 }}</div>
              </div>
              <div class="col-12 col-md-6">
                <div class="text-muted small">Last response</div>
                <div class="fw-semibold">{{ formatDateTime(data.usability?.last_response_at) }}</div>
              </div>
            </div>
            <p v-if="data.usability?.note" class="small text-muted mb-0 mt-2">{{ data.usability.note }}</p>
          </div>
        </div>
      </section>

      <!-- Top users -->
      <div class="card mb-3">
        <div class="card-body">
          <h6 class="card-title">Top users (period)</h6>
          <div v-if="!data.top_users?.length" class="text-muted small">No user activity in this period.</div>
          <div v-else class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th class="text-end">Events</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="u in data.top_users" :key="u.user_id">
                  <td>
                    <div class="fw-semibold">{{ u.name || '—' }}</div>
                    <div class="small text-muted">{{ u.email }}</div>
                  </td>
                  <td><span class="badge text-bg-secondary">{{ u.role }}</span></td>
                  <td class="text-end">{{ u.event_count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- API keys -->
      <div class="card mb-3">
        <div class="card-body">
          <h6 class="card-title">API keys</h6>
          <p class="small text-muted">Prefix only — plaintext keys are never stored or shown.</p>
          <div v-if="!data.api_keys?.length" class="text-muted small">No API keys issued yet.</div>
          <div v-else class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Teams</th>
                  <th>Prefix</th>
                  <th>Created</th>
                  <th>Last used</th>
                  <th class="text-end">Events</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="k in data.api_keys" :key="k.user_id">
                  <td>
                    <div class="fw-semibold">{{ k.name || '—' }}</div>
                    <div class="small text-muted">{{ k.email }}</div>
                  </td>
                  <td class="small">{{ k.teams || '—' }}</td>
                  <td><code class="small">{{ k.api_key_prefix || '—' }}…</code></td>
                  <td class="small">{{ formatDate(k.api_key_created_at) }}</td>
                  <td class="small">{{ formatDate(k.api_key_last_used_at) }}</td>
                  <td class="text-end">{{ k.events_period }}</td>
                  <td>
                    <span
                      class="badge"
                      :class="k.active && k.status === 'active' ? 'text-bg-success' : 'text-bg-secondary'"
                    >
                      {{ keyStatus(k) }}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Recent events -->
      <div class="card mb-3">
        <div class="card-body">
          <h6 class="card-title">Recent requests</h6>
          <div v-if="!data.recent_events?.length" class="text-muted small">
            No requests logged yet. Events appear when clients call the API with a personal API key.
          </div>
          <div v-else class="table-responsive">
            <table class="table table-sm align-middle mb-0">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Path</th>
                  <th class="text-end">Status</th>
                  <th class="text-end">ms</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="e in data.recent_events" :key="e.id">
                  <td class="small text-nowrap">{{ formatDateTime(e.timestamp) }}</td>
                  <td>
                    <div class="small">{{ e.user_name || e.user_email || '—' }}</div>
                    <code v-if="e.api_key_prefix" class="small text-muted">{{ e.api_key_prefix }}…</code>
                  </td>
                  <td><code class="small">{{ e.event_type }}</code></td>
                  <td class="small font-monospace">
                    <span v-if="metaMethod(e)">{{ metaMethod(e) }}</span>
                    {{ metaPath(e) }}
                  </td>
                  <td class="text-end">
                    <span
                      class="badge"
                      :class="statusClass(metaStatus(e))"
                    >{{ metaStatus(e) ?? '—' }}</span>
                  </td>
                  <td class="text-end small">{{ e.duration_ms ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status" />
      <p class="mt-2 text-muted">Loading usage…</p>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { api, authHeaders } from '@/utils/api';

const days = ref(14);
const loading = ref(false);
const error = ref('');
const data = ref(null);

const adoptionCards = computed(() => {
  const s = data.value?.summary || {};
  const period = data.value?.period_days ?? days.value;
  return [
    { label: 'Events (24h)', value: s.events_24h ?? 0 },
    { label: `Events (${period}d)`, value: s.events_period ?? 0 },
    {
      label: `Unique users (${period}d)`,
      value: s.unique_users_period ?? 0,
      hint: 'any usage event',
    },
    {
      label: `Unique UI users (${period}d)`,
      value: s.unique_users_ui ?? 0,
      hint: 'login / session / page view',
    },
    {
      label: `Unique API users (${period}d)`,
      value: s.unique_users_api ?? 0,
      hint: 'api.request only',
    },
    { label: `Logins (${period}d)`, value: s.logins_period ?? 0 },
    { label: `Page views (${period}d)`, value: s.page_views_period ?? 0 },
    { label: `Sessions (${period}d)`, value: s.sessions_period ?? 0 },
    { label: 'Active keys', value: s.active_keys ?? 0 },
    { label: 'Keys used (7d)', value: s.keys_used_7d ?? 0 },
    { label: 'Never used', value: s.keys_never_used ?? 0, hint: 'active keys with no last-used' },
  ];
});

const performanceCards = computed(() => {
  const s = data.value?.summary || {};
  return [
    { label: 'p50 latency', value: `${s.duration_p50_ms ?? 0} ms` },
    { label: 'p95 latency', value: `${s.duration_p95_ms ?? 0} ms` },
    { label: 'Avg duration', value: `${s.avg_duration_ms ?? 0} ms` },
    { label: 'Error rate', value: `${s.error_rate_pct ?? 0}%`, hint: '4xx + 5xx / all' },
  ];
});

const knowledgeCards = computed(() => {
  const k = data.value?.knowledge_transfer || {};
  return [
    { label: 'Invites pending', value: k.invites_pending ?? 0 },
    { label: 'Users with key', value: k.users_with_key ?? 0 },
    { label: 'Keys used', value: k.users_key_used ?? 0 },
    {
      label: 'Median key → first use',
      value: formatHours(k.median_hours_key_to_first_use),
      hint: 'hours',
    },
  ];
});

function formatHours(h) {
  const n = Number(h);
  if (!n || Number.isNaN(n)) return '—';
  if (n < 1) return `${Math.round(n * 60)} min`;
  if (n < 48) return `${n} h`;
  return `${Math.round(n / 24)} d`;
}

function barHeight(count) {
  const max = data.value?.daily_max || 0;
  if (!max || !count) return '4px';
  const pct = Math.max(8, Math.round((count / max) * 100));
  return `${pct}%`;
}

function shortDay(day) {
  const d = new Date(`${day}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(day).slice(5);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function keyStatus(k) {
  if (k.status === 'discontinued') return 'discontinued';
  if (k.status === 'invited') return 'invited';
  if (!k.active) return 'revoked';
  return 'active';
}

function metaOf(e) {
  const m = e?.metadata;
  if (!m) return {};
  if (typeof m === 'object') return m;
  try {
    return JSON.parse(m);
  } catch {
    return {};
  }
}

function metaPath(e) {
  return metaOf(e).path || '—';
}

function metaMethod(e) {
  return metaOf(e).method || '';
}

function metaStatus(e) {
  return metaOf(e).status;
}

function statusClass(status) {
  const n = Number(status);
  if (n >= 200 && n < 300) return 'text-bg-success';
  if (n >= 400) return 'text-bg-danger';
  if (n >= 300) return 'text-bg-warning';
  return 'text-bg-secondary';
}

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get('config/usage', {
      ...authHeaders(),
      params: { days: days.value, limit: 100 },
    });
    data.value = res.data || null;
  } catch (err) {
    error.value = err.response?.data?.error || err.message || 'Failed to load usage.';
    data.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  document.title = 'Usage';
  load();
});
</script>

<style scoped>
.section-title {
  margin-bottom: 0.15rem;
  font-weight: 600;
}

.kpi-card {
  border-left: 3px solid var(--bs-primary);
}

.kpi-card-perf {
  border-left-color: var(--w4h-gold, #ffcc00);
}

.kpi-card-kt {
  border-left-color: var(--bs-secondary);
}

.daily-chart {
  display: flex;
  align-items: flex-end;
  gap: 0.35rem;
  height: 160px;
  padding-top: 0.5rem;
}

.daily-bar-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
  min-width: 0;
}

.daily-bar {
  width: 100%;
  max-width: 28px;
  background: var(--bs-primary);
  border-radius: 3px 3px 0 0;
  min-height: 4px;
  opacity: 0.85;
}

.daily-label {
  font-size: 0.65rem;
  color: var(--bs-secondary-color);
  margin-top: 0.35rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
  max-width: 100%;
}
</style>
