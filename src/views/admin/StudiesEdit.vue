<template>
  <main class="container-fluid" v-if="loaded">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/studies">Projects</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Edit Project</li>
      </ol>
    </nav>

    <div class="row g-3">
      <div class="col-12 col-lg-7">
        <div class="card p-3">
          <h5 class="card-title mb-3">Project details</h5>

          <div class="mb-3">
            <label class="form-label">Project ID</label>
            <input v-model="form.id" class="form-control" disabled />
            <div class="form-text">Project ID cannot be changed.</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model.trim="form.name" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea v-model.trim="form.description" class="form-control" rows="3" placeholder="Optional"></textarea>
          </div>

          <div class="row g-3 mb-3">
            <div class="col-md-6">
              <label class="form-label">Status</label>
              <select v-model="form.status" class="form-select">
                <option value="active">active</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Visibility</label>
              <select v-model="form.visibility" class="form-select">
                <option value="org-private">Organization-private</option>
                <option value="project-private">Project-private</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">IRB protocol ID</label>
            <input v-model.trim="form.irb_protocol_id" class="form-control" placeholder="Optional" />
          </div>

          <div class="mb-3">
            <label class="form-label">IRB expiry date</label>
            <input v-model="form.irb_expiry_date" type="date" class="form-control" />
          </div>

          <hr class="my-3" />

          <h6>Launcher configuration</h6>
          <div class="mb-3">
            <label class="form-label">Jupyter base URL</label>
            <input v-model.trim="form.launchers.jupyterBaseUrl" class="form-control font-monospace" placeholder="https://jupyter.example.org" />
          </div>
          <div class="mb-3">
            <label class="form-label">RStudio base URL</label>
            <input v-model.trim="form.launchers.rstudioBaseUrl" class="form-control font-monospace" placeholder="https://rstudio.example.org" />
          </div>
          <div class="mb-3">
            <label class="form-label">VSCode URL template</label>
            <input v-model.trim="form.launchers.vscodeTemplate" class="form-control font-monospace" placeholder="vscode://file/{path}" />
            <div class="form-text">Variables: {'{path}'}, {'{repo_url}'}, {'{repo_ref}'}</div>
          </div>

          <hr class="my-3" />

          <h6>Linked datasets (project-level)</h6>
          <div v-if="availableDatasets.length === 0" class="text-muted small mb-3">
            No datasets available for your account.
          </div>
          <div v-else class="border rounded p-2 mb-3" style="max-height: 220px; overflow: auto;">
            <label v-for="d in availableDatasets" :key="d.id" class="d-flex align-items-start gap-2 mb-2 small">
              <input
                class="form-check-input mt-1"
                type="checkbox"
                :checked="linkedDatasetIds.includes(String(d.id))"
                @change="toggleDatasetSelection(d.id)"
              />
              <span>
                <strong>{{ d.name || d.id }}</strong>
                <span class="text-muted ms-1">{{ d.id }}</span>
              </span>
            </label>
          </div>

          <div class="d-flex justify-content-end">
            <button class="btn btn-primary" :disabled="savingProject || !form.name" @click="saveProject">
              <span v-if="savingProject" class="spinner-border spinner-border-sm me-2" />
              Save project
            </button>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-5">
        <div class="card p-3">
          <h5 class="card-title mb-3">Members</h5>
          <p class="small text-muted mb-3">
            Add users by account email. Role and remove actions are saved immediately.
          </p>

          <div v-if="memberRows.length === 0" class="small text-muted mb-2">No members yet.</div>
          <div v-for="row in memberRows" :key="row.user_id" class="row g-2 align-items-end mb-2">
            <div class="col-7">
              <label class="form-label small mb-0">Email</label>
              <input :value="row.email" type="email" class="form-control form-control-sm" disabled />
            </div>
            <div class="col-3">
              <label class="form-label small mb-0">Role</label>
              <select
                class="form-select form-select-sm"
                :value="row.role"
                :disabled="savingMembers"
                @change="changeMemberRole(row, $event.target.value)"
              >
                <option value="owner">owner</option>
                <option value="admin">admin</option>
                <option value="editor">editor</option>
                <option value="viewer">viewer</option>
              </select>
            </div>
            <div class="col-2">
              <button type="button" class="btn btn-sm btn-outline-danger w-100" :disabled="savingMembers" @click="deleteMember(row)">
                Remove
              </button>
            </div>
          </div>

          <div class="border-top pt-3 mt-2">
            <div class="row g-2 align-items-end">
              <div class="col-7">
                <label class="form-label small mb-0">New member email</label>
                <input v-model.trim="newMember.email" type="email" class="form-control form-control-sm" placeholder="user@example.org" />
              </div>
              <div class="col-3">
                <label class="form-label small mb-0">Role</label>
                <select v-model="newMember.role" class="form-select form-select-sm">
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <div class="col-2">
                <button type="button" class="btn btn-sm btn-primary w-100" :disabled="savingMembers || !newMember.email" @click="addMember">
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="message" class="alert mt-3" :class="ok ? 'alert-success' : 'alert-danger'">
      {{ message }}
    </div>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const userStore = useUserStore();

const loaded = ref(false);
const savingProject = ref(false);
const savingMembers = ref(false);
const message = ref('');
const ok = ref(false);

const form = reactive({
  id: '',
  name: '',
  description: '',
  status: 'active',
  visibility: 'org-private',
  irb_protocol_id: '',
  irb_expiry_date: '',
  launchers: {
    jupyterBaseUrl: '',
    rstudioBaseUrl: '',
    vscodeTemplate: 'vscode://file/{path}'
  }
});

const memberRows = ref([]);
const availableDatasets = ref([]);
const linkedDatasetIds = ref([]);
const newMember = reactive({
  email: '',
  role: 'viewer'
});

function setMessage(success, text) {
  ok.value = success;
  message.value = text;
}

function mapOverviewToForm(data) {
  const p = data?.project || {};
  form.id = p.id || '';
  form.name = p.name || '';
  form.description = p.description || '';
  form.status = p.status || 'active';
  form.visibility = p.visibility || 'org-private';
  form.irb_protocol_id = p.irb_protocol_id || '';
  form.irb_expiry_date = p.irb_expiry_date || '';
  form.launchers = {
    jupyterBaseUrl: p.launchers?.jupyterBaseUrl || '',
    rstudioBaseUrl: p.launchers?.rstudioBaseUrl || '',
    vscodeTemplate: p.launchers?.vscodeTemplate || 'vscode://file/{path}'
  };
  linkedDatasetIds.value = Array.isArray(data?.datasets)
    ? data.datasets.map(d => String(d.dataset_id || d.id || '')).filter(Boolean)
    : [];
  memberRows.value = Array.isArray(data?.members)
    ? data.members.map(m => ({
        user_id: m.user_id,
        email: m.email || '',
        role: m.role || 'viewer'
      }))
    : [];
}

function toggleDatasetSelection(datasetId) {
  const value = String(datasetId || '');
  if (!value) return;
  const current = new Set(linkedDatasetIds.value || []);
  if (current.has(value)) current.delete(value);
  else current.add(value);
  linkedDatasetIds.value = Array.from(current);
}

onMounted(async () => {
  try {
    const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
    const [projectRes, datasetsRes] = await Promise.all([
      api.get(`projects/${encodeURIComponent(id || '')}`, authHeaders()),
      api.get('datasets', authHeaders())
    ]);
    const data = projectRes.data;
    availableDatasets.value = Array.isArray(datasetsRes.data) ? datasetsRes.data : [];
    mapOverviewToForm(data);
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to load project.');
  } finally {
    loaded.value = true;
  }
});

async function saveProject() {
  savingProject.value = true;
  setMessage(false, '');
  try {
    await api.patch(
      `projects/${encodeURIComponent(form.id)}`,
      {
        name: form.name,
        description: form.description || null,
        status: form.status,
        visibility: form.visibility,
        irb_protocol_id: form.irb_protocol_id || null,
        irb_expiry_date: form.irb_expiry_date || null,
        launchers: {
          jupyterBaseUrl: form.launchers.jupyterBaseUrl || '',
          rstudioBaseUrl: form.launchers.rstudioBaseUrl || '',
          vscodeTemplate: form.launchers.vscodeTemplate || 'vscode://file/{path}'
        }
      },
      authHeaders()
    );
    await api.put(
      `projects/${encodeURIComponent(form.id)}/datasets`,
      {
        datasets: (linkedDatasetIds.value || []).map((dataset_id) => ({
          dataset_id,
          access_type: 'read'
        }))
      },
      authHeaders()
    );
    setMessage(true, 'Project updated.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to save project.');
  } finally {
    savingProject.value = false;
  }
}

async function addMember() {
  if (!newMember.email) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.post(
      `projects/${encodeURIComponent(form.id)}/members`,
      {
        email: String(newMember.email || '').trim(),
        role: newMember.role || 'viewer'
      },
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data)
      ? res.data.map(m => ({ user_id: m.user_id, email: m.email || '', role: m.role || 'viewer' }))
      : memberRows.value;
    newMember.email = '';
    newMember.role = 'viewer';
    setMessage(true, 'Member added.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to add member.');
  } finally {
    savingMembers.value = false;
  }
}

async function changeMemberRole(row, nextRole) {
  if (!row?.user_id || !nextRole || row.role === nextRole) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.patch(
      `projects/${encodeURIComponent(form.id)}/members/${encodeURIComponent(row.user_id)}`,
      { role: nextRole },
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data)
      ? res.data.map(m => ({ user_id: m.user_id, email: m.email || '', role: m.role || 'viewer' }))
      : memberRows.value;
    setMessage(true, 'Member role updated.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to update member role.');
  } finally {
    savingMembers.value = false;
  }
}

async function deleteMember(row) {
  if (!row?.user_id) return;
  if (!window.confirm(`Remove ${row.email || 'this member'} from the project?`)) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.delete(
      `projects/${encodeURIComponent(form.id)}/members/${encodeURIComponent(row.user_id)}`,
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data)
      ? res.data.map(m => ({ user_id: m.user_id, email: m.email || '', role: m.role || 'viewer' }))
      : memberRows.value;
    setMessage(true, 'Member removed.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to remove member.');
  } finally {
    savingMembers.value = false;
  }
}
</script>
