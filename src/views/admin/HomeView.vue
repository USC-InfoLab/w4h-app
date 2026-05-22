<template>
  <main class="d-flex flex-column main-content">

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

import FeatureCard from '@/components/FeatureCard.vue';
import { getCards, getFeatureCards } from '@/utils/cards';

const markdownCards = ref([]);

// Combined cards
const staticCards = computed(() => getCards(true));

const buildInfo = `${import.meta.env.VITE_RELEASE_NAME} ${import.meta.env.VITE_VERSION} -- ${import.meta.env.VITE_GIT_HASH}`;

onMounted(async () => {
  markdownCards.value = await getFeatureCards();
});
</script>

<style scoped>
.main-content {
  min-height: calc(100vh - 56px);
  /* adjust if your navbar height differs */
}
</style>