<template>
  <main class="d-flex flex-column main-content container-fluid">
    <WelcomeNextSteps
      v-if="showSetupGuide"
      title="Welcome — Super admin"
      subtitle="Bootstrap platform access only. Admins set up trials in the app shell."
      :cards="setupCards"
      dismissable
      @dismiss="dismissSetupGuide"
    />

    <div v-if="loadError" class="alert alert-danger">{{ loadError }}</div>

    <template v-if="snapshot">
      <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h5 class="mb-0">Platform overview</h5>
          <p class="text-muted small mb-0">
            Platform bootstrap and ops — trial setup is Team admin self-service in the app shell.
          </p>
        </div>
        <router-link
          :to="{ name: 'docs', params: { slug: 'whats-new' } }"
          class="btn btn-sm btn-outline-secondary flex-shrink-0"
        >
          <i class="bi bi-stars me-1"></i>What's New
        </router-link>
      </div>

      <!-- KPIs -->
      <div class="row g-2 mb-3">
        <div v-for="kpi in kpiCards" :key="kpi.label" class="col-6 col-md-4 col-xl-2">
          <div class="card h-100 kpi-card">
            <div class="card-body py-3">
              <div class="text-muted small">{{ kpi.label }}</div>
              <div class="fs-4 fw-semibold">{{ kpi.value }}</div>
              <div v-if="kpi.hint" class="small text-muted">{{ kpi.hint }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <!-- Health -->
        <div class="col-12 col-lg-4">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-title">Platform health</h6>
              <ul class="list-unstyled mb-0 small">
                <li v-for="item in healthItems" :key="item.label" class="d-flex align-items-start gap-2 mb-2">
                  <i :class="item.ok ? 'bi bi-check-circle-fill text-success' : 'bi bi-exclamation-triangle-fill text-warning'" />
                  <div>
                    <strong>{{ item.label }}</strong>
                    <div class="text-muted">{{ item.message }}</div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Usage -->
        <div class="col-12 col-lg-4">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-title">Usage</h6>
              <ul class="list-unstyled mb-2 small">
                <li class="mb-1">Events (24h): <strong>{{ snapshot.usage?.events_24h ?? 0 }}</strong></li>
                <li class="mb-1">Events (7d): <strong>{{ snapshot.usage?.events_7d ?? 0 }}</strong></li>
                <li class="mb-1">Active API keys: <strong>{{ snapshot.usage?.active_api_keys ?? 0 }}</strong></li>
              </ul>
              <p v-if="snapshot.usage?.note" class="small text-muted mb-2">{{ snapshot.usage.note }}</p>
              <router-link :to="{ name: 'adminUsage' }" class="btn btn-sm btn-outline-primary">
                Open Usage
              </router-link>
            </div>
          </div>
        </div>

        <!-- Attention -->
        <div class="col-12 col-lg-4">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-title">Needs attention</h6>
              <ul class="list-unstyled mb-0 small">
                <li v-for="item in attentionItems" :key="item.label" class="mb-2">
                  <div class="d-flex justify-content-between gap-2">
                    <span :class="item.raise ? 'fw-semibold' : ''">{{ item.label }}</span>
                    <span :class="item.raise ? 'badge text-bg-warning' : 'text-muted'">{{ item.value }}</span>
                  </div>
                  <div v-if="item.detail" class="text-muted">{{ item.detail }}</div>
                  <router-link v-if="item.to && item.linkLabel" :to="item.to" class="small">
                    {{ item.linkLabel }}
                  </router-link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick links -->
      <div class="card mb-3">
        <div class="card-body">
          <h6 class="card-title mb-3">Quick links</h6>
          <div class="d-flex flex-wrap gap-2">
            <router-link :to="{ name: 'adminAuditLog' }" class="btn btn-sm btn-primary">
              Audit log
            </router-link>
            <router-link :to="{ name: 'adminUsage' }" class="btn btn-sm btn-primary">
              Usage
            </router-link>
            <router-link :to="{ name: 'users' }" class="btn btn-sm btn-outline-primary">
              Users
            </router-link>
            <router-link :to="{ name: 'adminTeams' }" class="btn btn-sm btn-outline-primary">
              Teams
            </router-link>
            <router-link :to="{ name: 'adminSettings' }" class="btn btn-sm btn-outline-primary">
              Settings
            </router-link>
            <router-link
              :to="{ name: 'docs', params: { slug: snapshot.links?.hipaa_checklist_slug || 'hipaa-compliance' } }"
              class="btn btn-sm btn-outline-secondary"
            >
              HIPAA checklist
            </router-link>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status" />
      <p class="mt-2 text-muted">Loading platform overview…</p>
    </div>

    <div class="mt-auto text-center text-muted">
      <small>{{ buildInfo }}</small>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';

import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';
import { api, authHeaders } from '@/utils/api';
import { formatReleaseLabel, gitHash } from '@/utils/release';
import WelcomeNextSteps from '@/components/home/WelcomeNextSteps.vue';

const setupCards = [
  {
    title: '1. SMTP',
    text: 'Invitations and login codes need outbound mail.',
    to: { name: 'adminSettings' },
    label: 'Open Settings',
  },
  {
    title: '2. Approve PIs',
    text: 'PIs ask for access from the login screen. You approve who may join; they create and define their own teams.',
    to: { name: 'adminAccessRequests' },
    label: 'Open Access',
  },
  {
    title: '3. Checklist',
    text: 'Refresh Help, optional Claude key, HIPAA before real PHI.',
    to: { name: 'docs', params: { slug: 'welcome-super-admin' } },
    label: 'Open guide',
  },
];

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const showSetupGuide = ref(false);
const snapshot = ref(null);
const loading = ref(false);
const loadError = ref('');

const buildInfo = `${formatReleaseLabel()}${gitHash ? ` -- ${gitHash}` : ''}`;

const kpiCards = computed(() => {
  const k = snapshot.value?.kpis || {};
  return [
    { label: 'Teams', value: k.teams ?? '—', hint: 'active' },
    {
      label: 'Users',
      value: k.users_active ?? '—',
      hint: `${k.users_invited ?? 0} invited · ${k.users_discontinued ?? 0} discontinued`,
    },
    { label: 'Projects', value: k.projects ?? '—', hint: 'active' },
    { label: 'Datasets', value: k.datasets ?? '—' },
    { label: 'Shares', value: k.active_shares ?? '—', hint: 'cross-team' },
    {
      label: 'Private pages',
      value: k.private_pages ?? '—',
      hint: k.private_pages_ready === false ? 'legacy links · Doc-08 pending' : 'project-scoped',
    },
  ];
});

const healthItems = computed(() => {
  const h = snapshot.value?.health || {};
  return [
    { label: 'Database', ok: !!h.database?.ok, message: h.database?.message || '—' },
    { label: 'SMTP', ok: !!h.smtp?.ok, message: h.smtp?.message || '—' },
    { label: 'Audit log', ok: !!h.audit_log?.ok, message: h.audit_log?.message || '—' },
  ];
});

const attentionItems = computed(() => {
  const a = snapshot.value?.attention || {};
  return [
    {
      label: 'Access requests waiting',
      value: a.access_requests_pending ?? 0,
      raise: (a.access_requests_pending ?? 0) > 0,
      to: { name: 'adminAccessRequests' },
      linkLabel: 'Open Access',
    },
    {
      label: 'Invites pending',
      value: a.invites_pending ?? 0,
      raise: (a.invites_pending ?? 0) > 0,
      to: { name: 'adminAccessRequests' },
      linkLabel: 'Open Access',
    },
    {
      label: 'Datasets without team',
      value: a.datasets_without_team ?? 0,
      raise: (a.datasets_without_team ?? 0) > 0,
      to: { name: 'adminDatasets' },
      linkLabel: 'Open datasets',
    },
    {
      label: 'Teams without Team admin',
      value: a.teams_without_admin ?? 0,
      raise: (a.teams_without_admin ?? 0) > 0,
      to: { name: 'adminTeams' },
      linkLabel: 'Open teams',
    },
    {
      label: 'Projects without docs',
      value: a.projects_without_docs ?? 0,
      raise: (a.projects_without_docs ?? 0) > 0,
      to: { name: 'adminProjects' },
      linkLabel: 'Open projects',
    },
    {
      label: 'Failed logins (24h)',
      value: a.failed_logins_24h ?? 0,
      raise: (a.failed_logins_24h ?? 0) > 0,
      to: { name: 'adminAuditLog' },
      linkLabel: 'Open audit log',
    },
    {
      label: 'Break-glass events (30d)',
      value: a.break_glass_30d ?? 0,
      raise: (a.break_glass_30d ?? 0) > 0,
      to: { name: 'adminAuditLog' },
      linkLabel: 'Open audit log',
    },
    {
      label: 'Backup',
      value: a.backup?.status || 'unknown',
      raise: true,
      detail: a.backup?.message || '',
      linkLabel: 'HIPAA checklist',
      to: {
        name: 'docs',
        params: { slug: snapshot.value?.links?.hipaa_checklist_slug || 'hipaa-compliance' },
      },
    },
  ];
});

function dismissSetupGuide() {
  userStore.clearFirstTimeLogin();
  showSetupGuide.value = false;
}

async function loadSnapshot() {
  if (!isSuperAdmin(user.value?.role)) return;
  loading.value = true;
  loadError.value = '';
  try {
    const res = await api.get('config/admin-home', authHeaders());
    snapshot.value = res.data || null;
  } catch (error) {
    loadError.value =
      error.response?.data?.error || error.message || 'Failed to load platform overview.';
    snapshot.value = null;
  } finally {
    loading.value = false;
  }
}

async function maybeShowSetupGuide() {
  if (!isSuperAdmin(user.value?.role)) return;

  if (userStore.isSetupGuidePending() || user.value?.firstTimeLogin) {
    showSetupGuide.value = true;
    return;
  }

  if (localStorage.getItem('w4h.setupGuide') === 'dismissed') return;

  try {
    const res = await api.get('teams', authHeaders());
    const teams = Array.isArray(res.data) ? res.data : [];
    if (teams.length === 0) {
      userStore.markSetupGuidePending();
      showSetupGuide.value = true;
    }
  } catch {
    /* ignore */
  }
}

onMounted(async () => {
  await Promise.all([loadSnapshot(), maybeShowSetupGuide()]);
});
</script>

<style scoped>
.main-content {
  min-height: calc(100vh - var(--app-navbar-height, 44px));
}

.kpi-card {
  border-left: 3px solid var(--bs-primary);
}
</style>
