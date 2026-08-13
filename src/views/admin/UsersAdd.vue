<template>
  <main v-if="form" role="main" class="container-fluid">

    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/users">Users</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
          Invite User
        </li>
      </ol>
    </nav>

    <p class="text-muted mb-3">
      <template v-if="callerIsSuper">
        Super admins can invite Project admins and Users (and other Super admins).
        Project admin vs User is stored <strong>per team</strong> — choose the invite role and team below.
        If the email already belongs to an account, they are added to that team instead of creating a duplicate.
      </template>
      <template v-else>
        Project admins can invite Users to their own team.
        If the email already belongs to someone on one of your teams, they are added to the selected team.
        Project membership is assigned later from the project edit screen.
      </template>
      The invitee receives a time-limited link to set their own password — credentials are never emailed.
    </p>

    <form class="row gy-3" @submit.prevent="onSave">

      <div class="col-12 col-md-8 col-lg-6">
        <div class="card p-3">
          <h5 class="card-title mb-3">Profile</h5>

          <div class="mb-3">
            <label class="form-label">Email</label>
            <input v-model="form.email" type="email" class="form-control" autocomplete="username" />
            <div v-if="form.email && !isValidEmail" class="text-danger small mt-1">
              Invalid email format
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model="form.name" type="text" class="form-control" autocomplete="name" />
            <div class="form-text">Optional — the invitee can set or change this when activating.</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Role</label>
            <select v-model="form.role" class="form-select" :disabled="roleOptions.length <= 1">
              <option v-if="roleOptions.length !== 1" :value="null">Select role</option>
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
          </div>

          <div v-if="needsTeam" class="mb-3">
            <label class="form-label">Team</label>
            <select
              v-model="form.team_id"
              class="form-select"
              :disabled="teamLocked"
            >
              <option v-if="!teamLocked" :value="null">Select team</option>
              <option v-for="option in teamOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
            <div v-if="!teamOptions.length" class="form-text text-warning">
              No teams available.
              <router-link v-if="callerIsSuper" :to="{ name: 'adminTeamsAdd' }">Create a team</router-link>
              <span v-else> Ask a Super admin to assign you to a team.</span>
            </div>
            <div v-else-if="teamLocked" class="form-text">Team is fixed to your membership.</div>
          </div>

          <div v-else class="mb-3">
            <label class="form-label">Team</label>
            <input type="text" class="form-control" value="None (platform-wide)" disabled />
            <div class="form-text">Super admins are not required to belong to a team.</div>
          </div>
        </div>
      </div>

      <div v-if="submitMessage" class="col-12">
        <div class="alert" :class="submitted ? 'alert-success' : 'alert-danger'">
          <div>{{ submitMessage }}</div>
          <div v-if="inviteUrl" class="mt-2">
            <div class="small text-muted mb-1">Invitation link (share only if email delivery failed):</div>
            <code class="small user-select-all">{{ inviteUrl }}</code>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-end mb-3">
        <button
          v-if="!submitted"
          class="btn btn-primary"
          :disabled="!canSubmit || sending"
          type="submit"
        >
          <span v-if="sending" class="spinner-border spinner-border-sm me-2"></span>
          Send Invite
        </button>

        <button v-else class="btn btn-secondary" type="button" @click="onReset">
          Invite another
        </button>
      </div>

    </form>
  </main>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '../../utils/api';
import { APP_NAME } from '@/utils/defs';
import { isSuperAdmin, isTeamAdmin, USER_ROLES, roleLabel } from '@/utils/roles';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const userStore = useUserStore();
const { user: currentUser } = storeToRefs(userStore);

const form = ref({
  email: '',
  name: '',
  role: null,
  team_id: null,
});

const roleOptions = ref([]);
const teamOptions = ref([]);
const submitMessage = ref('');
const inviteUrl = ref('');
const submitted = ref(false);
const sending = ref(false);

const callerIsSuper = computed(() => isSuperAdmin(currentUser.value?.role));
const callerIsTeam = computed(() => isTeamAdmin(currentUser.value?.role));

const needsTeam = computed(() => form.value.role && form.value.role !== USER_ROLES.SUPER_ADMIN);
const teamLocked = computed(() => callerIsTeam.value && !callerIsSuper.value);

const isValidEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email));

const canSubmit = computed(() => {
  if (!form.value.email || !isValidEmail.value) return false;
  if (!form.value.role) return false;
  if (needsTeam.value && !form.value.team_id) return false;
  return true;
});

watch(
  () => form.value.role,
  (role) => {
    if (role === USER_ROLES.SUPER_ADMIN) {
      form.value.team_id = null;
    } else if (teamLocked.value && teamOptions.value.length === 1) {
      form.value.team_id = teamOptions.value[0].value;
    }
  }
);

async function onReset() {
  const lockedTeam = teamLocked.value && teamOptions.value[0] ? teamOptions.value[0].value : null;
  const defaultRole = roleOptions.value.length === 1 ? roleOptions.value[0].value : null;
  form.value = {
    email: '',
    name: '',
    role: defaultRole,
    team_id: lockedTeam,
  };
  submitMessage.value = '';
  inviteUrl.value = '';
  submitted.value = false;
}

async function onSave() {
  sending.value = true;
  submitMessage.value = '';
  inviteUrl.value = '';
  try {
    const payload = {
      email: form.value.email,
      name: form.value.name,
      role: form.value.role,
      teams: form.value.team_id
        ? [{
            team_id: form.value.team_id,
            role: form.value.role === 'team_admin' ? 'team_admin' : 'member',
          }]
        : [],
    };

    const response = await api.post('users/add', { user: payload }, authHeaders());

    if (response.status === 201) {
      inviteUrl.value = response.data?.inviteUrl || '';
      if (response.data?.mailWarning) {
        submitMessage.value = `Invitation created, but email may not have been sent: ${response.data.mailWarning}`;
      } else {
        submitMessage.value = `Invitation sent to ${form.value.email}. They will set their own password via the link.`;
      }
      submitted.value = true;
    } else {
      submitMessage.value = 'Unexpected response';
    }
  } catch (error) {
    // Existing account: attach to the selected team instead of failing the invite flow.
    if (error.response?.status === 409 && form.value.team_id) {
      try {
        await api.post(
          `teams/${form.value.team_id}/members`,
          {
            email: form.value.email,
            role: form.value.role === 'team_admin' ? 'team_admin' : 'member',
          },
          authHeaders()
        );
        submitMessage.value =
          `A user with email ${form.value.email} already exists — they were added to the selected team ` +
          `as ${form.value.role === 'team_admin' ? 'Project admin' : 'User'}.`;
        submitted.value = true;
        return;
      } catch (addError) {
        submitMessage.value =
          addError.response?.data?.error
          || error.response?.data?.error
          || `A user with email ${form.value.email} already exists`;
        return;
      }
    }

    submitMessage.value =
      error.response?.status === 409
        ? (error.response?.data?.error || `A user with email ${form.value.email} already exists`)
        : (error.response?.data?.error || `Failed to invite user: ${error}`);

  } finally {
    sending.value = false;
  }
}

onMounted(async () => {
  document.title = `${APP_NAME} Invite User`;

  try {
    const rolesRes = await api.get('users/roles', authHeaders());
    const roles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
    roleOptions.value = roles.map(r => (
      typeof r === 'string'
        ? { text: roleLabel(r), value: r }
        : { text: roleLabel(r.value) || r.text || r.value, value: r.value }
    ));
  } catch (e) {
    console.error(e);
    roleOptions.value = [];
  }

  try {
    const teamsRes = await api.get('teams', authHeaders());
    const teams = Array.isArray(teamsRes.data) ? teamsRes.data : [];
    teamOptions.value = teams.map(t => ({ text: t.name, value: t.id }));
  } catch (e) {
    console.error(e);
    teamOptions.value = [];
  }

  const qRole = route.query.role;
  if (qRole && roleOptions.value.some(r => r.value === qRole)) {
    form.value.role = qRole;
  } else if (roleOptions.value.length === 1) {
    form.value.role = roleOptions.value[0].value;
  }

  const qTeam = route.query.team_id;
  if (qTeam && teamOptions.value.some(t => t.value === qTeam)) {
    form.value.team_id = qTeam;
  } else if (teamLocked.value && teamOptions.value.length) {
    form.value.team_id = teamOptions.value[0].value;
  } else if (currentUser.value?.team_id && teamOptions.value.some(t => t.value === currentUser.value.team_id)) {
    form.value.team_id = currentUser.value.team_id;
  }
});
</script>
