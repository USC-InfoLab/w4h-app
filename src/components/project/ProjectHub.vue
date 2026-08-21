<script setup>
import { computed, ref } from 'vue';
import { projectMemberUiValue } from '@/utils/roles';
import ProjectDocsCard from '@/components/project/ProjectDocsCard.vue';
import ProjectDatasetMasterDetail from '@/components/project/ProjectDatasetMasterDetail.vue';
import DatasetStatTiles from '@/components/project/DatasetStatTiles.vue';

const props = defineProps({
  canManage: { type: Boolean, default: false },
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
});

const emit = defineEmits([
  'save-project',
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
]);

const section = ref('overview');

const navItems = computed(() => {
  const items = [
    { id: 'overview', label: 'Datasets', icon: 'bi bi-database' },
    { id: 'docs', label: 'Documentation', icon: 'bi bi-file-earmark-text' },
    { id: 'analytics', label: 'Analytics', icon: 'bi bi-graph-up' },
    { id: 'jupyter', label: 'Jupyter', icon: 'bi bi-journal-code' },
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

function onDatasetSelect(event) {
  const value = event.target.value;
  emit('update:datasetToAdd', value);
  emit('dataset-pick', value);
}

const canInvite = computed(() => {
  const email = String(props.inviteEmail || '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
});

// Same parsing as ProjectDatasetMasterDetail.vue — datasets carry summary as
// raw jsonb (string or object) from the API, not pre-parsed.
function summaryOf(row) {
  const raw = row?.summary;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? raw : null;
}

function hasAnyStats(summary, tableCount) {
  const s = summary || {};
  return Boolean(
    tableCount ||
    s.observations != null ||
    s.participants != null ||
    s.participant_days != null ||
    s.modality != null ||
    s.date_range || s.date_start || s.date_end || s.start_date || s.end_date
  );
}

const datasetsWithStats = computed(() =>
  (props.linkedDatasetRows || [])
    .map((d) => ({
      id: String(d.id || d.dataset_id || ''),
      name: d.name || d.id || 'Dataset',
      tableCount: Number(d.table_count ?? summaryOf(d)?.table_count ?? 0),
      summary: summaryOf(d) || {},
    }))
    .filter((d) => hasAnyStats(d.summary, d.tableCount))
);
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
            @click="section = item.id"
          >
            <i :class="item.icon" aria-hidden="true"></i>
            {{ item.label }}
          </button>
        </nav>
      </div>

      <div class="col-12 col-lg-9 col-xl-10">
        <section v-if="section === 'overview'">
            <ProjectDatasetMasterDetail
            :datasets="linkedDatasetRows"
            :can-manage="canManage"
            @unlink-dataset="emit('unlink-dataset', $event)"
          />

          <div v-if="canManage" class="card p-3 mt-3">
            <h6 class="mb-2">Create or link a dataset</h6>
            <p class="small text-muted mb-3">
              Linking a catalog row does not load tables. Load data by adapting a notebook or
              deploying a CLI from a Contributions example against <em>your</em> team, with your
              personal API key. Sample / demonstration datasets are read-only.
            </p>
            <div v-if="!form.team_id" class="alert alert-warning small mb-0">
              Set an owning team before assigning datasets.
            </div>
            <template v-else>
              <div class="row g-2 align-items-end">
                <div class="col">
                  <label class="form-label small mb-0">Add existing</label>
                  <select
                    class="form-select form-select-sm"
                    :value="datasetToAdd"
                    :disabled="savingDatasets"
                    @change="onDatasetSelect"
                  >
                    <option value="">Select…</option>
                    <option v-for="d in addableDatasets" :key="d.id" :value="String(d.id)">
                      {{ d.name || d.id }}{{ d.read_only ? ' (read-only sample)' : '' }}
                    </option>
                    <option value="__new__">Create new catalog dataset…</option>
                  </select>
                </div>
              </div>
              <div v-if="datasetToAdd === '__new__'" class="row g-2 align-items-end mt-2">
                <div class="col">
                  <input
                    class="form-control form-control-sm"
                    placeholder="Dataset name"
                    :value="newDatasetName"
                    :disabled="savingDatasets"
                    @input="emit('update:newDatasetName', $event.target.value)"
                    @keyup.enter="emit('create-dataset')"
                  />
                </div>
                <div class="col-auto">
                  <button
                    type="button"
                    class="btn btn-sm btn-primary"
                    :disabled="savingDatasets || !newDatasetName"
                    @click="emit('create-dataset')"
                  >
                    Create
                  </button>
                </div>
              </div>
            </template>
          </div>
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
          <div v-if="datasetsWithStats.length" class="d-flex flex-column gap-3">
            <div v-for="d in datasetsWithStats" :key="d.id" class="card p-3">
              <h6 class="card-title mb-2">{{ d.name }}</h6>
              <DatasetStatTiles :table-count="d.tableCount" :summary="d.summary" />
            </div>
            <div class="card p-3">
              <p class="small text-muted mb-2">
                Basic stats above are cached from a metadata layer, not a live full-table scan.
                Run analysis against loaded tables from Contributions (adapt a notebook for your
                environment) for detailed reports. In-app charts will land in this pane.
              </p>
              <router-link :to="{ name: 'contributions' }" class="btn btn-primary align-self-start">
                Open Contributions
              </router-link>
            </div>
          </div>
          <div v-else class="card p-3">
            <h5 class="card-title mb-2">Analytics</h5>
            <p class="small text-muted mb-3">
              No summary statistics are available yet for datasets on this project. They appear
              here from a cached metadata layer after ingestion. Run analysis against loaded
              tables from Contributions (adapt a notebook for your environment) — in-app charts
              will land in this pane.
            </p>
            <router-link :to="{ name: 'contributions' }" class="btn btn-primary">
              Open Contributions
            </router-link>
          </div>
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
                <div class="fw-semibold">{{ memberDisplayName(row) }}</div>
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
                  <option value="owner">Admin</option>
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
        </section>
      </div>
    </div>
  </div>
</template>
