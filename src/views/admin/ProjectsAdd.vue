<template>
  <main class="container-fluid text-start">
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <div class="card p-3">
          <h5 class="card-title mb-3">Add project</h5>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input
              v-model.trim="form.name"
              class="form-control"
              placeholder="e.g. My project"
              @input="onNameInput"
            />
            <div v-if="form.slug" class="form-text">
              Slug <span class="font-monospace user-select-all">{{ form.slug }}</span>
              <span class="text-muted">
                — if that name is already used, including on an archived project, this becomes <code>-1</code>, <code>-2</code>, and so on.
              </span>
            </div>
            <div v-else class="form-text">
              The slug is taken from the name. If that name is already used, including on an archived project, this becomes <code>-1</code>, <code>-2</code>, and so on.
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
              Create project
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';
import { useTeamContext } from '@/composables/useTeamContext';

const NEW_TEAM = '__new__';

const router = useRouter();
const userStore = useUserStore();
const { loadProjects, setActiveTeam, setActiveProject } = useTeamContext();

const form = reactive({
  team_id: '',
  slug: '',
  name: '',
  description: '',
  is_demonstration: false
});

const teams = ref([]);
const takenSlugs = ref(new Set());
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
  document.title = 'Add project';
  try {
    const [teamsRes, projectsRes] = await Promise.all([
      api.get('teams', authHeaders()),
      api.get('projects', { ...authHeaders(), params: { status: 'all' } }).catch(() => ({ data: [] })),
    ]);
    teams.value = Array.isArray(teamsRes.data) ? teamsRes.data : [];
    const projects = Array.isArray(projectsRes.data) ? projectsRes.data : [];
    takenSlugs.value = new Set(
      projects.map((p) => String(p.slug || '').trim()).filter(Boolean)
    );
    applyAutoSlug();
    form.team_id = '';
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
