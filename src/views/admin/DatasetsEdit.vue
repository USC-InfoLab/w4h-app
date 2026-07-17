<template>
  <main class="container-fluid" v-if="loaded">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/datasets">Datasets</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Edit Dataset</li>
      </ol>
    </nav>

    <div class="row g-3">
      <div class="col-12 col-lg-7">
        <div class="card p-3">
          <h5 class="card-title mb-3">Dataset details</h5>
          <p class="small text-muted mb-3">
            A dataset is a catalog of related tables (subjects, wearables, demographics, …), not a single table.
          </p>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model.trim="form.name" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Dataset ID</label>
            <input :value="form.id" class="form-control font-monospace" disabled />
            <div class="form-text">Dataset ID cannot be changed.</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Owning team</label>
            <select v-if="canChangeTeam" v-model="form.team_id" class="form-select">
              <option value="">— none —</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">
                {{ t.name }}{{ t.slug ? ` (${t.slug})` : '' }}
              </option>
            </select>
            <input v-else :value="teamLabel" class="form-control" disabled />
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea v-model.trim="form.description" class="form-control" rows="3" placeholder="Optional"></textarea>
          </div>

          <div v-if="message" class="alert" :class="ok ? 'alert-success' : 'alert-danger'">
            {{ message }}
          </div>

          <div class="d-flex justify-content-end gap-2">
            <router-link class="btn btn-outline-secondary" :to="{ name: 'adminProjects' }">
              Go to Projects
            </router-link>
            <button class="btn btn-primary" :disabled="saving || !form.name" @click="save">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" />
              Save dataset
            </button>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-5">
        <div class="card p-3">
          <h5 class="card-title mb-3">Tables</h5>
          <p class="small text-muted mb-3">
            Tables in this dataset (e.g. <code>subjects</code>, <code>fitbit</code>, <code>demographics</code>).
            Added by ingestion — not one row per device.
          </p>

          <div v-if="tables.length === 0" class="small text-muted mb-2">
            No tables yet. Ingest CSV / JSON / REDCap (coming next) to populate this dataset.
          </div>
          <ul v-else class="list-group list-group-flush">
            <li v-for="t in tables" :key="t.name" class="list-group-item px-0">
              <div class="fw-semibold">{{ t.name }}</div>
              <small v-if="t.source_name" class="text-muted">{{ t.source_name }}</small>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';

const route = useRoute();
const userStore = useUserStore();

const loaded = ref(false);
const saving = ref(false);
const message = ref('');
const ok = ref(false);
const teams = ref([]);
const tables = ref([]);
const teamName = ref('');
const teamSlug = ref('');

const form = reactive({
  id: '',
  team_id: '',
  name: '',
  description: ''
});

const canChangeTeam = computed(() => isSuperAdmin(userStore.user?.role));
const teamLabel = computed(() => {
  if (teamName.value) {
    return teamSlug.value ? `${teamName.value} (${teamSlug.value})` : teamName.value;
  }
  return form.team_id || '—';
});

onMounted(async () => {
  try {
    const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
    const requests = [api.get(`datasets/${encodeURIComponent(id || '')}`, authHeaders())];
    if (isSuperAdmin(userStore.user?.role)) {
      requests.push(api.get('teams', authHeaders()));
    }
    const [datasetRes, teamsRes] = await Promise.all(requests);
    if (teamsRes) teams.value = Array.isArray(teamsRes.data) ? teamsRes.data : [];

    const d = datasetRes.data || {};
    form.id = d.id || '';
    form.team_id = d.team_id || '';
    form.name = d.name || '';
    form.description = d.description || '';
    teamName.value = d.team_name || '';
    teamSlug.value = d.team_slug || '';
    tables.value = Array.isArray(d.tables) ? d.tables : [];
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to load dataset.';
    ok.value = false;
  } finally {
    loaded.value = true;
  }
});

async function save() {
  saving.value = true;
  message.value = '';
  ok.value = false;
  try {
    const payload = {
      name: form.name,
      description: form.description || null
    };
    if (canChangeTeam.value) {
      payload.team_id = form.team_id || null;
    }
    const res = await api.patch(
      `datasets/${encodeURIComponent(form.id)}`,
      payload,
      authHeaders()
    );
    const d = res.data || {};
    form.team_id = d.team_id || '';
    teamName.value = d.team_name || '';
    teamSlug.value = d.team_slug || '';
    ok.value = true;
    message.value = 'Dataset updated. Link it from Projects → Edit → Linked datasets.';
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to save dataset.';
  } finally {
    saving.value = false;
  }
}
</script>
