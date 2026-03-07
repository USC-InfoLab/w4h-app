<template>
  <main class="StudiesView">
    <h3 class="mb-3">My Studies</h3>

    <div v-if="isLoading" class="overlay d-flex align-items-center justify-content-center">
      <div class="spinner-border" role="status"></div>
    </div>

    <div v-else-if="errorMessage" class="alert alert-danger" role="alert">
      {{ errorMessage }}
    </div>

    <ul v-else-if="studies.length" class="list-group">
      <li v-for="study in studies" :key="study.id"
        class="list-group-item d-flex justify-content-between align-items-center">
        <span>{{ study.name || study.id }}</span>
        <span class="badge text-bg-secondary">{{ study.id }}</span>
      </li>
    </ul>

    <div v-else class="alert alert-secondary" role="alert">
      No studies assigned to your user.
    </div>
  </main>
</template>

<script setup name="StudiesView">
import { onMounted, ref } from 'vue';
import { api, authHeaders } from '@/utils/api';

const isLoading = ref(true);
const errorMessage = ref('');
const studies = ref([]);

onMounted(async () => {
  document.title = 'My Studies';

  try {
    const res = await api.get('datasets/studies', authHeaders());
    studies.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    studies.value = [];
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load studies.';
  } finally {
    isLoading.value = false;
  }
});
</script>