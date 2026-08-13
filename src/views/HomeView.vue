<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import FeatureCard from '@/components/FeatureCard.vue';

import { getCards, getFeatureCards } from '@/utils/cards';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';
import { useTeamContext } from '@/composables/useTeamContext';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const {
  activeTeamId,
  activeProjectId,
  activeProjectName,
  isActiveProjectAdmin,
  projects,
  loadProjects,
} = useTeamContext();

/** Operator home when you administer the active project. */
const showTeamHome = computed(
  () => isActiveProjectAdmin.value && !isSuperAdmin(user.value?.role)
);

/** Member home when you only participate in the active project. */
const showMemberHome = computed(
  () => !!activeProjectName.value && !isActiveProjectAdmin.value && !isSuperAdmin(user.value?.role)
);

const markdownCards = ref([]);
const staticCards = computed(() => getCards());

const snapshot = ref(null);
const loading = ref(false);
const loadError = ref('');

const activeTeamProjects = computed(() => {
  const pid = activeProjectId.value;
  const rows = Array.isArray(projects.value) ? projects.value : [];
  if (!pid) return rows;
  return rows.filter((p) => String(p.id) === String(pid) || String(p.slug) === String(pid));
});

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

const recentProjects = computed(() => {
  const all = snapshot.value?.recent_projects || [];
  const tid = activeTeamId.value;
  if (!tid) return all;
  return all.filter((p) => String(p.team_id) === String(tid));
});

const catalogRows = ref([]);
const catalogLoading = ref(false);
const catalogError = ref('');
const catalogFilter = ref('all');

const filteredCatalog = computed(() => {
  const rows = catalogRows.value;
  if (catalogFilter.value === 'all') return rows;
  if (catalogFilter.value === 'shared') {
    return rows.filter((d) => d.source_kind === 'shared');
  }
  if (catalogFilter.value === 'others') {
    return rows.filter((d) => d.source_kind === 'listed');
  }
  return rows.filter((d) => d.source_kind === 'local' || !d.source_kind);
});

function contactPeople(dataset) {
  const emails = String(dataset?.contact_emails || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  const names = String(dataset?.contact_names || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  return emails.map((email, i) => ({
    email,
    name: names[i] && names[i] !== email ? names[i] : '',
  }));
}

async function loadCatalog() {
  catalogLoading.value = true;
  catalogError.value = '';
  try {
    const res = await api.get('datasets', {
      ...authHeaders(),
      params: { catalog: 1 },
    });
    catalogRows.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    catalogError.value = error.response?.data?.error || error.message || 'Failed to load datasets.';
    catalogRows.value = [];
  } finally {
    catalogLoading.value = false;
  }
}

async function loadTeamSnapshot() {
  if (!showTeamHome.value) return;
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

async function refreshHome() {
  document.title = `${APP_NAME} Home`;
  if (showTeamHome.value) {
    await Promise.all([loadTeamSnapshot(), loadProjects(), loadCatalog()]);
    markdownCards.value = [];
  } else if (showMemberHome.value) {
    snapshot.value = null;
    await Promise.all([loadProjects(), loadCatalog()]);
    markdownCards.value = [];
  } else {
    snapshot.value = null;
    markdownCards.value = await getFeatureCards();
  }
}

watch([activeProjectId, isActiveProjectAdmin], () => {
  refreshHome();
});

onMounted(() => {
  refreshHome();
});
</script>

<template>
  <main class="container-fluid">
    <!-- Active lab · Team admin -->
    <template v-if="showTeamHome">
      <div v-if="loadError" class="alert alert-danger">{{ loadError }}</div>

      <template v-if="snapshot">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            <h5 class="mb-0">Project overview</h5>
            <p class="text-muted small mb-0">
              Snapshot for your current project. Switch with the menu next to W4H.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="loading"
            @click="loadTeamSnapshot"
          >
            <i v-if="!loading" class="bi bi-arrow-clockwise me-1" aria-hidden="true"></i>
            <span v-if="loading" class="spinner-border spinner-border-sm me-1" />
            Refresh
          </button>
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
          <div class="col-12 col-lg-4">
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

          <div class="col-12 col-lg-4">
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

          <div class="col-12 col-lg-4">
            <div class="card h-100">
              <div class="card-body">
                <h6 class="card-title">Quick links</h6>
                <div class="d-flex flex-wrap gap-2">
                  <router-link
                    v-if="activeProjectId"
                    :to="{ name: 'adminProjectsEdit', params: { id: activeProjectId } }"
                    class="btn btn-sm btn-primary"
                  >
                    Open project
                  </router-link>
                  <router-link
                    :to="{
                      name: 'docs',
                      params: { slug: snapshot.links?.hipaa_checklist_slug || 'hipaa-compliance' },
                    }"
                    class="btn btn-sm btn-outline-secondary"
                  >
                    HIPAA checklist
                  </router-link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card mb-3">
          <div class="card-body">
            <h6 class="card-title mb-0">Current project</h6>
            <p class="small text-muted mb-2">Members and datasets are managed on the Project page.</p>
            <router-link
              v-if="activeProjectId"
              :to="{ name: 'adminProjectsEdit', params: { id: activeProjectId } }"
              class="btn btn-sm btn-outline-primary"
            >
              Manage {{ activeProjectName || 'project' }}
            </router-link>
          </div>
        </div>
      </template>

      <div v-else-if="loading" class="text-center my-5">
        <div class="spinner-border text-primary" role="status" />
        <p class="mt-2 text-muted">Loading team overview…</p>
      </div>
    </template>

    <!-- Active lab · Member -->
    <template v-else-if="showMemberHome">
      <div class="mb-3">
        <h5 class="mb-0">Your work</h5>
        <p class="text-muted small mb-0">
          Snapshot for your current project. Switch with the menu next to W4H.
        </p>
      </div>

      <div class="card mb-3">
        <div class="card-body">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
            <h6 class="card-title mb-0">This project</h6>
            <router-link :to="{ name: 'adminProjectsEdit', params: { id: activeProjectId } }" class="small">
              Open project
            </router-link>
          </div>
          <div v-if="!activeTeamProjects.length" class="text-muted small">
            No projects assigned yet.
          </div>
          <ul v-else class="list-group list-group-flush">
            <li
              v-for="p in activeTeamProjects"
              :key="p.id"
              class="list-group-item px-0 d-flex justify-content-between align-items-center gap-2"
            >
              <div class="min-w-0">
                <div class="fw-semibold">{{ p.name }}</div>
                <div class="small text-muted">
                  {{ p.slug || p.id }}
                  <span v-if="p.my_role"> · {{ p.my_role }}</span>
                </div>
              </div>
              <router-link
                :to="{ name: 'adminProjectsEdit', params: { id: p.slug || p.id } }"
                class="btn btn-sm btn-primary"
              >
                Open
              </router-link>
            </li>
          </ul>
        </div>
      </div>
    </template>

    <div v-if="showTeamHome || showMemberHome" class="card mb-3">
      <div class="card-body">
        <div class="mb-2">
          <h6 class="card-title mb-1">Datasets</h6>
          <p class="small text-muted mb-2">
            What is available. Assign or create datasets on the Project page.
          </p>
          <div class="btn-group" role="group" aria-label="Dataset filter">
            <button
              type="button"
              class="btn btn-sm"
              :class="catalogFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'"
              @click="catalogFilter = 'all'"
            >
              All
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :class="catalogFilter === 'mine' ? 'btn-primary' : 'btn-outline-primary'"
              @click="catalogFilter = 'mine'"
            >
              Mine
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :class="catalogFilter === 'others' ? 'btn-primary' : 'btn-outline-primary'"
              @click="catalogFilter = 'others'"
            >
              Others
            </button>
            <button
              type="button"
              class="btn btn-sm"
              :class="catalogFilter === 'shared' ? 'btn-primary' : 'btn-outline-primary'"
              @click="catalogFilter = 'shared'"
            >
              Shared
            </button>
          </div>
          <p class="small text-muted mb-0 mt-2">
            <template v-if="catalogFilter === 'all'">Owned, discoverable from other teams, and inbound shares.</template>
            <template v-else-if="catalogFilter === 'mine'">Datasets your team owns.</template>
            <template v-else-if="catalogFilter === 'others'">
              Discoverable datasets from other teams (name and description only — ask them to share to use).
            </template>
            <template v-else>
              Datasets explicitly shared with your team (linkable from a project).
            </template>
          </p>
        </div>
        <div v-if="catalogLoading" class="text-muted small">Loading catalog…</div>
        <div v-else-if="catalogError" class="alert alert-danger py-2 small mb-0">{{ catalogError }}</div>
        <ul v-else-if="filteredCatalog.length" class="list-group list-group-flush">
          <li
            v-for="d in filteredCatalog"
            :key="d.id"
            class="list-group-item px-0 d-flex justify-content-between align-items-start gap-2"
          >
            <div class="min-w-0">
              <div class="fw-semibold">{{ d.name || d.id }}</div>
              <div class="small text-muted">
                <template v-if="d.team_name">{{ d.team_name }}</template>
                <template v-if="d.source_kind === 'shared' || d.source_kind === 'listed'">
                  <span v-if="d.team_name"> · </span>{{ d.source_label || d.source_kind }}
                </template>
                <template v-if="d.source_kind === 'local'">
                  <span v-if="d.team_name"> · </span>
                  <span>Projects: {{ d.project_names || 'None' }}</span>
                  <span> · </span>
                  <span>
                    {{ d.table_count ?? 0 }}
                    {{ Number(d.table_count) === 1 ? 'table' : 'tables' }}
                  </span>
                  <span v-if="d.discoverable === false"> · Hidden from other teams</span>
                </template>
              </div>
              <div
                v-if="d.source_kind === 'listed' && d.description"
                class="small text-muted mt-1 text-truncate"
              >
                {{ d.description }}
              </div>
              <div v-if="contactPeople(d).length" class="small mt-1">
                <span class="text-muted">Owner: </span>
                <template v-for="(p, i) in contactPeople(d)" :key="p.email">
                  <span v-if="i">, </span>
                  <a :href="`mailto:${p.email}?subject=${encodeURIComponent('Access request: ' + (d.name || d.id))}`">
                    {{ p.name ? `${p.name} (${p.email})` : p.email }}
                  </a>
                </template>
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="small text-muted mb-0">
          <template v-if="catalogFilter === 'all' || catalogFilter === 'mine'">No datasets yet.</template>
          <template v-else-if="catalogFilter === 'others'">No discoverable datasets from other teams.</template>
          <template v-else>No datasets shared with your team.</template>
        </p>
      </div>
    </div>

    <!-- Fallback (e.g. Super admin / no team): feature cards -->
    <template v-else>
      <div class="row my-2">
        <FeatureCard v-for="card in staticCards" :key="card.card_title" :card="card" />
      </div>

      <hr v-if="markdownCards.length" class="my-4" />

      <div class="row my-2">
        <FeatureCard v-for="card in markdownCards" :key="card.card_title" :card="card" />
      </div>
    </template>
  </main>
</template>
