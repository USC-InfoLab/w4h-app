<script setup>
import { computed } from 'vue';
import { projectMemberUiValue } from '@/utils/roles';
import ProjectDocsCard from '@/components/project/ProjectDocsCard.vue';

const props = defineProps({
  form: { type: Object, required: true },
  teams: { type: Array, default: () => [] },
  canChangeTeam: { type: Boolean, default: false },
  teamLabel: { type: String, default: '' },
  createdByLabel: { type: String, default: '' },
  createdAtLabel: { type: String, default: '' },
  memberRows: { type: Array, default: () => [] },
  addableMembers: { type: Array, default: () => [] },
  eligibleMembers: { type: Array, default: () => [] },
  linkedDatasetRows: { type: Array, default: () => [] },
  addableDatasets: { type: Array, default: () => [] },
  datasetToAdd: { type: String, default: '' },
  newDatasetName: { type: String, default: '' },
  newMember: { type: Object, required: true },
  savingProject: { type: Boolean, default: false },
  savingMembers: { type: Boolean, default: false },
  savingDatasets: { type: Boolean, default: false },
  currentUserId: { type: [String, Number], default: null },
  pages: { type: Array, default: () => [] },
  canEditPages: { type: Boolean, default: false },
});

const emit = defineEmits([
  'save-project',
  'add-member',
  'change-member-role',
  'delete-member',
  'update:datasetToAdd',
  'update:newDatasetName',
  'dataset-pick',
  'create-dataset',
  'unlink-dataset',
]);

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

function removeMemberTitle(row) {
  if (isSelfMember(row)) return 'You cannot remove yourself from the project';
  if (isLastProjectAdmin(row)) return 'At least one Admin is required';
  return 'Remove from project';
}

function onDatasetSelect(event) {
  const value = event.target.value;
  emit('update:datasetToAdd', value);
  emit('dataset-pick', value);
}
</script>

<template>
  <div class="row g-3">
    <div class="col-12 col-lg-7">
      <div class="card p-3">
        <h5 class="card-title mb-3">Project details</h5>

        <div class="mb-3">
          <label class="form-label">Name</label>
          <input v-model.trim="form.name" class="form-control" />
        </div>

        <div class="mb-3">
          <label class="form-label">Description</label>
          <textarea
            v-model.trim="form.description"
            class="form-control"
            rows="3"
            placeholder="Optional"
          ></textarea>
        </div>

        <div class="mb-3">
          <label class="form-label">Status</label>
          <select v-model="form.status" class="form-select" style="max-width: 16rem;">
            <option value="active">active</option>
            <option value="archived">archived</option>
          </select>
        </div>

        <div v-if="canChangeTeam" class="mb-3">
          <label class="form-label">Owning team</label>
          <select v-model="form.team_id" class="form-select">
            <option value="">— none —</option>
            <option v-for="t in teams" :key="t.id" :value="t.id">
              {{ t.name }}{{ t.slug ? ` (${t.slug})` : '' }}
            </option>
          </select>
          <div class="form-text">
            Owning team is set on create. Only Super admins can reassign it.
          </div>
        </div>

        <div class="d-flex justify-content-end">
          <button
            class="btn btn-primary"
            :disabled="savingProject || !form.name"
            @click="emit('save-project')"
          >
            <span v-if="savingProject" class="spinner-border spinner-border-sm me-2" />
            Save project
          </button>
        </div>

        <div class="border-top pt-3 mt-3 small text-muted">
          <div v-if="!canChangeTeam" class="mb-1">Team: {{ teamLabel }}</div>
          <div v-if="createdByLabel" class="mb-1">
            Created by {{ createdByLabel }}
            <template v-if="createdAtLabel"> · {{ createdAtLabel }}</template>
          </div>
          <div v-else-if="createdAtLabel" class="mb-1">Created {{ createdAtLabel }}</div>
          <div class="font-monospace text-break">ID: {{ form.id }}</div>
        </div>
      </div>

      <div class="card p-3 mt-3">
        <h5 class="card-title mb-3">Datasets</h5>
        <div v-if="!form.team_id" class="alert alert-warning small mb-0">
          Set an owning team before assigning datasets.
        </div>
        <template v-else>
          <div v-if="linkedDatasetRows.length === 0" class="small text-muted mb-2">
            None linked yet.
          </div>
          <div
            v-for="row in linkedDatasetRows"
            :key="row.id"
            class="d-flex align-items-center justify-content-between gap-2 mb-2"
          >
            <div class="small">
              <strong>{{ row.name }}</strong>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              :disabled="savingDatasets"
              @click="emit('unlink-dataset', row.id)"
            >
              Remove
            </button>
          </div>

          <div class="row g-2 align-items-end mt-2">
            <div class="col">
              <label class="form-label small mb-0">Add dataset</label>
              <select
                class="form-select form-select-sm"
                :value="datasetToAdd"
                :disabled="savingDatasets"
                @change="onDatasetSelect"
              >
                <option value="">Select…</option>
                <optgroup v-if="addableDatasets.length" label="Available">
                  <option v-for="d in addableDatasets" :key="d.id" :value="String(d.id)">
                    {{ d.name || d.id }}
                  </option>
                </optgroup>
                <option value="__new__">Add new</option>
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

      <div v-if="form.id" class="mt-3">
        <ProjectDocsCard
          :project-id="String(form.id)"
          :can-edit="canEditPages"
          :initial-pages="pages"
        />
      </div>
    </div>

    <div class="col-12 col-lg-5">
      <div class="card p-3">
        <h5 class="card-title mb-3">Members</h5>
        <p class="small text-muted mb-3">
          People on this project. <strong>Admin</strong> can manage the study;
          <strong>User</strong> can work in it.
          Super admin is a platform role — it is not assigned here.
          At least one Admin is required, and an Admin cannot remove themselves.
        </p>

        <div v-if="memberRows.length === 0" class="small text-muted mb-2">No members yet.</div>

        <div v-for="row in memberRows" :key="row.user_id" class="row g-2 align-items-end mb-2">
          <div class="col-7">
            <label class="form-label small mb-0">{{ memberDisplayName(row) }}</label>
            <input :value="row.email" type="email" class="form-control form-control-sm" disabled />
          </div>
          <div class="col-3">
            <label class="form-label small mb-0">Role</label>
            <select
              class="form-select form-select-sm"
              :value="projectMemberUiValue(row.role)"
              :disabled="savingMembers || isLastProjectAdmin(row)"
              @change="emit('change-member-role', row, $event.target.value)"
            >
              <option value="owner">Admin</option>
              <option value="editor">User</option>
            </select>
          </div>
          <div class="col-2">
            <button
              type="button"
              class="btn btn-sm btn-outline-danger w-100"
              :disabled="savingMembers || !canRemoveMember(row)"
              :title="removeMemberTitle(row)"
              @click="emit('delete-member', row)"
            >
              Remove
            </button>
          </div>
        </div>

        <div class="border-top pt-3 mt-2">
          <div class="row g-2 align-items-end">
            <div class="col-7">
              <label class="form-label small mb-0">Add user</label>
              <select v-model="newMember.user_id" class="form-select form-select-sm">
                <option value="">Select user…</option>
                <option
                  v-for="u in addableMembers"
                  :key="u.user_id"
                  :value="String(u.user_id)"
                >
                  {{ u.name ? `${u.name} (${u.email})` : u.email }}
                </option>
              </select>
            </div>
            <div class="col-3">
              <label class="form-label small mb-0">Role</label>
              <select v-model="newMember.role" class="form-select form-select-sm">
                <option value="owner">Admin</option>
                <option value="editor">User</option>
              </select>
            </div>
            <div class="col-2">
              <button
                type="button"
                class="btn btn-sm btn-primary w-100"
                :disabled="savingMembers || !newMember.user_id"
                @click="emit('add-member')"
              >
                Add
              </button>
            </div>
          </div>
          <p v-if="form.team_id && !eligibleMembers.length" class="small text-muted mt-2 mb-0">
            No other people to add yet. Invite them when you create the project, or copy a roster
            from another project you administer.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
