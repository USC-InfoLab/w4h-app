<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/projects">Projects</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Add Project</li>
      </ol>
    </nav>

    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <div class="card p-3">
          <h5 class="card-title mb-3">New Project</h5>

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
            <div class="form-text">
              <template v-if="callerIsSuper">
                Choose which team owns this project. Super admins can create projects for any team.
              </template>
              <template v-else>
                This project will belong to your team.
              </template>
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input
              v-model.trim="form.name"
              class="form-control"
              placeholder="e.g. My project"
              @input="onNameInput"
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Project slug</label>
            <input
              v-model.trim="form.slug"
              class="form-control font-monospace"
              placeholder="e.g. my-project"
              @input="onSlugInput"
            />
            <div class="form-text">
              Auto-filled from the name. Must be unique — if taken, the server appends <code>-1</code>, <code>-2</code>, …
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea v-model.trim="form.description" class="form-control" rows="4" placeholder="Optional"></textarea>
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
              Create Project
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
  slug: '',
  name: '',
  description: ''
});

const teams = ref([]);
const loadingTeams = ref(true);
const teamLocked = ref(false);
const saving = ref(false);
const message = ref('');
const ok = ref(false);
const slugTouched = ref(false);
const callerIsSuper = isSuperAdmin(userStore.user?.role);

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function onNameInput() {
  if (!slugTouched.value) {
    form.slug = slugify(form.name);
  }
}

function onSlugInput() {
  slugTouched.value = true;
  form.slug = slugify(form.slug);
}

onMounted(async () => {
  document.title = 'Add Project';
  try {
    const res = await api.get('teams', authHeaders());
    teams.value = Array.isArray(res.data) ? res.data : [];
    if (
      isTeamAdmin(userStore.user?.role) &&
      !callerIsSuper &&
      teams.value.length === 1
    ) {
      form.team_id = teams.value[0].id;
      teamLocked.value = true;
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
      'projects',
      {
        team_id: form.team_id,
        slug: form.slug || undefined,
        name: form.name,
        description: form.description || null
      },
      authHeaders()
    );

    ok.value = true;
    message.value = 'Project created.';
    const ref = created.data?.slug || created.data?.id;
    if (ref) {
      router.push({ name: 'adminProjectsEdit', params: { id: ref } });
    } else {
      router.push({ name: 'adminProjects' });
    }
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to create project.';
  } finally {
    saving.value = false;
  }
}
</script>
