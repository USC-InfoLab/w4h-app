<script setup>
import { ref, computed, onMounted } from 'vue';
import FeatureCard from '@/components/FeatureCard.vue';

import { getCards, getFeatureCards } from '@/utils/cards';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { canManageTeam, isSuperAdmin } from '@/utils/roles';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

/** Team operator home — Team admins only (Super admins use Platform Admin). */
const showTeamHome = computed(
  () => canManageTeam(user.value?.role, user.value?.caps) && !isSuperAdmin(user.value?.role)
);

const markdownCards = ref([]);
const staticCards = computed(() => getCards());

const snapshot = ref(null);
const loading = ref(false);
const loadError = ref('');

const kpiCards = computed(() => {
  const k = snapshot.value?.kpis || {};
  return [
    {
      label: 'Teams',
      value: k.teams ?? '—',
      hint: (snapshot.value?.teams || []).map((t) => t.name).join(', ') || 'you administer',
    },
    {
      label: 'Members',
      value: k.members ?? '—',
      hint: `${k.members_invited ?? 0} invited`,
    },
    { label: 'Projects', value: k.projects ?? '—', hint: 'active' },
    { label: 'Datasets', value: k.datasets ?? '—' },
    { label: 'Shares out', value: k.shares_out ?? '—', hint: 'your datasets' },
    { label: 'Shares in', value: k.shares_in ?? '—', hint: 'inbound' },
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

onMounted(async () => {
  document.title = `${APP_NAME} Home`;
  if (showTeamHome.value) {
    await loadTeamSnapshot();
  } else {
    markdownCards.value = await getFeatureCards();
  }
});
</script>

<template>
  <main class="container-fluid">
    <!-- Team admin operator home -->
    <template v-if="showTeamHome">
      <div v-if="loadError" class="alert alert-danger">{{ loadError }}</div>

      <template v-if="snapshot">
        <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
          <div>
            <h5 class="mb-0">Team overview</h5>
            <p class="text-muted small mb-0">
              Snapshot for teams you administer — scoped to your Team admin memberships.
            </p>
          </div>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary"
            :disabled="loading"
            @click="loadTeamSnapshot"
          >
            <span v-if="loading" class="spinner-border spinner-border-sm me-1" />
            Refresh
          </button>
        </div>

        <div v-if="snapshot.note" class="alert alert-warning py-2">{{ snapshot.note }}</div>

        <div class="row g-2 mb-3">
          <div v-for="kpi in kpiCards" :key="kpi.label" class="col-6 col-md-4 col-xl-2">
            <div class="card h-100">
              <div class="card-body py-3">
                <div class="text-muted small">{{ kpi.label }}</div>
                <div class="fs-4 fw-semibold">{{ kpi.value }}</div>
                <div v-if="kpi.hint" class="small text-muted text-truncate" :title="kpi.hint">
                  {{ kpi.hint }}
                </div>
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
                  <router-link :to="{ name: 'adminProjects' }" class="btn btn-sm btn-primary">
                    Projects
                  </router-link>
                  <router-link :to="{ name: 'users' }" class="btn btn-sm btn-outline-primary">
                    Users
                  </router-link>
                  <router-link :to="{ name: 'adminDatasets' }" class="btn btn-sm btn-outline-primary">
                    Datasets
                  </router-link>
                  <router-link :to="{ name: 'adminTeams' }" class="btn btn-sm btn-outline-primary">
                    Teams
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
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
              <h6 class="card-title mb-0">Recent projects</h6>
              <router-link :to="{ name: 'adminProjects' }" class="small">View all</router-link>
            </div>
            <div v-if="!snapshot.recent_projects?.length" class="text-muted small">
              No projects yet.
              <router-link :to="{ name: 'adminProjectsAdd' }">Create a project</router-link>
            </div>
            <ul v-else class="list-group list-group-flush">
              <li
                v-for="p in snapshot.recent_projects"
                :key="p.id"
                class="list-group-item px-0 d-flex justify-content-between align-items-center gap-2"
              >
                <div class="min-w-0">
                  <router-link
                    :to="{ name: 'adminProjectsEdit', params: { id: p.id } }"
                    class="fw-semibold text-decoration-none"
                  >
                    {{ p.name }}
                  </router-link>
                  <div class="small text-muted">{{ p.team_name || '—' }} · {{ p.status }}</div>
                </div>
                <router-link
                  :to="{ name: 'projectWorkspace', params: { id: p.id } }"
                  class="btn btn-sm btn-outline-secondary"
                >
                  Open
                </router-link>
              </li>
            </ul>
          </div>
        </div>
      </template>

      <div v-else-if="loading" class="text-center my-5">
        <div class="spinner-border text-primary" role="status" />
        <p class="mt-2 text-muted">Loading team overview…</p>
      </div>
    </template>

    <!-- Project users / Super admins: feature cards -->
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
