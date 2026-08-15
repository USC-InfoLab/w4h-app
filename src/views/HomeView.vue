<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import FeatureCard from '@/components/FeatureCard.vue';
import ProjectAdminHome from '@/components/home/ProjectAdminHome.vue';
import ProjectUserHome from '@/components/home/ProjectUserHome.vue';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';
import { getCards, getFeatureCards } from '@/utils/cards';
import { APP_NAME } from '@/utils/defs';
import { useTeamContext } from '@/composables/useTeamContext';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const {
  activeProjectId,
  activeProjectName,
  isActiveProjectAdmin,
  loadProjects,
} = useTeamContext();

const showAdminHome = computed(
  () => isActiveProjectAdmin.value && !isSuperAdmin(user.value?.role)
);

const showUserHome = computed(
  () => !!activeProjectName.value && !isActiveProjectAdmin.value && !isSuperAdmin(user.value?.role)
);

const markdownCards = ref([]);
const staticCards = computed(() => getCards());

async function refreshHome() {
  document.title = `${APP_NAME} Home`;
  if (showAdminHome.value || showUserHome.value) {
    await loadProjects();
    markdownCards.value = [];
  } else {
    markdownCards.value = await getFeatureCards();
  }
}

watch([activeProjectId, isActiveProjectAdmin], () => {
  refreshHome();
});

onMounted(() => {
  refreshHome();
});
</script>

<template>
  <main class="container-fluid">
    <ProjectAdminHome
      v-if="showAdminHome"
      :active-project-id="activeProjectId"
    />
    <ProjectUserHome
      v-else-if="showUserHome"
      :active-project-id="activeProjectId"
    />
    <template v-else>
      <div class="row my-2">
        <FeatureCard v-for="card in staticCards" :key="card.card_title" :card="card" />
      </div>

      <hr v-if="markdownCards.length" class="my-4" />

      <div class="row my-2">
        <FeatureCard v-for="card in markdownCards" :key="card.card_title" :card="card" />
      </div>
    </template>
  </main>
</template>
