<script setup>
import { computed } from 'vue';
import { projectMemberUiValue } from '@/utils/roles';
import ApiCredentialCard from '@/components/ApiCredentialCard.vue';
import ProjectDocsCard from '@/components/project/ProjectDocsCard.vue';
import ProjectDatasetMasterDetail from '@/components/project/ProjectDatasetMasterDetail.vue';

const props = defineProps({
  projectId: { type: String, default: '' },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  status: { type: String, default: 'active' },
  teamLabel: { type: String, default: '' },
  createdByLabel: { type: String, default: '' },
  createdAtLabel: { type: String, default: '' },
  members: { type: Array, default: () => [] },
  datasets: { type: Array, default: () => [] },
  pages: { type: Array, default: () => [] },
  canEditPages: { type: Boolean, default: false },
});

const jupyterEnabled = computed(() => {
  const url = String(import.meta.env.VITE_JUPYTER_URL || '').trim();
  return Boolean(url);
});

const jupyterUrl = computed(() => String(import.meta.env.VITE_JUPYTER_URL || '').trim());

function memberDisplayName(row) {
  const name = String(row?.name || '').trim();
  const email = String(row?.email || '').trim();
  if (name && (!email || name.toLowerCase() !== email.toLowerCase())) return name;
  return email || name || 'Unknown';
}

const sortedMembers = computed(() =>
  [...props.members].sort((a, b) => {
    const ao = projectMemberUiValue(a.role) === 'owner' ? 0 : 1;
    const bo = projectMemberUiValue(b.role) === 'owner' ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return memberDisplayName(a).localeCompare(memberDisplayName(b));
  })
);

const admins = computed(() =>
  sortedMembers.value.filter((m) => projectMemberUiValue(m.role) === 'owner')
);
</script>

<template>
  <div>
    <!-- 1. Project identity -->
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div class="min-w-0">
        <h4 class="mb-1">{{ name || 'Project' }}</h4>
        <p v-if="description" class="text-muted mb-2">{{ description }}</p>
        <p v-else class="text-muted small mb-2">No description.</p>
        <div class="d-flex flex-wrap align-items-center gap-3 small">
          <span>
            <span class="text-muted">Status</span>
            <span class="badge text-bg-success ms-1">{{ status }}</span>
          </span>
          <span v-if="teamLabel">
            <span class="text-muted">Team</span>
            <span class="ms-1">{{ teamLabel }}</span>
          </span>
          <span v-if="createdByLabel">
            <span class="text-muted">Created by</span>
            <span class="ms-1">
              {{ createdByLabel }}
              <template v-if="createdAtLabel"> · {{ createdAtLabel }}</template>
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- 2. Dataset master-detail -->
    <div class="mb-3">
      <ProjectDatasetMasterDetail :datasets="datasets" />
    </div>

    <!-- 3. Project docs | Analysis access | Managed JupyterLab -->
    <div class="row g-3 mb-3">
      <div class="col-12 col-lg-4">
        <ProjectDocsCard
          v-if="projectId"
          :project-id="projectId"
          :can-edit="canEditPages"
          :initial-pages="pages"
          landing
        />
      </div>

      <div class="col-12 col-lg-4">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-2">Analysis access</h5>
          <p class="small text-muted mb-3">
            Use local Jupyter, R/RStudio, VS Code, institutional compute, or your own hardware.
            Clients talk to the HTTPS API — not database ports.
          </p>

          <ApiCredentialCard />

          <div class="mt-auto pt-2">
            <router-link
              :to="{ name: 'docs', params: { slug: 'quick-start' } }"
              class="small text-decoration-none"
            >
              Setup instructions &amp; code examples →
            </router-link>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-2">Managed JupyterLab</h5>
          <template v-if="jupyterEnabled">
            <p class="small text-muted mb-3">
              Optional hosted notebook environment for this deployment. Not required to use the API.
            </p>
            <a
              class="btn btn-primary"
              :href="jupyterUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open JupyterLab
              <i class="bi bi-box-arrow-up-right ms-1" aria-hidden="true"></i>
            </a>
          </template>
          <template v-else>
            <p class="small text-muted mb-3">
              Hosted JupyterLab is not enabled for this deployment. Use the Analysis access card
              and setup instructions to connect from your own environment.
            </p>
            <button type="button" class="btn btn-outline-secondary" disabled>
              JupyterLab unavailable
            </button>
            <div class="mt-auto pt-3">
              <router-link
                :to="{ name: 'docs', params: { slug: 'quick-start' } }"
                class="small text-decoration-none"
              >
                External analysis setup →
              </router-link>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 4. People -->
    <div class="card p-3">
      <h5 class="card-title mb-2">People</h5>
      <p class="small text-muted mb-3">
        Contact an <strong>Admin</strong> to ingest tables or change who is on the project.
        You can run analytics on datasets that already have tables.
      </p>

      <div v-if="admins.length === 0" class="small text-muted">No admins listed yet.</div>
      <div v-else>
        <div class="small text-muted text-uppercase mb-2">Admins</div>
        <ul class="list-unstyled mb-0">
          <li
            v-for="row in admins"
            :key="row.user_id"
            class="d-flex justify-content-between align-items-start gap-2 py-2 border-bottom"
          >
            <div class="min-w-0">
              <div class="fw-semibold">{{ memberDisplayName(row) }}</div>
              <a v-if="row.email" class="small" :href="`mailto:${row.email}`">{{ row.email }}</a>
            </div>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
