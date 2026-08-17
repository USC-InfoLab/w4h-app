<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';
import DatasetCatalogCard from '@/components/home/DatasetCatalogCard.vue';
import WelcomeNextSteps from '@/components/home/WelcomeNextSteps.vue';
import {
  adminNextStepCards,
  dismissAdminNextSteps,
  isAdminNextStepsDismissed,
} from '@/components/home/nextStepCards';

const props = defineProps({
  activeProjectId: { type: [String, Number], default: '' },
});

const snapshot = ref(null);
const loading = ref(false);
const loadError = ref('');
const catalogRef = ref(null);
const showAdminNextSteps = ref(!isAdminNextStepsDismissed());

function hideAdminNextSteps() {
  dismissAdminNextSteps();
  showAdminNextSteps.value = false;
}

const kpiCards = computed(() => {
  const k = snapshot.value?.kpis || {};
  return [
    { label: 'Members', value: k.members ?? '—', icon: 'bi bi-people' },
    { label: 'Projects', value: k.projects ?? '—', icon: 'bi bi-folder' },
    { label: 'Datasets', value: k.datasets ?? '—', icon: 'bi bi-database' },
    { label: 'Shares out', value: k.shares_out ?? '—', icon: 'bi bi-box-arrow-up' },
    { label: 'Shares in', value: k.shares_in ?? '—', icon: 'bi bi-box-arrow-in-down' },
  ];
});

const attentionItems = computed(() => {
  const a = snapshot.value?.attention || {};
  return [
    {
      label: 'Invites pending',
      value: a.invites_pending ?? 0,
      raise: (a.invites_pending ?? 0) > 0,
      to: { name: 'users' },
      linkLabel: 'Review users',
    },
    {
      label: 'Projects without docs',
      value: a.projects_without_docs ?? 0,
      raise: (a.projects_without_docs ?? 0) > 0,
      to: { name: 'adminProjects' },
      linkLabel: 'Open projects',
    },
  ];
});

async function loadTeamSnapshot() {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await api.get('config/team-home', authHeaders());
    snapshot.value = res.data || null;
  } catch (error) {
    loadError.value =
      error.response?.data?.error || error.message || 'Failed to load team overview.';
    snapshot.value = null;
  } finally {
    loading.value = false;
  }
}

async function refresh() {
  await Promise.all([loadTeamSnapshot(), catalogRef.value?.reload?.()]);
}

watch(
  () => props.activeProjectId,
  () => {
    refresh();
  }
);

onMounted(refresh);
</script>

<template>
  <div>
    <WelcomeNextSteps
      v-if="showAdminNextSteps"
      title="Welcome — Admin"
      subtitle="Set up your trial in the app shell. Super admin does not create projects for you."
      :cards="adminNextStepCards"
      dismissable
      @dismiss="hideAdminNextSteps"
    />
    <div v-if="loadError" class="alert alert-danger">{{ loadError }}</div>

    <template v-if="snapshot">
      <div class="mb-3">
        <h5 class="mb-0">Project overview</h5>
        <p class="text-muted small mb-0">
          Snapshot for your current project. Use
          <strong>Project</strong> in the nav to manage members and dataset declarations.
          Ingest tables from Contributions. If the chat icon is in the nav, use it when chat is configured.
        </p>
      </div>

      <div v-if="snapshot.note" class="alert alert-warning py-2">{{ snapshot.note }}</div>

      <div class="row g-2 mb-3">
        <div v-for="kpi in kpiCards" :key="kpi.label" class="col-6 col-md-4 col-xl-2">
          <div class="card h-100">
            <div class="card-body py-3 d-flex justify-content-between align-items-start gap-2">
              <div>
                <div class="text-muted small">{{ kpi.label }}</div>
                <div class="fs-4 fw-semibold">{{ kpi.value }}</div>
              </div>
              <i :class="kpi.icon" class="text-muted fs-5" aria-hidden="true"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-3 mb-3">
        <div class="col-12 col-lg-6">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-title">Needs attention</h6>
              <ul class="list-unstyled mb-0 small">
                <li v-for="item in attentionItems" :key="item.label" class="mb-2">
                  <div class="d-flex justify-content-between gap-2">
                    <span :class="item.raise ? 'fw-semibold' : ''">{{ item.label }}</span>
                    <span :class="item.raise ? 'badge text-bg-warning' : 'text-muted'">
                      {{ item.value }}
                    </span>
                  </div>
                  <router-link v-if="item.to && item.linkLabel" :to="item.to" class="small">
                    {{ item.linkLabel }}
                  </router-link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div class="col-12 col-lg-6">
          <div class="card h-100">
            <div class="card-body">
              <h6 class="card-title">IRB reports</h6>
              <p class="small text-muted mb-2">
                {{ snapshot.irb?.message || 'Generate IRB access reports for your team.' }}
              </p>
              <button type="button" class="btn btn-sm btn-outline-secondary" disabled>
                Coming soon
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <div v-else-if="loading" class="text-center my-5">
      <div class="spinner-border text-primary" role="status" />
      <p class="mt-2 text-muted">Loading team overview…</p>
    </div>

    <DatasetCatalogCard ref="catalogRef" :show-owned-filter="true" />
  </div>
</template>
