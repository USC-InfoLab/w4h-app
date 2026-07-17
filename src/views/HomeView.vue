<script setup>
import { ref, computed, onMounted } from 'vue';
import FeatureCard from '@/components/FeatureCard.vue';

import { getCards, getFeatureCards } from '@/utils/cards';

import { storeToRefs } from 'pinia';
import { useUserStore } from '@/stores/user';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const markdownCards = ref([]);
const staticCards = computed(() => getCards());

onMounted(async () => {
  markdownCards.value = await getFeatureCards();
});
</script>

<template>
  <main>
    <div class="row my-2">
      <FeatureCard v-for="card in staticCards" :key="card.card_title" :card="card" />
    </div>

    <hr v-if="markdownCards.length" class="my-4" />

    <div class="row my-2">
      <FeatureCard v-for="card in markdownCards" :key="card.card_title" :card="card" />
    </div>

    <div class="mb-3 ms-2">
      <div v-for="(access, index) in user.access" :key="index">
        You can create newsletters for {{ access.name }}
        {{ access.send ? ' and can send published newsletters to subscribers.' : '.' }}
      </div>
    </div>
  </main>
</template>
