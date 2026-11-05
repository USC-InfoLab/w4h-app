<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Offcanvas, Modal } from 'bootstrap';
import { projectMemberUiValue } from '@/utils/roles';
import ProjectDocsCard from '@/components/project/ProjectDocsCard.vue';
import ProjectHomePanel from '@/components/project/ProjectHomePanel.vue';
import ProjectDatasetMasterDetail from '@/components/project/ProjectDatasetMasterDetail.vue';
import ProjectAnalyticsPanel from '@/components/project/ProjectAnalyticsPanel.vue';
import ProjectReportsPanel from '@/components/project/ProjectReportsPanel.vue';
import TeamAiSettings from '@/components/TeamAiSettings.vue';
import OwningTeamPanel from '@/components/project/OwningTeamPanel.vue';

const props = defineProps({
  canManage: { type: Boolean, default: false },
  // false for a team member who is not on this project: overview only (MVP P-06, R-11)
  isParticipant: { type: Boolean, default: true },
  form: { type: Object, required: true },
  teamLabel: { type: String, default: '' },
  createdByLabel: { type: String, default: '' },
  createdAtLabel: { type: String, default: '' },
  memberRows: { type: Array, default: () => [] },
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
  listCrumb: { type: Object, default: null },
});

const emit = defineEmits([
  'save-project',
  'archive-project',
  'restore-project',
  'invite-member',
  'change-member-role',
  'delete-member',
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
  'team-renamed',
  'team-reassigned',
]);

const route = useRoute();
const router = useRouter();
const selectedDatasetId = ref('');
const archiveModalEl = ref(null);
let archiveModal = null;
const unlinkModalEl = ref(null);
let unlinkModal = null;
const pendingUnlink = ref(null);

onMounted(() => {
  if (archiveModalEl.value) archiveModal = new Modal(archiveModalEl.value);
  if (unlinkModalEl.value) unlinkModal = new Modal(unlinkModalEl.value);
});

onBeforeUnmount(() => {
  try {
    archiveModal?.hide();
    archiveModal?.dispose();
    unlinkModal?.hide();
    unlinkModal?.dispose();
  } catch {
    /* ignore */
  }
  archiveModal = null;
  unlinkModal = null;
});

function openArchiveModal() {
  archiveModal?.show();
}

function confirmArchive() {
  archiveModal?.hide();
  emit('archive-project');
}

function openUnlinkModal(row) {
  if (!row?.id) return;
  pendingUnlink.value = {
    id: row.id,
    name: row.name || 'this dataset',
    empty: Number(row.table_count ?? row.physical_table_count ?? 0) === 0,
  };
  unlinkModal?.show();
}

function confirmUnlink() {
  const id = pendingUnlink.value?.id;
  unlinkModal?.hide();
  if (id) emit('unlink-dataset', id);
}

const VALID_TABS = ['home', 'overview', 'docs', 'analytics', 'jupyter', 'people', 'settings'];

function tabFromQuery() {
  const raw = String(route.query.tab || '');
  const t = raw === 'datasets' ? 'overview' : raw;
  if (t === 'settings' && !props.canManage) return 'home';
  if (!props.isParticipant && !['home', 'overview', 'people'].includes(t)) return 'home';
  if (VALID_TABS.includes(t)) return t;
  return 'home';
}

const section = ref(tabFromQuery());

watch(
  () => route.query.tab,
  () => {
    const next = tabFromQuery();
    if (next !== section.value) section.value = next;
  }
);

function setSection(id) {
  section.value = id;
  const current = String(route.query.tab || '');
  const nextTab = id === 'home' ? '' : id;
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
        { id: 'home', label: 'Home', icon: 'bi bi-house' },
        { id: 'overview', label: 'Datasets', icon: 'bi bi-database' },
        { id: 'docs', label: 'Documentation', icon: 'bi bi-file-earmark-text' },
        { id: 'analytics', label: 'Analytics', icon: 'bi bi-graph-up' },
        { id: 'jupyter', label: 'Jupyter', icon: 'bi bi-journal-code' },
        { id: 'people', label: 'People', icon: 'bi bi-people' },
      ]
    // Not on the project: home, linked datasets, and the roster only.
    : [
        { id: 'home', label: 'Home', icon: 'bi bi-house' },
        { id: 'overview', label: 'Datasets', icon: 'bi bi-database' },
        { id: 'people', label: 'People', icon: 'bi bi-people' },
      ];
  if (props.canManage) {
    items.push({ id: 'settings', label: 'Settings', icon: 'bi bi-gear' });
  }
  return items;
});

const activeNavLabel = computed(
  () => navItems.value.find((item) => item.id === section.value)?.label || 'Project'
);

function onMobileNavPick(id) {
  setSection(id);
  const el = document.getElementById('projectHubNavOffcanvas');
  if (!el) return;
  Offcanvas.getInstance(el)?.hide();
}

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
    <div v-if="isDemonstration" class="alert alert-info py-2 small mx-3 mt-2 mb-0">
      <strong>Demonstration project.</strong>
      Sample datasets here are seeded by Super admin and are <strong>read-only</strong>.
      Do not re-ingest them. Use them to walk through analysis.
    </div>

    <nav class="project-hub-subnav d-md-none border-bottom" aria-label="Project sections">
      <div class="d-flex align-items-center justify-content-between gap-2 px-2">
        <button
          type="button"
          class="btn btn-link project-hub-subnav-btn"
          data-bs-toggle="offcanvas"
          data-bs-target="#projectHubNavOffcanvas"
        >
          <i class="bi bi-list" aria-hidden="true"></i>
          {{ activeNavLabel }}
        </button>
      </div>
    </nav>

    <div class="project-hub-shell" :class="{ 'project-hub-shell--subnav': true }">
      <aside class="project-hub-rail d-none d-md-flex" aria-label="Project sections">
        <button
          v-for="item in navItems"
          :key="item.id"
          type="button"
          class="project-hub-rail-btn"
          :class="{ 'project-hub-rail-btn--active': section === item.id }"
          :aria-label="item.label"
          :aria-current="section === item.id ? 'page' : undefined"
          v-tooltip.right="item.label"
          @click="setSection(item.id)"
        >
          <i :class="item.icon" aria-hidden="true"></i>
        </button>
      </aside>

      <div class="project-hub-main">
        <nav v-if="listCrumb?.to" aria-label="breadcrumb" class="mb-2">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">
              <router-link :to="listCrumb.to">{{ listCrumb.label }}</router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">
              {{ form.name || 'Project' }}
            </li>
          </ol>
        </nav>
        <div v-if="form.status === 'archived'" class="alert alert-secondary small" role="status">
          <strong>Archived.</strong>
          Hidden from the project menu. People, datasets, and pages are unchanged.
          <template v-if="canManage && section !== 'settings'">
            Restore in Settings puts it back in the menu.
          </template>
        </div>
        <div v-if="!isParticipant" class="alert alert-info small mb-3" role="status">
          You can see this project because you are on its team, but you are not a member of it.
          Ask a project Admin to add you to open its analytics, documentation and reports.
        </div>
        <section v-if="section === 'home'">
          <ProjectHomePanel
            :form="form"
            :team-label="teamLabel"
            :created-by-label="createdByLabel"
            :created-at-label="createdAtLabel"
            :member-rows="memberRows"
            :datasets="linkedDatasetRows"
            :can-manage="canManage"
            :is-participant="isParticipant"
            @go-section="setSection"
          />
        </section>

        <section v-else-if="section === 'overview'">
          <ProjectDatasetMasterDetail
            :datasets="linkedDatasetRows"
            :can-manage="canManage"
            :addable-datasets="addableDatasets"
            :dataset-to-add="datasetToAdd"
            :new-dataset-name="newDatasetName"
            :saving-datasets="savingDatasets"
            :has-team="!!form.team_id"
            :project-id="form.id ? String(form.id) : ''"
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
          <OwningTeamPanel
            v-if="canManage || form.team_id"
            :team-id="form.team_id ? String(form.team_id) : ''"
            :project-id="form.id"
            :project-name="form.name"
            :can-manage="canManage"
            @renamed="emit('team-renamed', $event)"
            @reassigned="emit('team-reassigned', $event)"
          />
          <div class="card p-3" :class="{ 'mt-3': canManage || form.team_id }">
            <h5 class="card-title mb-3">People</h5>
            <template v-if="canManage">
              <p class="small text-muted mb-3">
                After the team above is set, invite people in that lab by email.
                They join this project and the owning team. If they are already on the project, nothing changes.
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
            <div class="small text-muted mb-3">
              <div class="mb-2">
                <div>Project ID</div>
                <div class="font-monospace text-break user-select-all">{{ form.id || '—' }}</div>
              </div>
              <div v-if="form.slug" class="mb-2">
                <div>Slug</div>
                <div class="font-monospace text-break user-select-all">{{ form.slug }}</div>
              </div>
              <div>
                Team: {{ teamLabel }}
                <span v-if="form.team_id"> · Rename and manage members on <strong>People</strong></span>
                <span v-if="createdByLabel"> · Created by {{ createdByLabel }}</span>
                <span v-if="createdAtLabel"> · {{ createdAtLabel }}</span>
              </div>
            </div>
            <div class="d-flex justify-content-end">
              <button
                type="button"
                class="btn btn-primary"
                :disabled="savingProject || !form.name"
                @click="emit('save-project')"
              >
                <span v-if="savingProject" class="spinner-border spinner-border-sm me-2" />
                Save changes
              </button>
            </div>
          </div>

          <div class="card p-3 mt-3">
            <h5 class="card-title mb-2">Linked datasets</h5>
            <p class="small text-muted mb-3">
              Unlink a dataset from this project here. Rename, share, and Discoverable are on
              that dataset’s settings. Linking and ingest stay on this project’s Datasets tab.
            </p>
            <div v-if="!linkedDatasetRows.length" class="small text-muted mb-0">
              None linked yet.
            </div>
            <ul v-else class="list-group">
              <li
                v-for="row in linkedDatasetRows"
                :key="row.id"
                class="list-group-item d-flex align-items-center justify-content-between gap-2"
              >
                <div class="min-w-0">
                  <div class="fw-semibold text-truncate">{{ row.name }}</div>
                  <div class="small text-muted">
                    {{ Number(row.table_count ?? 0) }}
                    {{ Number(row.table_count ?? 0) === 1 ? 'table' : 'tables' }}
                  </div>
                </div>
                <div class="d-flex flex-shrink-0 gap-2">
                  <router-link
                    class="btn btn-sm btn-outline-secondary"
                    :to="{ name: 'adminDatasetsEdit', params: { id: row.id } }"
                  >
                    Catalog settings
                  </router-link>
                  <button
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    :disabled="savingDatasets"
                    @click="openUnlinkModal(row)"
                  >
                    Unlink
                  </button>
                </div>
              </li>
            </ul>
          </div>

          <div class="card p-3 mt-3">
            <h5 class="card-title mb-2">
              {{ form.status === 'archived' ? 'Restore' : 'Archive' }}
            </h5>
            <p v-if="form.status !== 'archived'" class="small text-muted mb-3">
              Archiving keeps this page open and hides the project from the project menu.
              It is not deleted. People, datasets, and pages stay as they are.
              Restore on this page puts the name back in the menu.
            </p>
            <p v-else class="small text-muted mb-3">
              This project is hidden from the project menu. Restore puts the name back in that menu.
              Nothing was deleted.
            </p>
            <button
              v-if="form.status !== 'archived'"
              type="button"
              class="btn btn-outline-secondary align-self-start"
              :disabled="savingProject"
              @click="openArchiveModal"
            >
              Archive project
            </button>
            <button
              v-else
              type="button"
              class="btn btn-outline-primary align-self-start"
              :disabled="savingProject"
              @click="emit('restore-project')"
            >
              Restore project
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

    <div
      class="offcanvas offcanvas-start"
      id="projectHubNavOffcanvas"
      tabindex="-1"
      aria-labelledby="projectHubNavOffcanvasLabel"
    >
      <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title" id="projectHubNavOffcanvasLabel">Project</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body p-0">
        <nav class="project-hub-sidebar-nav">
          <button
            v-for="item in navItems"
            :key="`mobile-${item.id}`"
            type="button"
            class="project-hub-sidebar-item"
            :class="{ 'project-hub-sidebar-item--active': section === item.id }"
            @click="onMobileNavPick(item.id)"
          >
            <i :class="item.icon" aria-hidden="true"></i>
            <span>{{ item.label }}</span>
          </button>
        </nav>
      </div>
    </div>

    <div
      class="modal fade"
      tabindex="-1"
      ref="archiveModalEl"
      aria-labelledby="archiveProjectTitle"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="archiveProjectTitle">Archive {{ form.name || 'this project' }}?</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
          <p>
            It stays on this page, marked archived, and drops out of the project menu.
            People, datasets, and pages stay as they are.
          </p>
          <p class="mb-0">
            Restore on this page puts it back in the menu.
          </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" :disabled="savingProject" @click="confirmArchive">
              Archive project
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      class="modal fade"
      tabindex="-1"
      ref="unlinkModalEl"
      aria-labelledby="unlinkDatasetTitle"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="unlinkDatasetTitle">
              Unlink {{ pendingUnlink?.name || 'this dataset' }}?
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <p v-if="pendingUnlink?.empty" class="mb-0">
              It leaves this project. This dataset has no tables, so it is archived and drops out of the add list.
            </p>
            <p v-else class="mb-0">
              It leaves this project. The dataset and its tables stay with the owning team, and Add a dataset can put it back.
            </p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-danger" :disabled="savingDatasets" @click="confirmUnlink">
              Unlink
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-hub-shell {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.project-hub-rail {
  flex: 0 0 48px;
  flex-direction: column;
  align-items: stretch;
  background: var(--bs-tertiary-bg);
  border-right: 1px solid var(--bs-border-color);
  padding: 0.35rem 0;
}

.project-hub-rail-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 44px;
  border: 0;
  background: transparent;
  color: var(--bs-secondary-color);
  position: relative;
}

.project-hub-rail-btn:hover {
  color: var(--bs-emphasis-color);
  background: var(--bs-secondary-bg);
}

.project-hub-rail-btn--active {
  color: var(--w4h-active-fg, var(--bs-emphasis-color));
}

.project-hub-rail-btn--active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.35rem;
  bottom: 0.35rem;
  width: 2px;
  background: var(--bs-primary);
  border-radius: 0 2px 2px 0;
}

.project-hub-sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.project-hub-sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: var(--bs-body-color);
  text-align: left;
  padding: 0.45rem 0.55rem;
  font-size: 0.9rem;
}

.project-hub-sidebar-item:hover {
  background: var(--bs-secondary-bg);
}

.project-hub-sidebar-item--active {
  background: var(--bs-primary-bg-subtle);
  color: var(--w4h-active-fg, var(--bs-emphasis-color));
  font-weight: 600;
}

.project-hub-main {
  flex: 1 1 auto;
  min-width: 0;
  overflow: auto;
  padding: 0.75rem 1rem 1.25rem;
}

@media (max-width: 767.98px) {
  .project-hub-shell {
    display: block;
    overflow: visible;
  }

  .project-hub-main {
    padding-top: 0.5rem;
  }
}
</style>
