<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/datasets">Datasets</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Add Dataset</li>
      </ol>
    </nav>

    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <div class="card p-3">
          <h5 class="card-title mb-3">New Dataset</h5>
          <p class="small text-muted mb-3">
            A dataset is a team-owned catalog of related tables (e.g. subjects, Fitbit, demographics).
            You create the catalog entry here; tables are added when you ingest data.
          </p>

          <div class="mb-3">
            <label class="form-label">Owning team</label>
            <select
              v-model="form.team_id"
              class="form-select"
              :disabled="teamLocked || loadingTeams"
            >
              <option value="" disabled>Select a team…</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">
                {{ t.name }}{{ t.slug ? ` (${t.slug})` : '' }}
              </option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input
              v-model.trim="form.name"
              class="form-control"
              placeholder="e.g. Precision PS wearable study"
              @input="onNameInput"
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Dataset ID</label>
            <input
              v-model.trim="form.id"
              class="form-control font-monospace"
              placeholder="e.g. precision-ps-wearable-study"
              @input="onIdInput"
            />
            <div class="form-text">
              Auto-filled from the name. Must be unique — if taken, the server appends <code>-1</code>, <code>-2</code>, …
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea v-model.trim="form.description" class="form-control" rows="3" placeholder="Optional"></textarea>
          </div>

          <div v-if="message" class="alert" :class="ok ? 'alert-success' : 'alert-danger'">
            {{ message }}
          </div>

          <div class="d-flex justify-content-end">
            <button
              class="btn btn-primary"
              :disabled="saving || !form.name || !form.team_id"
              @click="onSave"
            >
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" />
              Create Dataset
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin, isTeamAdmin } from '@/utils/roles';

const router = useRouter();
const userStore = useUserStore();

const form = reactive({
  team_id: '',
  id: '',
  name: '',
  description: ''
});

const teams = ref([]);
const loadingTeams = ref(true);
const teamLocked = ref(false);
const saving = ref(false);
const message = ref('');
const ok = ref(false);
const idTouched = ref(false);

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function onNameInput() {
  if (!idTouched.value) {
    form.id = slugify(form.name);
  }
}

function onIdInput() {
  idTouched.value = true;
  form.id = slugify(form.id);
}

onMounted(async () => {
  document.title = 'Add Dataset';
  try {
    const res = await api.get('teams', authHeaders());
    teams.value = Array.isArray(res.data) ? res.data : [];
    if (
      isTeamAdmin(userStore.user?.role) &&
      !isSuperAdmin(userStore.user?.role) &&
      teams.value.length === 1
    ) {
      form.team_id = teams.value[0].id;
      teamLocked.value = true;
    } else if (teams.value.length === 1) {
      form.team_id = teams.value[0].id;
    }
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to load teams.';
  } finally {
    loadingTeams.value = false;
  }
});

async function onSave() {
  saving.value = true;
  message.value = '';
  ok.value = false;
  try {
    const created = await api.post(
      'datasets',
      {
        team_id: form.team_id,
        id: form.id || undefined,
        name: form.name,
        description: form.description || null
      },
      authHeaders()
    );
    ok.value = true;
    message.value = 'Dataset created.';
    const id = created.data?.id;
    if (id) {
      router.push({ name: 'adminDatasetsEdit', params: { id } });
    } else {
      router.push({ name: 'adminDatasets' });
    }
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to create dataset.';
  } finally {
    saving.value = false;
  }
}
</script>
