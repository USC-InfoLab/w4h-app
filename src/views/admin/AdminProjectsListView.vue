<template>
  <main role="main" class="container-fluid">
    <div class="row align-items-center mb-2">
      <div class="col-auto ms-auto">
        <button class="btn btn-sm btn-primary my-2" @click="$router.push({ name: 'adminProjectsAdd' })">
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

    <ul v-else-if="projects.length" class="list-group">
      <li v-for="p in projects" :key="p.id"
        class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <div class="fw-semibold">{{ p.name || p.id }}</div>
          <small class="text-muted">{{ p.slug || p.id }}</small>
        </div>
        <button class="btn btn-sm btn-outline-primary" @click="goEdit(p.slug || p.id)">Edit</button>
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
const projects = ref([]);
const loading = ref(true);
const errorMessage = ref('');

onMounted(async () => {
  document.title = 'Projects';

  try {
    const res = await api.get('projects', authHeaders());
    projects.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load projects.';
    projects.value = [];
  } finally {
    loading.value = false;
  }
});

function goEdit(projectRef) {
  router.push({ name: 'adminProjectsEdit', params: { id: projectRef } });
}
</script>
