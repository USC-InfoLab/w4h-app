<template>
  <main role="main" class="container-fluid">
    <div class="row align-items-center mb-2">
      <div class="col-auto ms-auto">
        <button class="btn btn-sm btn-primary my-2" @click="$router.push({ name: 'adminStudiesAdd' })">
          <i class="bi bi-plus"></i> Add Project
        </button>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading projects...</p>
    </div>

    <ul v-else-if="studies.length" class="list-group">
      <li v-for="study in studies" :key="study.id"
        class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold">{{ study.name || study.id }}</div>
          <small class="text-muted">{{ study.slug || study.id }}</small>
        </div>
        <button class="btn btn-sm btn-outline-primary" @click="goEdit(study.slug || study.id)">Edit</button>
      </li>
    </ul>

    <div v-else class="text-center my-5">
      <p class="text-muted">No projects found.</p>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';

const router = useRouter();
const studies = ref([]);
const loading = ref(true);
const errorMessage = ref('');

onMounted(async () => {
  document.title = 'Projects';

  try {
    const res = await api.get('projects', authHeaders());
    studies.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load projects.';
    studies.value = [];
  } finally {
    loading.value = false;
  }
});

function goEdit(projectRef) {
  router.push({ name: 'adminStudiesEdit', params: { id: projectRef } });
}
</script>
