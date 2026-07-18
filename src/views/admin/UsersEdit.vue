<template>
  <main v-if="user" role="main" class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/users">Users</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
          {{ user.email }} ({{ roleLabel(user.role) }})
        </li>
      </ol>
    </nav>

    <div class="row gy-3">

      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-3">Profile</h5>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model="user.name" type="text" class="form-control" />
          </div>

          <div v-if="!isProtectedSuperAdmin" class="mb-3">
            <label class="form-label">Role</label>
            <select v-model="user.role" class="form-select">
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
          </div>
          <div v-else class="mb-3">
            <label class="form-label">Role</label>
            <input type="text" class="form-control" :value="roleLabel(user.role)" disabled />
            <div class="form-text">Super admin role cannot be re-assigned</div>
          </div>

          <div v-if="needsTeam" class="mb-3">
            <label class="form-label">Team(s)</label>
            <select
              v-model="user.team_ids"
              class="form-select"
              multiple
              :disabled="teamLocked"
            >
              <option v-for="option in teamOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
            <div class="form-text">
              Team membership. Project access is assigned on each project’s Members panel.
            </div>
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
          <h5 class="card-title mb-3">Account</h5>

          <div v-if="!isProtectedSuperAdmin && user.status !== 'invited'" class="mb-3">
            <div class="d-flex align-items-center justify-content-between gap-3">
              <div>
                <div class="fw-semibold">
                  {{ user.status === 'discontinued' ? 'Paused' : 'Active' }}
                </div>
                <div class="form-text mb-0">
                  {{ user.status === 'discontinued'
                    ? 'Login and API access will stay suspended until you save with Active on.'
                    : 'Turn off to pause access (kept on Save). Memberships and history are preserved.' }}
                </div>
              </div>
              <div class="form-check form-switch m-0">
                <input
                  id="account-active-switch"
                  class="form-check-input"
                  type="checkbox"
                  role="switch"
                  :checked="user.status !== 'discontinued'"
                  @change="onAccountActiveChange"
                />
                <label class="form-check-label visually-hidden" for="account-active-switch">
                  Account active
                </label>
              </div>
            </div>
          </div>

          <div v-else-if="isProtectedSuperAdmin" class="mb-3">
            <span class="badge text-bg-success">active</span>
            <div class="form-text mt-1 mb-0">Super admin accounts stay active.</div>
          </div>

          <div v-if="user.status === 'invited'" class="mb-3">
            <span class="badge text-bg-warning">invited</span>
            <p class="small text-muted mt-2 mb-2">
              Waiting for the invitee to set a password. You can resend or revoke the invitation.
            </p>
            <div class="d-flex flex-wrap gap-2">
              <button type="button" class="btn btn-sm btn-outline-primary" :disabled="inviteBusy" @click="onResendInvite">
                Resend invitation
              </button>
              <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="inviteBusy" @click="onRevokeInvite">
                Revoke invitation
              </button>
            </div>
            <div v-if="inviteUrl" class="mt-2">
              <div class="small text-muted mb-1">Latest invitation link:</div>
              <code class="small user-select-all">{{ inviteUrl }}</code>
            </div>
          </div>

          <div class="mb-2">
            <label class="form-label">Password</label>
            <div class="position-relative">
              <input :type="showPassword ? 'text' : 'password'" v-model="user.password" class="form-control"
                autocomplete="new-password" />
              <button type="button" class="btn-eye-toggle" @click="showPassword = !showPassword" tabindex="-1">
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
            <div class="mt-1">
              <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none" @click="suggestPassword">
                <i class="bi bi-key me-1"></i>Suggest password
              </button>
            </div>
          </div>

          <div class="form-text">
            {{ user.status === 'invited'
              ? 'Optional escape hatch: setting a password here activates the account without the invite link.'
              : 'Enter a new password to update' }}
          </div>
          <div v-if="user.password && !isSecurePassword" class="text-danger small mt-2">
            ❗️ Password must be at least 12 characters and include uppercase,
            lowercase, number, and special character.
          </div>
        </div>
      </div>

      <div v-if="message" class="col-12">
        <div class="alert" :class="messageIsError ? 'alert-danger' : 'alert-success'">{{ message }}</div>
      </div>

      <div class="d-flex justify-content-end mb-3">
        <button class="btn btn-primary" :disabled="!dirty || !isSecurePassword || saving" @click="onSave">
          <span v-if="saving" class="spinner-border spinner-border-sm me-2"></span>
          Save
        </button>
      </div>

    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { api, authHeaders } from '../../utils/api';
import { validatePassword } from '@/utils/password-validator';
import { isSuperAdmin, isTeamAdmin, roleLabel, USER_ROLES } from '@/utils/roles';
import { useUserStore } from '@/stores/user';

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();
const userStore = useUserStore();

const dirty = ref(false);
const saving = ref(false);
const showPassword = ref(false);
const inviteBusy = ref(false);
const inviteUrl = ref('');
const messageIsError = ref(true);

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
  user.value.password = pw.join('');
  showPassword.value = true;
}

const user = ref(null);
let originalUser = null;
const originalRole = ref('');

const roleOptions = ref([]);
const teamOptions = ref([]);
const message = ref('');
const isProtectedSuperAdmin = computed(() => isSuperAdmin(originalRole.value));
const callerIsSuper = computed(() => isSuperAdmin(userStore.user?.role));
const teamLocked = computed(() => isTeamAdmin(userStore.user?.role) && !callerIsSuper.value);

const needsTeam = computed(() => {
  if (isProtectedSuperAdmin.value) return false;
  return user.value?.role !== USER_ROLES.SUPER_ADMIN && user.value?.role !== 'admin';
});

function normalizeRoleOptions(data) {
  const roles = Array.isArray(data) ? data : [];
  return roles.map((r) => (
    typeof r === 'string'
      ? { text: roleLabel(r), value: r }
      : { text: r.text || roleLabel(r.value), value: r.value }
  )).filter((r) => r.value);
}

function onAccountActiveChange(event) {
  if (isProtectedSuperAdmin.value) {
    event.target.checked = true;
    return;
  }
  user.value.status = event.target.checked ? 'active' : 'discontinued';
}

onMounted(async () => {
  try {
    const routeEmail = Array.isArray(route.params.email) ? route.params.email[0] : route.params.email;
    const normalizedEmail = decodeURIComponent(routeEmail || '');
    const data = (await api.get('users/user/' + encodeURIComponent(normalizedEmail), authHeaders())).data;

    if (!data) {
      message.value = 'User not found.';
      router.push('/admin/users');
      return;
    }

    const teamIds = Array.isArray(data.team_ids) ? data.team_ids.map(String) : [];

    user.value = {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      status: data.status || 'active',
      password: '',
      team_ids: teamIds,
    };

    originalUser = { ...user.value, team_ids: [...teamIds] };
    originalRole.value = data.role;

    watch(
      user,
      (newVal) => {
        const hasProfileChanges = JSON.stringify(newVal) !== JSON.stringify(originalUser);
        const hasPasswordEntry = user.value.password && user.value.password.length > 0;
        dirty.value = hasProfileChanges || hasPasswordEntry;
      },
      { deep: true }
    );

    const [teamsRes, rolesRes] = await Promise.all([
      api.get('teams', authHeaders()),
      api.get('users/roles', authHeaders())
    ]);
    teamOptions.value = (Array.isArray(teamsRes.data) ? teamsRes.data : []).map((t) => ({
      text: t.name,
      value: String(t.id)
    }));
    roleOptions.value = normalizeRoleOptions(rolesRes.data);
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to load user.';
  }
});

async function onSave() {
  if (!user.value || !originalUser) {
    messageIsError.value = true;
    message.value = 'User is not loaded yet.';
    return;
  }

  saving.value = true;
  message.value = '';

  try {
    const role = isProtectedSuperAdmin.value ? originalRole.value : user.value.role;
    const updates = {
      id: user.value.id,
      original_email: originalUser.email,
      email: user.value.email,
      name: user.value.name,
      role,
      team_ids: isSuperAdmin(role) ? [] : (user.value.team_ids || []),
      ...(user.value.password ? { password: user.value.password } : {})
    };

    await api.post('users/set', { user: updates }, authHeaders());
    if (user.value.password) {
      user.value.status = 'active';
    }

    const wasDiscontinued = originalUser.status === 'discontinued';
    const wantDiscontinued = user.value.status === 'discontinued';
    if (!isProtectedSuperAdmin.value && wasDiscontinued !== wantDiscontinued) {
      const endpoint = wantDiscontinued ? 'users/discontinue' : 'users/resume';
      const { data } = await api.post(endpoint, { user_id: user.value.id }, authHeaders());
      user.value.status = data?.status || (wantDiscontinued ? 'discontinued' : 'active');
    }

    user.value.password = '';
    originalUser = {
      ...user.value,
      team_ids: [...(user.value.team_ids || [])]
    };

    dirty.value = false;
    messageIsError.value = false;
    message.value = 'User saved.';
  } catch (error) {
    messageIsError.value = true;
    message.value = error.response?.data?.error || error.message;
  } finally {
    saving.value = false;
  }
}

async function onResendInvite() {
  inviteBusy.value = true;
  inviteUrl.value = '';
  message.value = '';
  try {
    const { data } = await api.post('users/invite/resend', { user_id: user.value.id }, authHeaders());
    inviteUrl.value = data?.inviteUrl || '';
    messageIsError.value = !!data?.mailWarning;
    message.value = data?.mailWarning
      ? `Invitation recreated, but email may not have been sent: ${data.mailWarning}`
      : 'Invitation resent.';
  } catch (error) {
    messageIsError.value = true;
    message.value = error.response?.data?.error || error.message;
  } finally {
    inviteBusy.value = false;
  }
}

async function onRevokeInvite() {
  inviteBusy.value = true;
  inviteUrl.value = '';
  message.value = '';
  try {
    await api.post('users/invite/revoke', { user_id: user.value.id }, authHeaders());
    messageIsError.value = false;
    message.value = 'Invitation revoked. The previous link will no longer work.';
  } catch (error) {
    messageIsError.value = true;
    message.value = error.response?.data?.error || error.message;
  } finally {
    inviteBusy.value = false;
  }
}

const isSecurePassword = computed(() => {
  const password = user.value?.password;
  if (!password) {
    return true;
  }
  return validatePassword(password);
});

</script>

<style scoped>
.btn-eye-toggle {
  position: absolute;
  right: 10px;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  background: none;
  border: none;
  color: #888;
  cursor: pointer;
  padding: 0;
  font-size: 16px;
  z-index: 3;
}

.btn-eye-toggle:hover {
  color: inherit;
}
</style>
