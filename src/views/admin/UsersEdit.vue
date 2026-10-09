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
            <label class="form-label">Platform role</label>
            <select v-model="user.role" class="form-select">
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
            <div class="form-text">
              Super admin is account-wide. Admin vs User is set <strong>per team</strong> below
              (legacy platform Team admin stays in sync with memberships).
            </div>
          </div>
          <div v-else class="mb-3">
            <label class="form-label">Platform role</label>
            <input type="text" class="form-control" :value="roleLabel(user.role)" disabled />
            <div class="form-text">Super admin role cannot be re-assigned</div>
          </div>

          <div v-if="needsTeam" class="mb-3">
            <label class="form-label">Team memberships</label>
            <div v-if="awaitingFirstTeam" class="alert alert-info py-2 small">
              Approved Admin — no team yet. They create their own team on first sign-in, so there is
              nothing to assign here.
            </div>
            <div v-for="(row, idx) in user.teams" :key="idx" class="row g-2 align-items-center mb-2">
              <div class="col">
                <select v-model="row.team_id" class="form-select form-select-sm" :disabled="teamLocked">
                  <option value="">Select team…</option>
                  <option
                    v-for="option in availableTeamOptions(row.team_id)"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.text }}
                  </option>
                </select>
              </div>
              <div class="col-auto">
                <select v-model="row.role" class="form-select form-select-sm" :disabled="teamLocked">
                  <option value="team_admin">Admin</option>
                  <option value="member">User</option>
                </select>
              </div>
              <div class="col-auto">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  :disabled="teamLocked || (user.teams.length <= 1 && !awaitingFirstTeam)"
                  @click="user.teams.splice(idx, 1)"
                >
                  Remove
                </button>
              </div>
            </div>
            <button
              v-if="!teamLocked"
              type="button"
              class="btn btn-sm btn-outline-primary"
              :disabled="!unusedTeamOptions.length"
              @click="user.teams.push({ team_id: '', role: 'member' })"
            >
              Add team
            </button>
            <div class="form-text mt-2">
              Same person can be Admin on one team and User on another. Project access is on each project’s Members panel.
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
import { isSuperAdmin, isScopedTeamAdmin, roleLabel, USER_ROLES, TEAM_MEMBER_ROLES } from '@/utils/roles';
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
// An Admin approved from an access request who has not created their first team (ADR-028).
const awaitingFirstTeam = ref(false);

const roleOptions = ref([]);
const teamOptions = ref([]);
const message = ref('');
const isProtectedSuperAdmin = computed(() => isSuperAdmin(originalRole.value));
const callerIsSuper = computed(() => isSuperAdmin(userStore.user?.role));
const teamLocked = computed(() => isScopedTeamAdmin(userStore.user) && !callerIsSuper.value);

const needsTeam = computed(() => {
  if (isProtectedSuperAdmin.value) return false;
  return user.value?.role !== USER_ROLES.SUPER_ADMIN && user.value?.role !== 'admin';
});

const unusedTeamOptions = computed(() => {
  const used = new Set((user.value?.teams || []).map((t) => String(t.team_id)).filter(Boolean));
  return teamOptions.value.filter((o) => !used.has(String(o.value)));
});

function availableTeamOptions(currentId) {
  const used = new Set(
    (user.value?.teams || [])
      .map((t) => String(t.team_id))
      .filter((id) => id && id !== String(currentId || ''))
  );
  return teamOptions.value.filter((o) => !used.has(String(o.value)) || String(o.value) === String(currentId || ''));
}

function normalizeRoleOptions(data) {
  const roles = Array.isArray(data) ? data : [];
  return roles.map((r) => (
    typeof r === 'string'
      ? { text: roleLabel(r), value: r }
      : { text: roleLabel(r.value) || r.text, value: r.value }
  )).filter((r) => r.value);
}

function onAccountActiveChange(event) {
  if (isProtectedSuperAdmin.value) {
    event.target.checked = true;
    return;
  }
  user.value.status = event.target.checked ? 'active' : 'discontinued';
}

function snapshotUser(u) {
  return {
    ...u,
    teams: (u.teams || []).map((t) => ({ team_id: String(t.team_id || ''), role: t.role || TEAM_MEMBER_ROLES.MEMBER })),
  };
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

    let teams = Array.isArray(data.team_memberships)
      ? data.team_memberships.map((m) => ({
          team_id: String(m.team_id),
          role: m.role === TEAM_MEMBER_ROLES.TEAM_ADMIN
            ? TEAM_MEMBER_ROLES.TEAM_ADMIN
            : TEAM_MEMBER_ROLES.MEMBER,
        }))
      : (Array.isArray(data.team_ids) ? data.team_ids : []).map((id) => ({
          team_id: String(id),
          role: TEAM_MEMBER_ROLES.MEMBER,
        }));

    awaitingFirstTeam.value = !teams.length && !isSuperAdmin(data.role) && !!data.can_create_teams;
    if (!teams.length && !isSuperAdmin(data.role) && !awaitingFirstTeam.value) {
      teams = [{ team_id: '', role: TEAM_MEMBER_ROLES.MEMBER }];
    }

    user.value = {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      status: data.status || 'active',
      password: '',
      teams,
    };

    originalUser = snapshotUser(user.value);
    originalRole.value = data.role;

    watch(
      user,
      (newVal) => {
        const hasProfileChanges = JSON.stringify(snapshotUser(newVal)) !== JSON.stringify(originalUser);
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
    const teams = isSuperAdmin(role)
      ? []
      : (user.value.teams || [])
          .filter((t) => t.team_id)
          .map((t) => ({
            team_id: t.team_id,
            role: t.role === TEAM_MEMBER_ROLES.TEAM_ADMIN
              ? TEAM_MEMBER_ROLES.TEAM_ADMIN
              : TEAM_MEMBER_ROLES.MEMBER,
          }));

    if (!isSuperAdmin(role) && !teams.length && !awaitingFirstTeam.value) {
      messageIsError.value = true;
      message.value = 'At least one team membership is required.';
      return;
    }

    const updates = {
      id: user.value.id,
      original_email: originalUser.email,
      email: user.value.email,
      name: user.value.name,
      role,
      teams,
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
    originalUser = snapshotUser(user.value);

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
