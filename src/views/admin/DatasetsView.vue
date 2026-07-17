<template>
  <main role="main" class="container-fluid">
    <div class="row align-items-center mb-2">
      <div class="col">
        <h5 class="mb-0">
          <i class="bi bi-database me-1"></i>
          Datasets
        </h5>
      </div>
      <div class="col-auto ms-auto">
        <button class="btn btn-sm btn-primary my-2" @click="$router.push({ name: 'adminDatasetsAdd' })">
          <i class="bi bi-plus"></i> Add Dataset
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading datasets...</p>
    </div>

    <ul v-else-if="datasets.length" class="list-group">
      <li
        v-for="dataset in datasets"
        :key="dataset.id"
        class="list-group-item d-flex justify-content-between align-items-center"
      >
        <div>
          <div class="fw-semibold">
            {{ dataset.name || dataset.id }}
          </div>
          <small class="text-muted">
            {{ dataset.id }}
            <span v-if="dataset.team_name"> · {{ dataset.team_name }}</span>
          </small>
        </div>
        <button
          class="btn btn-sm btn-outline-primary"
          :disabled="dataset.source_kind === 'shared'"
          @click="goEdit(dataset.id)"
        >
          Edit
        </button>
      </li>
    </ul>

    <div v-else class="text-center my-5">
      <p class="text-muted mb-3">No datasets yet.</p>
      <button class="btn btn-primary btn-sm" @click="$router.push({ name: 'adminDatasetsAdd' })">
        Create the first dataset
      </button>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';

const router = useRouter();
const datasets = ref([]);
const loading = ref(true);
const errorMessage = ref('');

onMounted(async () => {
  document.title = 'Datasets';
  try {
    const res = await api.get('datasets', authHeaders());
    datasets.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load datasets.';
    datasets.value = [];
  } finally {
    loading.value = false;
  }
});

function goEdit(id) {
  router.push({ name: 'adminDatasetsEdit', params: { id } });
}
</script>
