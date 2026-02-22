<template>
  <main role="main" class="container-fluid">

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading account...</p>
    </div>

    <div v-else class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">

        <h5 class="mb-3">
          <i class="bi bi-building me-1"></i>
          Edit Account
        </h5>

        <form @submit.prevent="onSave">

          <!-- Account name -->
          <div class="mb-3">
            <label class="form-label">Account name</label>
            <input
              v-model="form.name"
              type="text"
              class="form-control"
              required
            />
          </div>

          <!-- City -->
          <div class="mb-3">
            <label class="form-label">City</label>
            <select v-model="form.city_id" class="form-select">
              <option
                v-for="city in cities"
                :key="city.id"
                :value="city.id"
              >
                {{ city.name }}
              </option>
            </select>
          </div>

          <!-- API key -->
          <div class="mb-3">
            <label class="form-label d-flex justify-content-between">
              <span>API Key</span>
              <button
                type="button"
                class="btn btn-sm btn-outline-danger"
                @click="regenerateKey"
              >
                Regenerate
              </button>
            </label>

            <CopyBox :data="form.api_key" />
            <small class="text-muted">
              Used for programmatic access. Keep secret.
            </small>
          </div>

          <!-- Actions -->
          <div class="d-flex justify-content-between mt-4">
            <button
              type="button"
              class="btn btn-secondary"
              @click="$router.back()"
            >
              Cancel
            </button>

            <button
              type="submit"
              class="btn btn-primary"
              :disabled="saving"
            >
              Save
            </button>
          </div>

        </form>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, authHeaders } from '../../utils/api';
import CopyBox from '../../components/CopyBox.vue';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const saving = ref(false);

const form = ref({
  id: null,
  name: '',
  city_id: null,
  api_key: ''
});

const cities = ref([]);

onMounted(async () => {
  try {
    const [accountRes, citiesRes] = await Promise.all([
      api.get(`users/accounts/${route.params.id}`, authHeaders()),
      api.get('datasets/cities', authHeaders())
    ]);

    form.value = accountRes.data;
    cities.value = citiesRes.data;
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
});

async function onSave() {
  saving.value = true;

  try {
    await api.put(
      `users/accounts/${form.value.id}`,
      {
        name: form.value.name,
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

async function regenerateKey() {
  if (!confirm('Regenerate API key? Existing integrations will break.')) return;

  try {
    const res = await api.post(
      `users/accounts/${form.value.id}/regenerate-key`,
      {},
      authHeaders()
    );
    form.value.api_key = res.data.api_key;
  } catch (e) {
    console.error(e);
  }
}
</script>

