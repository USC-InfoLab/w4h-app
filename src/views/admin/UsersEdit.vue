<template>
  <main v-if="user" role="main" class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/users">Users</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
          {{ user.email }} ({{ user.role }})
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

          <div v-if="!isAdminUser" class="mb-3">
            <label class="form-label">Projects</label>
            <select v-model="user.project_ids" class="form-select" multiple>
              <option v-for="option in projectOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
            <div class="form-text">Hold Cmd/Ctrl to select multiple projects.</div>
          </div>
          <div v-else class="mb-3">
            <label class="form-label">Projects</label>
            <input type="text" class="form-control" value="All Projects" disabled />
            <div class="form-text">Admin users have access to all projects.</div>
          </div>

          <div v-if="!isAdminUser" class="mb-3">
            <label class="form-label">Role</label>
            <select v-model="user.role" class="form-select">
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
          </div>
          <div v-else class="mb-3">
            <label class="form-label">Role</label>
            <input type="text" class="form-control" value="Admin" disabled />
            <div class="form-text">Admin role cannot be re-assigned</div>
          </div>
        </div>
      </div>

      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-3">Password</h5>

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

          <div class="form-text">Enter a new password to update</div>
          <div v-if="user.password && !isSecurePassword" class="text-danger small mt-2">
            ❗️ Password must be at least 12 characters and include uppercase,
            lowercase, number, and special character.
          </div>
        </div>
      </div>

      <div class="col-12">
        <div class="card p-3 border-secondary">
          <h5 class="card-title mb-2">Notebook API key</h5>
          <p class="text-muted small mb-2">
            Revokes static keys for Python notebooks for this user. They can create a new key from Profile settings.
          </p>
          <button type="button" class="btn btn-sm btn-outline-warning" @click="revokeTargetApiKeys">
            Revoke notebook API keys
          </button>
          <span v-if="apiKeyAdminMessage" class="small ms-2 text-muted">{{ apiKeyAdminMessage }}</span>
        </div>
      </div>

      <div v-if="message" class="col-12">
        <div class="alert alert-danger">{{ message }}</div>
      </div>

      <div class="d-flex justify-content-end mb-3">
        <button class="btn btn-primary" :disabled="!dirty || !isSecurePassword" @click="onSave">
          Save
        </button>
      </div>


      <div v-if="!isAdminUser" class="col-12">
        <div class="card border-danger p-3">
          <h5 class="text-danger">Danger Zone</h5>

          <p class="mt-2">
            Deleting is permanent. To confirm, type:
            <strong>{{ user.email }}</strong>
          </p>

          <input class="form-control mb-3" type="text" v-model="verifyCode" placeholder="Enter email" />

          <button class="btn btn-danger" :disabled="verifyCode !== user.email" @click="onDelete">
            Delete User
          </button>
        </div>
      </div>

    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';
import { api, authHeaders } from '../../utils/api';
import { validatePassword } from '@/utils/password-validator';

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

const verifyCode = ref('');
const dirty = ref(false);
const showPassword = ref(false);

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
const projectOptions = ref([]);
const message = ref('');
const apiKeyAdminMessage = ref('');
const isAdminUser = computed(() => originalRole.value === 'admin');

function onDelete() {
  if (isAdminUser.value) {
    message.value = 'Admin users cannot be deleted.';
    return;
  }
  api.delete('users/' + user.value.email, authHeaders()).then(() => {
    router.push('/admin/users');
  });
}

async function revokeTargetApiKeys() {
  apiKeyAdminMessage.value = '';
  try {
    const email = user.value?.email;
    if (!email) return;
    await api.delete(`users/user/${encodeURIComponent(email)}/api-keys`, authHeaders());
    apiKeyAdminMessage.value = 'Revoked.';
  } catch (e) {
    apiKeyAdminMessage.value = e.response?.data?.error || e.message || 'Failed';
  }
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

    user.value = {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      password: '',
      project_ids: Array.isArray(data.project_ids) ? data.project_ids : [],
    };

    originalUser = { ...user.value };
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

    const projectsRes = await api.get('projects', authHeaders());
    projectOptions.value = projectsRes.data.map((p) => ({ text: p.name, value: p.id }));

    const roles = await api.get('users/roles', authHeaders());
    roleOptions.value = roles.data.map((r) => ({ text: r, value: r }));
    roleOptions.value = [{ text: 'Select role', value: null }, ...roleOptions.value];
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to load user.';
  }
});

async function onSave() {
  try {
    if (!user.value || !originalUser) {
      message.value = 'User is not loaded yet.';
      return;
    }

    message.value = '';

    const updates = {
      id: user.value.id,
      original_email: originalUser.email,
      email: user.value.email,
      name: user.value.name,
      role: isAdminUser.value ? 'admin' : user.value.role,
      project_ids: isAdminUser.value ? [] : user.value.project_ids,
      ...(user.value.password ? { password: user.value.password } : {})
    };

    await api.post('users/set', { user: updates }, authHeaders());
    user.value.password = '';
    originalUser = { ...user.value };

    dirty.value = false;
  } catch (error) {
    message.value = error.message;
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
