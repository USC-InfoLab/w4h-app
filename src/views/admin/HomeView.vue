<template>
  <main class="d-flex flex-column main-content">

    <div v-if="showSetupGuide" class="alert alert-info mb-3" role="alert">
      <h5 class="alert-heading mb-2">Welcome — finish platform setup</h5>
      <p class="mb-2">
        Your Super admin account is ready. Complete these steps to finish configuring W4H Toolkit:
      </p>
      <ol class="mb-3">
        <li>
          <router-link :to="{ name: 'adminSettings' }">Settings → SMTP</router-link>
          — configure outbound email so invitations and login codes work.
        </li>
        <li>
          <router-link :to="{ name: 'adminTeamsAdd' }">Teams → Add Team</router-link>
          — create the first research team.
        </li>
        <li>
          On the team page, invite a
          <strong>Team admin</strong>
          (or go to
          <router-link :to="{ name: 'usersAdd' }">Users → Invite User</router-link>).
        </li>
        <li>
          Team admins can then create
          <router-link :to="{ name: 'adminProjects' }">projects</router-link>
          and invite Project users.
        </li>
      </ol>
      <button type="button" class="btn btn-sm btn-outline-primary" @click="dismissSetupGuide">
        Got it — hide this guide
      </button>
    </div>

    <div class="row my-2">
      <FeatureCard v-for="card in staticCards" :key="card.card_title" :card="card" />
    </div>

    <hr v-if="markdownCards.length" class="my-4" />

    <div class="row my-2">
      <FeatureCard v-for="card in markdownCards" :key="card.card_title" :card="card" />
    </div>

    <div class="mt-auto text-center text-muted">
      <small>{{ buildInfo }}</small>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';

import FeatureCard from '@/components/FeatureCard.vue';
import { getCards, getFeatureCards } from '@/utils/cards';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';
import { api, authHeaders } from '@/utils/api';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const markdownCards = ref([]);
const staticCards = computed(() => getCards(true));
const showSetupGuide = ref(false);

const buildInfo = `${import.meta.env.VITE_RELEASE_NAME} ${import.meta.env.VITE_VERSION} -- ${import.meta.env.VITE_GIT_HASH}`;

function dismissSetupGuide() {
  userStore.clearFirstTimeLogin();
  showSetupGuide.value = false;
}

onMounted(async () => {
  markdownCards.value = await getFeatureCards();

  if (!isSuperAdmin(user.value?.role)) return;

  // Explicit pending flag (set on initial admin setup) or firstTimeLogin — survives refresh
  if (userStore.isSetupGuidePending() || user.value?.firstTimeLogin) {
    showSetupGuide.value = true;
    return;
  }

  // Already dismissed — stay hidden
  if (localStorage.getItem('w4h.setupGuide') === 'dismissed') return;

  // Existing Super admin with no teams yet: offer the same checklist once
  try {
    const res = await api.get('teams', authHeaders());
    const teams = Array.isArray(res.data) ? res.data : [];
    if (teams.length === 0) {
      userStore.markSetupGuidePending();
      showSetupGuide.value = true;
    }
  } catch {
    /* ignore */
  }
});
</script>

<style scoped>
.main-content {
  min-height: calc(100vh - 56px);
}
</style>
