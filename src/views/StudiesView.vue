<template>
  <main class="StudiesView">
    <h3 class="mb-3">My Projects</h3>

    <div v-if="isLoading" class="overlay d-flex align-items-center justify-content-center">
      <div class="spinner-border" role="status"></div>
    </div>

    <div v-else-if="errorMessage" class="alert alert-danger" role="alert">
      {{ errorMessage }}
    </div>

    <ul v-else-if="studies.length" class="list-group">
      <li v-for="study in studies" :key="study.id"
        class="list-group-item d-flex justify-content-between align-items-center list-group-item-action"
        role="button" @click="openProject(study.id)">
        <span class="text-truncate">{{ study.name || study.id }}</span>
        <span class="badge text-bg-secondary">{{ study.id }}</span>
      </li>
    </ul>

    <div v-else class="alert alert-secondary" role="alert">
      No projects.
    </div>
  </main>
</template>

<script setup name="StudiesView">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

const router = useRouter();
const isLoading = ref(true);
const errorMessage = ref('');
const studies = ref([]);

function openProject(id) {
  router.push({ name: 'projectWorkspace', params: { id } });
}

onMounted(async () => {
  document.title = `${APP_NAME} Projects`;

  try {
    const res = await api.get('datasets/studies', authHeaders());
    studies.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    studies.value = [];
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load projects.';
  } finally {
    isLoading.value = false;
  }
});
</script>