<template>
  <main class="container-fluid" v-if="loaded">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li v-if="isSuperAdmin(userStore.user?.role)" class="breadcrumb-item">
          <router-link to="/admin/projects">Projects</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Project</li>
      </ol>
    </nav>

    <ProjectHub
      :can-manage="canManageThisProject"
      :form="form"
      :team-label="teamLabel"
      :created-by-label="createdByLabel"
      :created-at-label="createdAtLabel"
      :member-rows="memberRows"
      :linked-dataset-rows="linkedDatasetRows"
      :addable-datasets="addableDatasets"
      :dataset-to-add="datasetToAdd"
      :new-dataset-name="newDatasetName"
      :saving-project="savingProject"
      :saving-members="savingMembers"
      :saving-datasets="savingDatasets"
      :current-user-id="userStore.user?.id"
      :pages="projectPages"
      :can-edit-pages="canEditPages"
      :is-demonstration="isDemonstration"
      :invite-email="inviteEmail"
      :invite-name="inviteName"
      :invite-role="inviteRole"
      :invite-url="inviteUrl"
      :jupyter-url="jupyterUrl"
      @save-project="saveProject"
      @invite-member="inviteMember"
      @change-member-role="changeMemberRole"
      @delete-member="deleteMember"
      @update:dataset-to-add="datasetToAdd = $event"
      @update:new-dataset-name="newDatasetName = $event"
      @update:invite-email="inviteEmail = $event"
      @update:invite-name="inviteName = $event"
      @update:invite-role="inviteRole = $event"
      @dataset-pick="onDatasetPick"
      @create-dataset="createDatasetForProject"
      @unlink-dataset="unlinkDataset"
      @dataset-run-complete="refreshDatasetsOnly"
    />

    <div v-if="message" class="alert mt-3" :class="ok ? 'alert-success' : 'alert-danger'">
      {{ message }}
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';
import ProjectHub from '@/components/project/ProjectHub.vue';

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const { activeProject, setActiveProject } = useTeamContext();

const loaded = ref(false);
const savingProject = ref(false);
const savingMembers = ref(false);
const savingDatasets = ref(false);
const message = ref('');
const ok = ref(false);

const form = reactive({
  id: '',
  team_id: '',
  name: '',
  description: '',
  status: 'active'
});

const teams = ref([]);
const memberRows = ref([]);
const availableDatasets = ref([]);
const linkedDatasetIds = ref([]);
const linkedDatasetMeta = ref([]);
const datasetToAdd = ref('');
const newDatasetName = ref('');
const createdByLabel = ref('');
const createdAtLabel = ref('');
const teamName = ref('');
const teamSlug = ref('');
const canManageThisProject = ref(false);
const canEditPages = ref(false);
const projectPages = ref([]);
const isDemonstration = ref(false);
const inviteEmail = ref('');
const inviteName = ref('');
const inviteRole = ref('editor');
const inviteUrl = ref('');
const jupyterUrl = String(import.meta.env.VITE_JUPYTER_URL || '').trim();

const canChangeTeam = computed(() => isSuperAdmin(userStore.user?.role));

const teamLabel = computed(() => {
  if (teamName.value) {
    return teamSlug.value ? `${teamName.value} (${teamSlug.value})` : teamName.value;
  }
  return form.team_id || '—';
});

function mapMemberRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((m) => ({
    user_id: m.user_id,
    name: m.name || '',
    email: m.email || '',
    role: m.role === 'owner' ? 'owner' : 'editor'
  }));
}

const linkedDatasetRows = computed(() => {
  const byId = new Map();
  for (const d of availableDatasets.value || []) byId.set(String(d.id), d);
  for (const d of linkedDatasetMeta.value || []) {
    byId.set(String(d.dataset_id || d.id), d);
  }
  return (linkedDatasetIds.value || []).map((id) => {
    const meta = byId.get(String(id));
    return {
      id: String(id),
      name: meta?.name || id,
      description: meta?.description || '',
      summary: meta?.summary ?? null,
      summary_updated_at: meta?.summary_updated_at ?? null,
      table_count: meta?.table_count ?? meta?.summary?.table_count ?? 0,
      physical_table_count:
        meta?.physical_table_count ?? meta?.summary?.physical_table_count ?? 0,
      read_only: Boolean(meta?.read_only),
      origin: meta?.origin || '',
      source_label: meta?.source_label || '',
    };
  });
});

const addableDatasets = computed(() => {
  const linked = new Set((linkedDatasetIds.value || []).map(String));
  return (availableDatasets.value || []).filter((d) => !linked.has(String(d.id)));
});

function setMessage(success, text) {
  ok.value = success;
  message.value = text;
}

function formatProjectDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function onDatasetPick(selected) {
  const id = String(selected ?? datasetToAdd.value ?? '');
  if (!id || id === '__new__') return;
  linkDatasetById(id);
  datasetToAdd.value = '';
}

function linkDatasetById(datasetId) {
  if (!canManageThisProject.value) return;
  const id = String(datasetId || '');
  if (!id || linkedDatasetIds.value.includes(id)) return;
  linkedDatasetIds.value.push(id);
  persistLinkedDatasets('Dataset added.');
}

function unlinkDataset(datasetId) {
  if (!canManageThisProject.value) return;
  const id = String(datasetId || '');
  linkedDatasetIds.value = linkedDatasetIds.value.filter((x) => x !== id);
  persistLinkedDatasets('Dataset removed.');
}

function slugifyDatasetId(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function createDatasetForProject() {
  if (!canManageThisProject.value) return;
  const name = String(newDatasetName.value || '').trim();
  if (!name || !form.team_id || !form.id) return;
  savingDatasets.value = true;
  setMessage(false, '');
  try {
    const created = await api.post(
      'datasets',
      {
        team_id: form.team_id,
        id: slugifyDatasetId(name) || undefined,
        name,
        discoverable: true
      },
      authHeaders()
    );
    const id = created.data?.id;
    if (id && !linkedDatasetIds.value.map(String).includes(String(id))) {
      linkedDatasetIds.value.push(String(id));
    }
    newDatasetName.value = '';
    datasetToAdd.value = '';
    await persistLinkedDatasets('Dataset created and added to this project.');
    const refreshed = await api.get(`projects/${encodeURIComponent(form.id)}`, authHeaders());
    mapOverviewToForm(refreshed.data);
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to create dataset.');
    savingDatasets.value = false;
  }
}

async function persistLinkedDatasets(successMessage) {
  if (!form.id) return;
  savingDatasets.value = true;
  setMessage(false, '');
  try {
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
    setMessage(true, successMessage);
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to update linked datasets.');
    try {
      const refreshed = await api.get(`projects/${encodeURIComponent(form.id)}`, authHeaders());
      mapOverviewToForm(refreshed.data);
    } catch {
      /* ignore */
    }
  } finally {
    savingDatasets.value = false;
  }
}

function mapOverviewToForm(data) {
  const p = data?.project || {};
  form.id = p.id || '';
  form.team_id = p.team_id || '';
  form.name = p.name || '';
  form.description = p.description || '';
  form.status = p.status || 'active';
  isDemonstration.value = Boolean(p.is_demonstration);
  teamName.value = p.team_name || '';
  teamSlug.value = p.team_slug || '';

  const creatorName = p.created_by_name || '';
  const creatorEmail = p.created_by_email || '';
  if (creatorName && creatorEmail) {
    createdByLabel.value = `${creatorName} (${creatorEmail})`;
  } else {
    createdByLabel.value = creatorName || creatorEmail || '';
  }
  createdAtLabel.value = formatProjectDate(p.created_at);

  linkedDatasetIds.value = Array.isArray(data?.datasets)
    ? data.datasets.map((d) => String(d.dataset_id || d.id || '')).filter(Boolean)
    : [];
  linkedDatasetMeta.value = Array.isArray(data?.datasets) ? data.datasets : [];

  availableDatasets.value = Array.isArray(data?.linkable_datasets) ? data.linkable_datasets : [];
  canManageThisProject.value =
    !!data?.capabilities?.can_manage || isSuperAdmin(userStore.user?.role);

  memberRows.value = mapMemberRows(data?.members);

  // Doc-11: anyone with access to this project can edit its docs, unless the server denies it.
  canEditPages.value = data?.capabilities?.can_edit_pages !== false;

  projectPages.value = Array.isArray(data?.pages)
    ? data.pages.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title || p.slug || 'Document',
        doc_type: p.doc_type || 'guide',
        updated_at: p.updated_at || null,
        updated_by: p.updated_by || '',
      }))
    : [];
}

async function refreshDatasetsOnly() {
  if (!form.id) return;
  try {
    const refreshed = await api.get(`projects/${encodeURIComponent(form.id)}`, authHeaders());
    mapOverviewToForm(refreshed.data);
  } catch {
    // Best-effort — the run's own status/log already told the user it succeeded.
  }
}

function routeProjectRef() {
  const id = route.params.id;
  return Array.isArray(id) ? id[0] : id;
}

async function loadProjectOverview(projectRef) {
  const id = String(projectRef || '').trim();
  if (!id) return;
  loaded.value = false;
  setMessage(false, '');
  try {
    const requests = [api.get(`projects/${encodeURIComponent(id)}`, authHeaders())];
    if (isSuperAdmin(userStore.user?.role) && !teams.value.length) {
      requests.push(api.get('teams', authHeaders()));
    }
    const [projectRes, teamsRes] = await Promise.all(requests);
    if (teamsRes) {
      teams.value = Array.isArray(teamsRes.data) ? teamsRes.data : [];
    }
    mapOverviewToForm(projectRes.data);
    if (form.id) setActiveProject(String(form.id));
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to load project.');
  } finally {
    loaded.value = true;
  }
}

onMounted(() => {
  loadProjectOverview(routeProjectRef());
});

watch(
  () => routeProjectRef(),
  (id, prev) => {
    if (!id || String(id) === String(prev || '')) return;
    loadProjectOverview(id);
  }
);

watch(
  () => activeProject.value?.id,
  (id) => {
    if (isSuperAdmin(userStore.user?.role)) return;
    if (!id) return;
    const current = routeProjectRef();
    const target = activeProject.value?.slug || id;
    if (
      String(id) !== String(form.id) &&
      String(current) !== String(id) &&
      String(current) !== String(activeProject.value?.slug || '')
    ) {
      router.replace({ name: 'adminProjectsEdit', params: { id: target } });
    }
  }
);

async function saveProject() {
  if (!canManageThisProject.value) return;
  savingProject.value = true;
  setMessage(false, '');
  try {
    const payload = {
      name: form.name,
      description: form.description || null,
      status: form.status
    };
    if (canChangeTeam.value) {
      payload.team_id = form.team_id || null;
    }

    const patchRes = await api.patch(
      `projects/${encodeURIComponent(form.id)}`,
      payload,
      authHeaders()
    );
    if (patchRes.data?.team_id != null) {
      form.team_id = patchRes.data.team_id;
    }
    if (patchRes.data?.team_name) teamName.value = patchRes.data.team_name;
    if (patchRes.data?.team_slug) teamSlug.value = patchRes.data.team_slug;

    const refreshed = await api.get(`projects/${encodeURIComponent(form.id)}`, authHeaders());
    mapOverviewToForm(refreshed.data);

    setMessage(true, 'Project updated.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to save project.');
  } finally {
    savingProject.value = false;
  }
}

async function inviteMember() {
  if (!canManageThisProject.value) return;
  const email = String(inviteEmail.value || '').trim();
  if (!email) return;
  savingMembers.value = true;
  inviteUrl.value = '';
  setMessage(false, '');
  try {
    const res = await api.post(
      `projects/${encodeURIComponent(form.id)}/members`,
      {
        email,
        name: String(inviteName.value || '').trim() || undefined,
        role: inviteRole.value || 'editor',
      },
      authHeaders()
    );
    const members = Array.isArray(res.data?.members) ? res.data.members : res.data;
    memberRows.value = Array.isArray(members) ? mapMemberRows(members) : memberRows.value;
    inviteUrl.value = res.data?.inviteUrl || '';
    inviteEmail.value = '';
    inviteName.value = '';
    inviteRole.value = 'editor';
    if (res.data?.mailWarning) {
      setMessage(true, `Invited ${email}. ${res.data.mailWarning}`);
    } else if (res.data?.invited) {
      setMessage(true, `Invitation sent to ${email}.`);
    } else {
      setMessage(true, `${email} added to this project.`);
    }
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to invite.');
  } finally {
    savingMembers.value = false;
  }
}

async function changeMemberRole(row, nextRole) {
  if (!canManageThisProject.value) return;
  if (!row?.user_id || !nextRole || row.role === nextRole) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.patch(
      `projects/${encodeURIComponent(form.id)}/members/${encodeURIComponent(row.user_id)}`,
      { role: nextRole },
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data?.members) ? mapMemberRows(res.data.members) : Array.isArray(res.data) ? mapMemberRows(res.data) : memberRows.value;
    setMessage(true, 'Member role updated.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to update member role.');
  } finally {
    savingMembers.value = false;
  }
}

async function deleteMember(row) {
  if (!canManageThisProject.value) return;
  if (!row?.user_id) return;
  if (!window.confirm(`Remove ${row.email || 'this member'} from the project?`)) return;
  savingMembers.value = true;
  setMessage(false, '');
  try {
    const res = await api.delete(
      `projects/${encodeURIComponent(form.id)}/members/${encodeURIComponent(row.user_id)}`,
      authHeaders()
    );
    memberRows.value = Array.isArray(res.data?.members) ? mapMemberRows(res.data.members) : Array.isArray(res.data) ? mapMemberRows(res.data) : memberRows.value;
    setMessage(true, 'Member removed.');
  } catch (error) {
    setMessage(false, error.response?.data?.error || error.message || 'Failed to remove member.');
  } finally {
    savingMembers.value = false;
  }
}
</script>
