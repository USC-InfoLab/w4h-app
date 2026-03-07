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

      <!-- Profile -->
      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-3">Profile</h5>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model="user.name" type="text" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Studies</label>
            <select v-if="!isAdminUser" v-model="user.study_ids" class="form-select" multiple>
              <option v-for="option in studyOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
            <div v-if="!isAdminUser" class="form-text">Hold Cmd/Ctrl to select multiple studies.</div>
            <div v-else class="form-text">Admins are automatically assigned to all studies.</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Role</label>
            <select v-model="user.role" class="form-select" :disabled="isAdminUser">
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
            <div v-if="isAdminUser" class="form-text">Admin role is locked.</div>
          </div>
        </div>
      </div>

      <!-- Password -->
      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <!-- <h5 class="card-title mb-3">Password</h5> -->

          <div class="mb-2">
            <label class="form-label">Password</label>
            <input v-model="user.password" type="text" class="form-control" autocomplete="new-password" />
          </div>

          <div class="form-text">Enter a new password to update</div>
          <div v-if="user.password && !isSecurePassword" class="text-danger small mt-2">
            ❗️ Password must be at least 12 characters and include uppercase,
            lowercase, number, and special character.
          </div>
        </div>
      </div>

      <!-- Error -->
      <div v-if="message" class="col-12">
        <div class="alert alert-danger">{{ message }}</div>
      </div>

      <!-- Save Button -->
      <div class="d-flex justify-content-end mb-3">
        <button class="btn btn-primary" :disabled="!dirty || !isSecurePassword" @click="onSave">
          Save
        </button>
      </div>


      <!-- Danger Zone -->
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
// import ToastComponent from './Toast.vue';

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

//const showToast = ref(false);

const verifyCode = ref('');
const dirty = ref(false);

const user = ref(null);
let originalUser = null;
const originalRole = ref('');

const roleOptions = ref([]);
const studyOptions = ref([]);
const message = ref('');
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
      study_ids: Array.isArray(data.study_ids) ? data.study_ids : [],
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

    const studies = await api.get('datasets/studies', authHeaders());
    studyOptions.value = studies.data.map(s => ({ text: s.name, value: s.id }));

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
      study_ids: isAdminUser.value ? [] : user.value.study_ids,
      ...(user.value.password ? { password: user.value.password } : {})
    };

    await api.post('users/set', { user: updates }, authHeaders());
    user.value.password = '';  //in case we changed it
    originalUser = { ...user.value };

    dirty.value = false;
  } catch (error) {
    message.value = error.message;
  }
}

const isSecurePassword = computed(() => {
  const password = user.value?.password;
  if (!password) {
    return true; // Empty password is ok
  }
  return validatePassword(password);
});
</script>
