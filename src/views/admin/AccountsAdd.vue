<template>
  <main role="main" class="container-fluid">
    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">

        <h5 class="mb-3">
          <i class="bi bi-building me-1"></i>
          Add Account
        </h5>

        <form @submit.prevent="onCreate">

          <div class="mb-3">
            <label class="form-label">Account Name</label>
            <input v-model="form.name" type="text" class="form-control" required autofocus />
          </div>

          <div class="mb-3">
            <label class="form-label">Account ID</label>
            <div class="input-group">
              <span class="input-group-text">Account slug</span>
              <input v-model="form.id" @input="isIdManual = true" type="text" class="form-control"
                :class="{ 'is-invalid': !idAvailable, 'is-valid': idAvailable && form.id }" required />
            </div>
            <div class="form-text d-flex justify-content-between">
              <span>Only lowercase, numbers, and hyphens.</span>
              <span v-if="checkingId" class="spinner-border spinner-border-sm text-primary"></span>
            </div>
            <div v-if="!idAvailable" class="invalid-feedback d-block">
              This ID is already taken. Please try another.
            </div>
          </div>

          <div class="mb-3">
            <label class="form-label">City</label>
            <select v-model="form.city_id" class="form-select" required>
              <option disabled value="">Select a city</option>
              <option v-for="city in cities" :key="city.id" :value="city.id">
                {{ city.name }}
              </option>
            </select>
          </div>

          <!-- Actions -->
          <div class="d-flex justify-content-between mt-4">
            <button type="button" class="btn btn-secondary" @click="$router.back()">
              Cancel
            </button>

            <button type="submit" class="btn btn-primary" :disabled="saving">
              Create Account
            </button>
          </div>
        </form>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import _ from 'lodash'; // Recommended for debounce

import { api, authHeaders } from '../../utils/api';

const form = ref({
  name: '',
  id: '',
  city_id: ''
});

const router = useRouter();

const saving = ref(false);

const cities = ref([]);
const isIdManual = ref(false);
const idAvailable = ref(true);
const checkingId = ref(false);

// Helper to slugify strings
const slugify = (val) => {
  return val.toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .trim();
};

async function onCreate() {
  saving.value = true;

  try {
    await api.post(
      'users/account',
      {
        name: form.value.name,
        id: form.value.id,
        city_id: form.value.city_id
      },
      authHeaders()
    );

    router.push({ name: 'accounts' });
  } catch (e) {
    console.error(e);
  } finally {
    saving.value = false;
  }
}

// Check ID availability (Debounced)
const checkAvailability = _.debounce(async (id) => {
  if (!id) return;
  checkingId.value = true;
  try {
    const res = await api.get(`users/account/check/${id}`, authHeaders());
    idAvailable.value = !res.data.exists;
  } finally {
    checkingId.value = false;
  }
}, 500);

watch(() => form.value.id, (newId) => {
  checkAvailability(newId);
});

// Auto-populate ID based on Name
watch(() => form.value.name, (newName) => {
  if (!isIdManual.value) {
    form.value.id = slugify(newName);
  }
});

onMounted(async () => {
  document.title = 'Add Account';

  try {
    const res = await api.get('datasets/cities', authHeaders());
    cities.value = res.data;
  } catch (e) {
    console.error(e);
  }
});
</script>
