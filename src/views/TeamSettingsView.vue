<template>
  <main class="container-fluid">
    <p class="text-muted">Opening Project → People…</p>
  </main>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTeamContext } from '@/composables/useTeamContext';

const router = useRouter();
const { activeProject, activeProjectId, loadProjects } = useTeamContext();

onMounted(async () => {
  await loadProjects();
  const p = activeProject.value;
  const id = p?.slug || p?.id || activeProjectId.value;
  if (id) {
    router.replace({
      name: 'adminProjectsEdit',
      params: { id },
      query: { tab: 'people' },
    });
    return;
  }
  router.replace({ name: 'home' });
});
</script>
