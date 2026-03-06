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

    <div class="row gy-3">

      <!-- Profile Card -->
      <div class="col-12 col-md-6">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-3">Profile</h5>

          <div class="mb-3">
            <label class="form-label">Email</label>
            <input v-model="user.email" type="email" class="form-control" />
            <div v-if="user.email && !isValidEmail" class="text-danger small mt-1">
              Invalid email format
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model="user.name" type="text" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Account</label>
            <select v-model="user.account_id" class="form-select">
              <option v-for="option in accountOptions" :key="option.value" :value="option.value">
                {{ option.text }}
              </option>
            </select>
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
          :disabled="!user.email || !isValidEmail || !user.password || !isSecurePassword" @click="onSave">
          Send Invite
        </button>

        <button v-else class="btn btn-secondary" @click="onReset">
          Add another
        </button>
      </div>

    </div>
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
  account_id: null,
  password: '',
  can_send: false,
});

const roleOptions = ref([]);
const accountOptions = ref([]);
let cities = [];

const submitMessage = ref('');
const submitted = ref(false);

async function onReset() {
  user.value = {
    email: '',
    name: '',
    role: null,
    account_id: null,
    password: '',
    can_send: false,
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

function getDataset(city_id) {
  const city = cities.find(c => c.id === city_id);
  return city ? `(${city.name})` : '';
}

const isSecurePassword = computed(() => {
  const p = user.value.password;
  return validatePassword(p);
});

const isValidEmail = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.value.email);
});

onMounted(async () => {
  cities = (await api.get('datasets/cities', authHeaders())).data;

  const accounts = await api.get('users/accounts', authHeaders());
  accountOptions.value = [
    { text: 'Select account', value: null },
    ...accounts.data.map(d => ({
      text: `${d.name} ${getDataset(d.city_id)}`,
      value: d.id,
    })),
  ];

  const roles = await api.get('users/roles', authHeaders());
  roleOptions.value = [
    { text: 'Select role', value: null },
    ...roles.data.map(d => ({ text: d.name, value: d.id })),
  ];
});
</script>