<template>
  <main class="container-fluid text-start">
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <nav aria-label="breadcrumb" class="mb-3">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">
              <router-link to="/admin/projects">Projects</router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">Add project</li>
          </ol>
        </nav>

        <div class="card p-3">
          <h5 class="card-title mb-3">New Project</h5>

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
            <div class="form-label mb-1">Project slug</div>
            <div class="font-monospace text-break user-select-all">{{ form.slug || '—' }}</div>
            <div class="form-text">
              Taken from the name. An existing project, including an archived one, keeps its slug, so this one becomes <code>-1</code>, <code>-2</code>, and so on.
            </div>
          </div>

          <div v-if="callerIsSuper" class="mb-3">
            <div class="form-check">
              <input
                id="demo-project"
                v-model="form.is_demonstration"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label" for="demo-project">
                Demonstration project
              </label>
            </div>
            <div class="form-text">
              Links every <strong>read-only sample</strong> dataset Super admin has marked.
              People query those tables; they do not re-ingest them.
              Mark sample catalogs on the dataset edit screen first.
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Copy members from (optional)</label>
            <select
              v-model="form.seed_from_project_id"
              class="form-select"
              :disabled="needsNewTeam"
            >
              <option value="">Start with me only</option>
              <option v-for="p in seedProjectOptions" :key="p.id" :value="p.id">
                {{ p.name }}{{ p.team_name ? ` · ${p.team_name}` : '' }}
              </option>
            </select>
            <div class="form-text">
              One-time copy of that project's roster onto this project. Later joins are per-project — they are not kept in sync.
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Owning team</label>
            <select
              v-model="form.team_id"
              class="form-select"
              :disabled="loadingTeams"
            >
              <option value="" disabled>Select a team…</option>
              <option v-for="t in teams" :key="t.id" :value="t.id">
                {{ t.name }}{{ t.slug ? ` (${t.slug})` : '' }}
              </option>
              <option v-if="canCreateTeam" :value="NEW_TEAM">
                New team (same name as this project)
              </option>
            </select>
            <div class="form-text">
              <template v-if="callerIsSuper">
                Choose which team owns this project. Super admins can create projects for any team.
              </template>
              <template v-else-if="needsNewTeam">
                <template v-if="form.name">
                  Creates a team named <strong>{{ form.name }}</strong>. You become its Admin.
                </template>
                <template v-else>
                  Name the project first — the new team uses the same name.
                </template>
              </template>
              <template v-else>
                Attach this project to an existing team, or create a new one named after it.
              </template>
            </div>
          </div>

          <div v-if="message" class="alert" :class="ok ? 'alert-success' : 'alert-danger'">
            {{ message }}
          </div>

          <div class="d-flex justify-content-end">
            <button
              class="btn btn-primary"
              :disabled="saving || !canSubmit"
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
import { onMounted, reactive, ref, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { useUIStore } from '@/stores/ui';
import { isSuperAdmin } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';

const NEW_TEAM = '__new__';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const uiStore = useUIStore();
const { loadProjects, setActiveTeam, setActiveProject } = useTeamContext();

const form = reactive({
  team_id: '',
  slug: '',
  name: '',
  description: '',
  seed_from_project_id: '',
  is_demonstration: false
});

const teams = ref([]);
const seedProjects = ref([]);
const takenSlugs = ref(new Set());
const seedProjectOptions = computed(() => {
  const tid = form.team_id;
  const rows = seedProjects.value;
  if (!tid || tid === NEW_TEAM) return [];
  return rows.filter((p) => String(p.team_id) === String(tid));
});
const loadingTeams = ref(true);
const saving = ref(false);
const message = ref('');
const ok = ref(false);
const callerIsSuper = isSuperAdmin(userStore.user?.role);
const canCreateTeam = computed(
  () => !callerIsSuper && !!userStore.user?.caps?.can_create_teams
);
const needsNewTeam = computed(() => form.team_id === NEW_TEAM);
const canSubmit = computed(() => {
  if (!form.name) return false;
  if (needsNewTeam.value) return canCreateTeam.value;
  return !!form.team_id;
});

watch(
  () => form.team_id,
  () => {
    if (!form.seed_from_project_id) return;
    const stillValid = seedProjectOptions.value.some(
      (p) => String(p.id) === String(form.seed_from_project_id)
    );
    if (!stillValid) form.seed_from_project_id = '';
  }
);

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function uniqueSlug(name) {
  const base = slugify(name);
  if (!base) return '';
  const taken = takenSlugs.value;
  if (!taken.has(base)) return base;
  let i = 1;
  while (taken.has(`${base}-${i}`)) i += 1;
  return `${base}-${i}`;
}

function applyAutoSlug() {
  form.slug = uniqueSlug(form.name);
}

function onNameInput() {
  applyAutoSlug();
}

onMounted(async () => {
  document.title = 'Add Project';
  try {
    const [teamsRes, projectsRes] = await Promise.all([
      api.get('teams', authHeaders()),
      api.get('projects', { ...authHeaders(), params: { status: 'all' } }).catch(() => ({ data: [] })),
    ]);
    teams.value = Array.isArray(teamsRes.data) ? teamsRes.data : [];
    const projects = Array.isArray(projectsRes.data) ? projectsRes.data : [];
    seedProjects.value = projects.filter((p) => p.status !== 'archived');
    takenSlugs.value = new Set(
      projects.map((p) => String(p.slug || '').trim()).filter(Boolean)
    );
    applyAutoSlug();
    const fromQuery = route.query.team_id ? String(route.query.team_id) : '';
    const preferred = uiStore.activeTeamId ? String(uiStore.activeTeamId) : '';
    if (fromQuery && teams.value.some((t) => String(t.id) === fromQuery)) {
      form.team_id = fromQuery;
    } else if (preferred && teams.value.some((t) => String(t.id) === preferred)) {
      form.team_id = preferred;
    } else if (teams.value.length) {
      form.team_id = teams.value[0].id;
    } else if (canCreateTeam.value) {
      form.team_id = NEW_TEAM;
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
    let teamId = form.team_id;
    if (needsNewTeam.value) {
      const teamRes = await api.post('teams', { name: form.name }, authHeaders());
      teamId = teamRes.data?.id;
      if (!teamId) {
        throw new Error('Team was created but no id was returned.');
      }
      const session = await api.get('users/me/session', authHeaders());
      await userStore.setUser({ ...userStore.user, ...session.data });
      setActiveTeam(teamId);
    }

    const created = await api.post(
      'projects',
      {
        team_id: teamId,
        slug: form.slug || undefined,
        name: form.name,
        description: form.description || null,
        seed_from_project_id: form.seed_from_project_id || undefined,
        is_demonstration: callerIsSuper ? !!form.is_demonstration : undefined
      },
      authHeaders()
    );

    ok.value = true;
    message.value = 'Project created.';
    await loadProjects();
    const createdId = created.data?.id;
    if (createdId) setActiveProject(createdId);
    const ref = created.data?.slug || createdId;
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
