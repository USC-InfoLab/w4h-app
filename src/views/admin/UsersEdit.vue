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
            ❗️ Password must be at least 8 characters, and include uppercase,
            lowercase, and a number.
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
      <div class="col-12">
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
// import ToastComponent from './Toast.vue';

import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();

//const showToast = ref(false);

const verifyCode = ref('');
const dirty = ref(false);

const user = ref(null);
let originalUser = null;

const roleOptions = ref([]);
const accountOptions = ref([]);

let accounts = [];
let cities = [];
const message = ref('');

function onDelete() {
  api.delete('users/' + user.value.email, authHeaders()).then(() => {
    router.push('/admin/users');
  });
}

function getCity(city_id) {
  const city = cities.find(c => c.id === city_id);
  if (city) {
    return `(${city.name})`;
  }
  return '';
}

onMounted(async () => {
  const data = (await api.get('users/user/' + encodeURIComponent(route.params.email), authHeaders())).data;
  user.value = {
    email: data.email,
    name: data.name,
    role: data.role,
    password: '',
    account_id: data.account_id,
  };

  originalUser = JSON.stringify(user.value);

  watch(
    user,
    (newVal) => {
      const hasProfileChanges = JSON.stringify(newVal) !== originalUser;
      const hasPasswordEntry = user.value.password && user.value.password.length > 0;

      console.log(user.value.password);
      console.log(hasProfileChanges)
      console.log(hasPasswordEntry)

      dirty.value = hasProfileChanges || hasPasswordEntry;
    },
    { deep: true }
  );

  cities = (await api.get('datasets/cities', authHeaders())).data;

  accounts = (await api.get('users/accounts', authHeaders())).data;
  accountOptions.value = accounts.map((d) => ({ text: `${d.name} ${getCity(d.city_id)}`, value: d.id }));
  accountOptions.value = [{ text: 'Select account', value: null }, ...accountOptions.value];

  const roles = await api.get('users/roles', authHeaders());
  roleOptions.value = roles.data.map((d) => ({ text: d.name, value: d.id }));
  roleOptions.value = [{ text: 'Select role', value: null }, ...roleOptions.value];
});

async function onSave() {
  try {
    message.value = '';

    const updates = { email: user.value.email };
    if (originalUser.name !== user.value.name) updates.name = user.value.name;
    if (originalUser.role !== user.value.role) updates.role = user.value.role;
    if (originalUser.password !== user.value.password) updates.password = user.value.password;
    if (user.value.account_id != '') updates.account_id = user.value.account_id;

    await api.post('users/update', { user: updates }, authHeaders());
    user.value.password = '';  //in case we changed it
    originalUser = JSON.stringify(user.value);

    dirty.value = false;
  } catch (error) {
    message.value = error.message;
  }
}

const isSecurePassword = computed(() => {
  const password = user.value.password;
  if (!password) {
    return true; // Empty password is ok
  }
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return regex.test(password);
});
</script>
