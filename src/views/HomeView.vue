<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import FeatureCard from '@/components/FeatureCard.vue';
import ProjectAdminHome from '@/components/home/ProjectAdminHome.vue';
import ProjectUserHome from '@/components/home/ProjectUserHome.vue';
import WelcomeNextSteps from '@/components/home/WelcomeNextSteps.vue';
import {
  adminNextStepCards,
  dismissAdminNextSteps,
  dismissUserNextSteps,
  isAdminNextStepsDismissed,
  isUserNextStepsDismissed,
  userNextStepCards,
} from '@/components/home/nextStepCards';
import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';
import { canManageTeam, isSuperAdmin } from '@/utils/roles';
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
const showAdminWelcome = computed(
  () => canManageTeam(user.value?.role, user.value?.caps) && !isSuperAdmin(user.value?.role)
);
const showAdminNextSteps = ref(!isAdminNextStepsDismissed());
const showUserWelcome = computed(
  () => !canManageTeam(user.value?.role, user.value?.caps) && !isSuperAdmin(user.value?.role)
);
const showUserNextSteps = ref(!isUserNextStepsDismissed());

function hideAdminNextSteps() {
  dismissAdminNextSteps();
  showAdminNextSteps.value = false;
}

function hideUserNextSteps() {
  dismissUserNextSteps();
  showUserNextSteps.value = false;
}

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
      <div class="d-flex justify-content-end mb-3">
        <router-link
          :to="{ name: 'docs', params: { slug: 'whats-new' } }"
          class="btn btn-sm btn-outline-secondary flex-shrink-0"
        >
          <i class="bi bi-stars me-1"></i>What's New
        </router-link>
      </div>
      <WelcomeNextSteps
        v-if="showAdminWelcome && showAdminNextSteps"
        title="Welcome — Admin"
        subtitle="Set up your trial in the app shell. Super admin does not create projects for you."
        :cards="adminNextStepCards"
        dismissable
        @dismiss="hideAdminNextSteps"
      />
      <WelcomeNextSteps
        v-else-if="showUserWelcome && showUserNextSteps"
        title="Welcome — User"
        subtitle="Work in assigned projects. Admins ingest data; you run analytics on loaded tables."
        :cards="userNextStepCards"
        dismissable
        @dismiss="hideUserNextSteps"
      />
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
