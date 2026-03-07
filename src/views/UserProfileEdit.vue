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
            <input v-model="newUser.password" type="text" class="form-control" autocomplete="new-password" />
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
