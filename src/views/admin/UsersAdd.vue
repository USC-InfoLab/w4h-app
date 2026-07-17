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
        Super admins can create Team admins and Project users (and other Super admins).
        Assign a team for Team admin and Project user roles.
      </template>
      <template v-else>
        Team admins can invite Project users to their own team.
        Project membership is assigned later from the project edit screen.
      </template>
    </p>

    <form class="row gy-3" @submit.prevent="onSave">

      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
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

      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-3">Temporary password</h5>

          <div class="mb-2">
            <label class="form-label">Password</label>
            <div class="input-group">
              <input
                :type="showPassword ? 'text' : 'password'"
                v-model="form.password"
                class="form-control"
                autocomplete="new-password"
              />
              <button
                type="button"
                class="btn btn-outline-secondary"
                @click="showPassword = !showPassword"
                tabindex="-1"
              >
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
            <div class="mt-1">
              <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none" @click="suggestPassword">
                <i class="bi bi-key me-1"></i>Suggest password
              </button>
            </div>
          </div>

          <div class="form-text">{{ PASSWORD_REQUIREMENTS }}</div>
          <div v-if="form.password && !isSecurePassword" class="text-danger small mt-2">
            {{ PASSWORD_REQUIREMENTS }}
          </div>
          <div class="form-text mt-2">
            Share credentials securely. If SMTP is configured, an invitation email is sent automatically.
          </div>
        </div>
      </div>

      <div v-if="submitMessage" class="col-12">
        <div class="alert" :class="submitted ? 'alert-success' : 'alert-danger'">
          {{ submitMessage }}
        </div>
      </div>

      <div class="d-flex justify-content-end mb-3">
        <button
          v-if="!submitted"
          class="btn btn-primary"
          :disabled="!canSubmit"
          type="submit"
        >
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
import { validatePassword, PASSWORD_REQUIREMENTS } from '@/utils/password-validator';
import { APP_NAME } from '@/utils/defs';
import { isSuperAdmin, isTeamAdmin, USER_ROLES } from '@/utils/roles';
import { useUserStore } from '@/stores/user';

const route = useRoute();
const userStore = useUserStore();
const { user: currentUser } = storeToRefs(userStore);

const form = ref({
  email: '',
  name: '',
  role: null,
  team_id: null,
  password: '',
});

const roleOptions = ref([]);
const teamOptions = ref([]);
const submitMessage = ref('');
const submitted = ref(false);
const showPassword = ref(false);

const callerIsSuper = computed(() => isSuperAdmin(currentUser.value?.role));
const callerIsTeam = computed(() => isTeamAdmin(currentUser.value?.role));

const needsTeam = computed(() => form.value.role && form.value.role !== USER_ROLES.SUPER_ADMIN);
const teamLocked = computed(() => callerIsTeam.value && !callerIsSuper.value);

const isSecurePassword = computed(() => validatePassword(form.value.password));
const isValidEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email));

const canSubmit = computed(() => {
  if (!form.value.email || !isValidEmail.value) return false;
  if (!form.value.role) return false;
  if (!form.value.password || !isSecurePassword.value) return false;
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

function suggestPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '@$!%*?&#^_+-';
  const all = upper + lower + digits + special;
  const arr = new Uint32Array(16);
  crypto.getRandomValues(arr);
  let pw = [
    upper[arr[0] % upper.length],
    lower[arr[1] % lower.length],
    digits[arr[2] % digits.length],
    special[arr[3] % special.length],
  ];
  for (let i = 4; i < arr.length; i++) pw.push(all[arr[i] % all.length]);
  for (let i = pw.length - 1; i > 0; i--) {
    const j = arr[i % arr.length] % (i + 1);
    [pw[i], pw[j]] = [pw[j], pw[i]];
  }
  form.value.password = pw.join('');
  showPassword.value = true;
}

async function onReset() {
  const lockedTeam = teamLocked.value && teamOptions.value[0] ? teamOptions.value[0].value : null;
  const defaultRole = roleOptions.value.length === 1 ? roleOptions.value[0].value : null;
  form.value = {
    email: '',
    name: '',
    role: defaultRole,
    team_id: lockedTeam,
    password: '',
  };
  submitMessage.value = '';
  submitted.value = false;
}

async function onSave() {
  try {
    const payload = {
      email: form.value.email,
      name: form.value.name,
      role: form.value.role,
      password: form.value.password,
      team_ids: form.value.team_id ? [form.value.team_id] : [],
    };

    const response = await api.post('users/add', { user: payload }, authHeaders());

    submitMessage.value =
      response.status === 201
        ? (response.data?.mailWarning || 'User invited successfully')
        : 'Unexpected response';

    submitted.value = true;
  } catch (error) {
    submitMessage.value =
      error.response?.status === 409
        ? `User ${form.value.email} already exists`
        : (error.response?.data?.error || `Failed to add user: ${error}`);
  }
}

onMounted(async () => {
  document.title = `${APP_NAME} Invite User`;

  try {
    const rolesRes = await api.get('users/roles', authHeaders());
    const roles = Array.isArray(rolesRes.data) ? rolesRes.data : [];
    roleOptions.value = roles.map(r => (
      typeof r === 'string'
        ? { text: r, value: r }
        : { text: r.text || r.value, value: r.value }
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
