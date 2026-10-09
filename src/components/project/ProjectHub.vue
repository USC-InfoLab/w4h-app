<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { projectMemberUiValue } from '@/utils/roles';
import ProjectDocsCard from '@/components/project/ProjectDocsCard.vue';
import ProjectDatasetMasterDetail from '@/components/project/ProjectDatasetMasterDetail.vue';
import ProjectAnalyticsPanel from '@/components/project/ProjectAnalyticsPanel.vue';
import ProjectReportsPanel from '@/components/project/ProjectReportsPanel.vue';
import TeamAiSettings from '@/components/TeamAiSettings.vue';

const props = defineProps({
  canManage: { type: Boolean, default: false },
  // false for a team member who is not on this project: overview only (MVP P-06, R-11)
  isParticipant: { type: Boolean, default: true },
  form: { type: Object, required: true },
  teamLabel: { type: String, default: '' },
  createdByLabel: { type: String, default: '' },
  createdAtLabel: { type: String, default: '' },
  memberRows: { type: Array, default: () => [] },
  collaboratingTeams: { type: Array, default: () => [] },
  invitableTeams: { type: Array, default: () => [] },
  linkedDatasetRows: { type: Array, default: () => [] },
  addableDatasets: { type: Array, default: () => [] },
  datasetToAdd: { type: String, default: '' },
  newDatasetName: { type: String, default: '' },
  savingProject: { type: Boolean, default: false },
  savingMembers: { type: Boolean, default: false },
  savingDatasets: { type: Boolean, default: false },
  currentUserId: { type: [String, Number], default: null },
  pages: { type: Array, default: () => [] },
  canEditPages: { type: Boolean, default: false },
  isDemonstration: { type: Boolean, default: false },
  inviteEmail: { type: String, default: '' },
  inviteName: { type: String, default: '' },
  inviteRole: { type: String, default: 'editor' },
  inviteUrl: { type: String, default: '' },
  jupyterUrl: { type: String, default: '' },
});

const emit = defineEmits([
  'save-project',
  'invite-member',
  'change-member-role',
  'delete-member',
  'invite-team',
  'remove-team',
  'update:datasetToAdd',
  'update:newDatasetName',
  'update:inviteEmail',
  'update:inviteName',
  'update:inviteRole',
  'dataset-pick',
  'create-dataset',
  'unlink-dataset',
  'replace-linked-datasets',
  'dataset-run-complete',
]);

const route = useRoute();
const router = useRouter();
const selectedDatasetId = ref('');
const teamToInvite = ref('');

const VALID_TABS = ['overview', 'docs', 'analytics', 'jupyter', 'people', 'settings'];

function tabFromQuery() {
  const t = String(route.query.tab || '');
  if (t === 'settings' && !props.canManage) return 'overview';
  if (!props.isParticipant && !['overview', 'people'].includes(t)) return 'overview';
  if (VALID_TABS.includes(t)) return t;
  return 'overview';
}

const section = ref(tabFromQuery());

watch(
  () => route.query.tab,
  (tab) => {
    if (!tab) return;
    const next = tabFromQuery();
    if (next !== section.value) section.value = next;
  }
);

function setSection(id) {
  section.value = id;
  const current = String(route.query.tab || '');
  const nextTab = id === 'overview' ? '' : id;
  if (current === nextTab) return;
  const query = { ...route.query };
  if (nextTab) query.tab = nextTab;
  else delete query.tab;
  router.replace({ query });
}

function goDatasetsTab() {
  setSection('overview');
}

const navItems = computed(() => {
  const items = props.isParticipant
    ? [
        { id: 'overview', label: 'Datasets', icon: 'bi bi-database' },
        { id: 'docs', label: 'Documentation', icon: 'bi bi-file-earmark-text' },
        { id: 'analytics', label: 'Analytics', icon: 'bi bi-graph-up' },
        { id: 'jupyter', label: 'Jupyter', icon: 'bi bi-journal-code' },
        { id: 'people', label: 'People', icon: 'bi bi-people' },
      ]
    // Not on the project: the overview and the roster only; data, pages and reports stay closed.
    : [
        { id: 'overview', label: 'Datasets', icon: 'bi bi-database' },
        { id: 'people', label: 'People', icon: 'bi bi-people' },
      ];
  if (props.canManage) {
    items.push({ id: 'settings', label: 'Settings', icon: 'bi bi-gear' });
  }
  return items;
});

function memberDisplayName(row) {
  const name = String(row?.name || '').trim();
  const email = String(row?.email || '').trim();
  if (name && (!email || name.toLowerCase() !== email.toLowerCase())) return name;
  return email || name || 'Unknown';
}

const projectAdminCount = computed(
  () => props.memberRows.filter((m) => projectMemberUiValue(m.role) === 'owner').length
);

function isSelfMember(row) {
  return row?.user_id != null && String(row.user_id) === String(props.currentUserId);
}

function isLastProjectAdmin(row) {
  return projectMemberUiValue(row?.role) === 'owner' && projectAdminCount.value <= 1;
}

function canRemoveMember(row) {
  if (isSelfMember(row)) return false;
  if (isLastProjectAdmin(row)) return false;
  return true;
}

const canInvite = computed(() => {
  const email = String(props.inviteEmail || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
});
</script>

<template>
  <div class="project-hub">
    <div v-if="isDemonstration" class="alert alert-info py-2 small">
      <strong>Demonstration project.</strong>
      Sample datasets here are seeded by Super admin and are <strong>read-only</strong>.
      Do not re-ingest them. Use them to walk through analysis.
    </div>

    <div class="row g-3">
      <div class="col-12 col-lg-3 col-xl-2">
        <nav class="list-group">
          <button
            v-for="item in navItems"
            :key="item.id"
            type="button"
            class="list-group-item list-group-item-action d-flex align-items-center gap-2"
            :class="{ active: section === item.id }"
            @click="setSection(item.id)"
          >
            <i :class="item.icon" aria-hidden="true"></i>
            {{ item.label }}
          </button>
        </nav>
      </div>

      <div class="col-12 col-lg-9 col-xl-10">
        <div v-if="!isParticipant" class="alert alert-info small" role="status">
          You can see this project because you are on its team, but you are not a member of it.
          Ask a project Admin to add you to open its analytics, documentation and reports.
        </div>
        <section v-if="section === 'overview'">
          <ProjectDatasetMasterDetail
            :datasets="linkedDatasetRows"
            :can-manage="canManage"
            :addable-datasets="addableDatasets"
            :dataset-to-add="datasetToAdd"
            :new-dataset-name="newDatasetName"
            :saving-datasets="savingDatasets"
            :has-team="!!form.team_id"
            :project-id="form.id ? String(form.id) : ''"
            @unlink-dataset="emit('unlink-dataset', $event)"
            @replace-linked-datasets="emit('replace-linked-datasets', $event)"
            @update:dataset-to-add="emit('update:datasetToAdd', $event)"
            @update:new-dataset-name="emit('update:newDatasetName', $event)"
            @dataset-pick="emit('dataset-pick', $event)"
            @create-dataset="emit('create-dataset')"
            @dataset-run-complete="emit('dataset-run-complete')"
          />
        </section>

        <section v-else-if="section === 'docs'">
          <ProjectDocsCard
            v-if="form.id"
            workspace
            :project-id="String(form.id)"
            :can-edit="canEditPages"
            :initial-pages="pages"
          />
        </section>

        <section v-else-if="section === 'analytics'">
          <ProjectAnalyticsPanel
            :datasets="linkedDatasetRows"
            v-model:selected-dataset-id="selectedDatasetId"
            :can-manage="canManage"
            :project-id="form.id ? String(form.id) : ''"
            :jupyter-url="jupyterUrl"
            @run-complete="emit('dataset-run-complete')"
            @go-datasets="goDatasetsTab"
          />
          <ProjectReportsPanel
            class="mt-3"
            :project-id="form.id ? String(form.id) : ''"
            :datasets="linkedDatasetRows"
            :can-manage="canManage"
            :current-user-id="currentUserId"
          />
        </section>

        <section v-else-if="section === 'jupyter'">
          <div class="card p-3">
            <h5 class="card-title mb-2">Managed JupyterLab</h5>
            <template v-if="jupyterUrl">
              <p class="small text-muted mb-3">
                Optional hosted notebook environment for this deployment.
              </p>
              <a class="btn btn-primary" :href="jupyterUrl" target="_blank" rel="noopener noreferrer">
                Open JupyterLab
                <i class="bi bi-box-arrow-up-right ms-1" aria-hidden="true"></i>
              </a>
            </template>
            <template v-else>
              <p class="small text-muted mb-0">
                Hosted JupyterLab is not enabled. Use Contributions notebooks or your own environment
                with a personal API key.
              </p>
            </template>
          </div>
        </section>

        <section v-else-if="section === 'people'">
          <div class="card p-3">
            <h5 class="card-title mb-3">People</h5>
            <template v-if="canManage">
              <p class="small text-muted mb-3">
                Invite anyone by email. If they are already on this project, nothing changes.
                New accounts join this project’s team and receive an activation link.
                To add someone from another organization, invite their team under
                <strong>Collaborating teams</strong> below first.
              </p>
              <div class="row g-2 align-items-end mb-3">
                <div class="col-md-4">
                  <label class="form-label small mb-0">Email</label>
                  <input
                    type="email"
                    class="form-control form-control-sm"
                    :value="inviteEmail"
                    placeholder="name@example.org"
                    @input="emit('update:inviteEmail', $event.target.value)"
                  />
                </div>
                <div class="col-md-3">
                  <label class="form-label small mb-0">Name (optional)</label>
                  <input
                    type="text"
                    class="form-control form-control-sm"
                    :value="inviteName"
                    @input="emit('update:inviteName', $event.target.value)"
                  />
                </div>
                <div class="col-md-3">
                  <label class="form-label small mb-0">Role</label>
                  <select
                    class="form-select form-select-sm"
                    :value="inviteRole"
                    @change="emit('update:inviteRole', $event.target.value)"
                  >
                    <option value="owner">Admin</option>
                    <option value="editor">User</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <button
                    type="button"
                    class="btn btn-sm btn-primary w-100"
                    :disabled="savingMembers || !canInvite"
                    @click="emit('invite-member')"
                  >
                    Invite
                  </button>
                </div>
              </div>
              <div v-if="inviteUrl" class="alert alert-warning py-2 small">
                Invitation link (share if email did not send):
                <code class="d-block user-select-all mt-1">{{ inviteUrl }}</code>
              </div>
            </template>
            <p v-else class="small text-muted mb-3">
              Contact an Admin to change who is on the project.
            </p>

            <div v-if="memberRows.length === 0" class="small text-muted">No members yet.</div>
            <div
              v-for="row in memberRows"
              :key="row.user_id"
              class="row g-2 align-items-end mb-2"
            >
              <div class="col-7">
                <div class="fw-semibold">
                  {{ memberDisplayName(row) }}
                  <span
                    v-for="t in row.home_teams || []"
                    :key="t.id"
                    class="badge ms-1"
                    :class="row.is_collaborator ? 'text-bg-info' : 'text-bg-light border'"
                  >{{ t.name }}</span>
                </div>
                <div class="small text-muted">{{ row.email }}</div>
              </div>
              <div class="col-3">
                <select
                  v-if="canManage"
                  class="form-select form-select-sm"
                  :value="projectMemberUiValue(row.role)"
                  :disabled="savingMembers || isLastProjectAdmin(row)"
                  @change="emit('change-member-role', row, $event.target.value)"
                >
                  <option value="owner" :disabled="row.is_collaborator">Admin</option>
                  <option value="editor">User</option>
                </select>
                <span v-else class="badge text-bg-secondary">
                  {{ projectMemberUiValue(row.role) === 'owner' ? 'Admin' : 'User' }}
                </span>
              </div>
              <div v-if="canManage" class="col-2">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger w-100"
                  :disabled="savingMembers || !canRemoveMember(row)"
                  @click="emit('delete-member', row)"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
          <div v-if="collaboratingTeams.length || canManage" class="card p-3 mt-3">
            <h5 class="card-title mb-2">Collaborating teams</h5>
            <p class="small text-muted mb-3">
              Teams from other organizations can contribute people and their own datasets to this
              project. They see only this project. Each team keeps control of the datasets it
              contributes, and removing a team removes its people and datasets immediately.
            </p>
            <div v-if="collaboratingTeams.length === 0" class="small text-muted mb-2">
              No collaborating teams.
            </div>
            <div
              v-for="t in collaboratingTeams"
              :key="t.team_id"
              class="d-flex align-items-center justify-content-between mb-2"
            >
              <div>
                <span class="fw-semibold">{{ t.team_name }}</span>
                <span
                  class="badge ms-2"
                  :class="t.status === 'active' ? 'text-bg-success' : 'text-bg-warning'"
                >{{ t.status === 'active' ? 'Active' : 'Waiting for their Admin' }}</span>
              </div>
              <button
                v-if="canManage"
                type="button"
                class="btn btn-sm btn-outline-danger"
                :disabled="savingMembers"
                @click="emit('remove-team', t)"
              >
                Remove
              </button>
            </div>
            <div v-if="canManage" class="row g-2 align-items-end border-top pt-3 mt-2">
              <div class="col-9">
                <label class="form-label small mb-0">Invite a team</label>
                <select v-model="teamToInvite" class="form-select form-select-sm">
                  <option value="">Select team…</option>
                  <option v-for="t in invitableTeams" :key="t.id" :value="t.id">{{ t.name }}</option>
                </select>
              </div>
              <div class="col-3">
                <button
                  type="button"
                  class="btn btn-sm btn-primary w-100"
                  :disabled="savingMembers || !teamToInvite"
                  @click="emit('invite-team', teamToInvite); teamToInvite = ''"
                >
                  Invite
                </button>
              </div>
            </div>
          </div>
          <TeamAiSettings
            v-if="canManage && form.team_id"
            class="mt-3"
            mode="usage"
            :team-id="String(form.team_id)"
            :can-edit="canManage"
            @go-config="setSection('settings')"
          />
        </section>

        <section v-else-if="section === 'settings' && canManage">
          <div class="card p-3">
            <h5 class="card-title mb-3">Project settings</h5>
            <div class="mb-3">
              <label class="form-label">Name</label>
              <input v-model.trim="form.name" class="form-control" />
            </div>
            <div class="mb-3">
              <label class="form-label">Description</label>
              <textarea v-model.trim="form.description" class="form-control" rows="3" />
            </div>
            <div class="mb-3">
              <label class="form-label">Status</label>
              <select v-model="form.status" class="form-select" style="max-width: 16rem;">
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div class="small text-muted mb-3">
              Team: {{ teamLabel }}
              <span v-if="createdByLabel"> · Created by {{ createdByLabel }}</span>
              <span v-if="createdAtLabel"> · {{ createdAtLabel }}</span>
            </div>
            <button
              class="btn btn-primary"
              :disabled="savingProject || !form.name"
              @click="emit('save-project')"
            >
              Save project
            </button>
          </div>
          <TeamAiSettings
            v-if="form.team_id"
            class="mt-3"
            mode="config"
            :team-id="String(form.team_id)"
            :can-edit="canManage"
            @go-usage="setSection('people')"
          />
        </section>
      </div>
    </div>
  </div>
</template>
