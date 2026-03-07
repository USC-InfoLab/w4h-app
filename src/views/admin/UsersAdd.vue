<template>
  <main v-if="user" role="main" class="container-fluid">

    <!-- Breadcrumb -->
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/users">Users</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">
          Add User
        </li>
      </ol>
    </nav>

    <form class="row gy-3" @submit.prevent="onSave">

      <!-- Profile Card -->
      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-3">Profile</h5>

          <div class="mb-3">
            <label class="form-label">Email</label>
            <input v-model="user.email" type="email" class="form-control" autocomplete="username" />
            <div v-if="user.email && !isValidEmail" class="text-danger small mt-1">
              Invalid email format
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model="user.name" type="text" class="form-control" autocomplete="name" />
          </div>

          <div class="mb-3">
            <label class="form-label">Studies</label>
            <select v-model="user.study_ids" class="form-select" multiple :disabled="user.role === 'admin'">
              <option v-for="option in studyOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
            <div class="form-text">Hold Cmd/Ctrl to select multiple studies. Admin users are automatically assigned to
              all studies.</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Role</label>
            <select v-model="user.role" class="form-select">
              <option v-for="option in roleOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
          </div>

        </div>
      </div>

      <!-- Password Card -->
      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-3">Password</h5>

          <div class="mb-2">
            <label class="form-label">Password</label>
            <input v-model="user.password" type="password" class="form-control" autocomplete="new-password" />
          </div>

          <div class="form-text">{{ PASSWORD_REQUIREMENTS }}</div>

          <div v-if="user.password && !isSecurePassword" class="text-danger small mt-2">
            {{ PASSWORD_REQUIREMENTS }}
          </div>
        </div>
      </div>

      <!-- Submit Message -->
      <div v-if="submitMessage" class="col-12">
        <div class="alert" :class="submitted ? 'alert-success' : 'alert-danger'">
          {{ submitMessage }}
        </div>
      </div>

      <!-- Save Button -->
      <div class="d-flex justify-content-end mb-3">
        <button v-if="!submitted" class="btn btn-primary"
          :disabled="!user.email || !isValidEmail || !user.password || !isSecurePassword" type="submit">
          Send Invite
        </button>

        <button v-else class="btn btn-secondary" type="button" @click="onReset">
          Add another
        </button>
      </div>

    </form>
  </main>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { api, authHeaders } from '../../utils/api';
import { validatePassword, PASSWORD_REQUIREMENTS } from '@/utils/password-validator';

const user = ref({
  email: '',
  name: '',
  role: null,
  study_ids: [],
  password: '',
});

const roleOptions = ref([]);
const studyOptions = ref([]);

const submitMessage = ref('');
const submitted = ref(false);

async function onReset() {
  user.value = {
    email: '',
    name: '',
    role: null,
    study_ids: [],
    password: '',
  };
  submitMessage.value = '';
  submitted.value = false;
}

async function onSave() {
  try {
    const response = await api.post(
      'users/add',
      { user: { ...user.value } },
      authHeaders()
    );

    submitMessage.value =
      response.status === 201
        ? 'User added successfully'
        : 'Unexpected response';

    submitted.value = true;
  } catch (error) {
    submitMessage.value =
      error.response?.status === 409
        ? `User ${user.value.email} already exists`
        : `Failed to add user: ${error}`;
  }
}

const isSecurePassword = computed(() => {
  const p = user.value.password;
  return validatePassword(p);
});

const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.value.email);
});

onMounted(async () => {
  const studies = await api.get('datasets/studies', authHeaders());
  studyOptions.value = studies.data.map(s => ({ text: s.name, value: s.id }));

  const roles = await api.get('users/roles', authHeaders());
  roleOptions.value = [
    { text: 'Select role', value: null },
    ...roles.data.map(r => ({ text: r, value: r })),
  ];
});
</script>