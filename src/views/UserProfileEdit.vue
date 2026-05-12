<template>
  <main role="main" class="container-fluid" v-if="user && newUser">

    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">

        <!-- Header -->
        <nav v-if="isAdminUI" aria-label="breadcrumb" class="mb-2">
          <ol class="breadcrumb mb-0">
            <li class="breadcrumb-item">
              <router-link to="/users">Users</router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">
              {{ user.email }}
            </li>
          </ol>
        </nav>

        <h5 class="mb-3 mt-3">
          <i class="bi bi-person me-1"></i>
          {{ isAdminUI ? 'Edit User' : 'Profile Settings' }}
        </h5>

        <form @submit.prevent="onSave">

          <!-- Name -->
          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model="newUser.name" type="text" class="form-control" />
          </div>

          <!-- Password -->
          <div class="mb-3">
            <label class="form-label">Password</label>
            <div class="input-group">
              <input :type="showPassword ? 'text' : 'password'" v-model="newUser.password" class="form-control"
                autocomplete="new-password" />
              <button type="button" class="btn btn-outline-secondary" @click="showPassword = !showPassword"
                tabindex="-1">
                <i :class="showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
              </button>
            </div>
            <div class="mt-1">
              <button type="button" class="btn btn-link btn-sm p-0 text-decoration-none" @click="suggestPassword">
                <i class="bi bi-key me-1"></i>Suggest password
              </button>
            </div>
            <small class="text-muted">
              Enter a new password to update
            </small>

            <div v-if="newUser.password && !isSecurePassword" class="text-danger mt-1">
              Must be at least 12 characters long and contain at least one uppercase
              letter, one lowercase letter, one number, and one special character.
            </div>
          </div>

          <!-- Error -->
          <div v-if="message" class="alert alert-danger">
            {{ message }}
          </div>

          <!-- Actions -->
          <div class="d-flex justify-content-between mt-4">
            <!-- <button type="button" class="btn btn-secondary" @click="$router.back()">
              Cancel
            </button> -->

            <button id="save-profile" type="submit" class="btn btn-primary" :disabled="!dirty || !isSecurePassword">
              Save
            </button>
          </div>

        </form>

        <!-- Danger zone -->
        <div v-if="user.role === 'admin' && newUser.email !== user.email" class="card mt-4 border-danger p-3">
          <h6 class="text-danger mb-2">Danger zone</h6>

          <p class="mb-2">
            Deleting is forever. To proceed enter
            <q>{{ user.email }}</q>
          </p>

          <input class="form-control mb-2" type="text" v-model="verifyCode" placeholder="Enter email" />

          <button class="btn btn-danger" :disabled="verifyCode !== user.email" @click="onDelete">
            Delete
          </button>
        </div>

      </div>
    </div>
  </main>
</template>


<script setup>
import { ref, onMounted, watchEffect, computed } from 'vue';
import { api, authHeaders } from '@/utils/api';
import { validatePassword } from '@/utils/password-validator';
import { useRouter } from 'vue-router';
const router = useRouter();

import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

import { useUIStore } from '@/stores/ui';
const uiStore = useUIStore();

const isAdminUI = computed(() => {
  return user.value?.role === 'admin' && uiStore.isAdminUI;
});

const verifyCode = ref('');
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
  newUser.value.password = pw.join('');
  showPassword.value = true;
}
const dirty = ref(false);
const message = ref('');

const newUser = ref(null); // separate editable copy
let originalUser = null;

function onDelete() {
  api.delete('users/' + user.value.email, authHeaders()).then(() => {
    router.push('/admin/users');
  });
}

const setUser = () => {
  newUser.value = {
    email: user.value.email,
    name: user.value.name,
    role: user.value.role,
    password: '',
  };
  originalUser = { ...newUser.value };
  dirty.value = false;
};

onMounted(async () => {
  setUser();

  watchEffect(() => {
    dirty.value = Object.keys(newUser.value || {}).some(
      key => newUser.value[key] !== originalUser[key]
    );
  });

});

async function onSave() {
  try {
    message.value = '';
    const updates = {
      name: newUser.value.name,
      ...(newUser.value.password ? { password: newUser.value.password } : {})
    };
    const response = await api.post('users/profile', { user: updates }, authHeaders());

    if (response.data.error) {
      message.value = response.data.error.message;
    } else {
      const updatedUser = response.data.user;
      localStorage.setItem('w4h.user.token', updatedUser.token);
      await userStore.setUser(updatedUser); // update store
      setUser(); // reset editable copy
    }
  } catch (error) {
    message.value = error.message;
  }
}

const isSecurePassword = computed(() => {
  const password = newUser.value?.password;
  return validatePassword(password);
});
</script>

<style scoped>
.name-column {
  min-width: 280px;
}

.password-column {
  min-width: 280px;
}
</style>
