<template>
  <div class="col-md-3 mb-2" v-if="!hidden">

    <div class="card h-100 mb-3" :class="{ 'text-muted': card.disabled }">
      <div class="card-body">
        <h5 class="card-title" v-html="card.card_title"></h5>
        <span v-if="uiStore.isAdminUI" class="position-absolute top-0 end-0 m-2">
          <i :class="card.hidden ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
        </span>
        <div class="card-text" v-html="card.description"></div>

        <div v-if="card.route">
          <RouterLink
            v-if="!card.disabled"
            :to="{ path: `/${card.route}` }"
            class="btn btn-sm btn-primary mt-2"
          >
            {{ card.action_label || 'Open' }}
          </RouterLink>
        </div>
        <div v-else-if="card.slug">
          <RouterLink
            :to="{ name: 'docs', params: { slug: card.slug } }"
            class="btn btn-sm btn-primary mt-2"
            :disabled="card.disabled"
          >
            {{ card.action_label || 'Open' }}
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

import { useUIStore } from '../stores/ui';
const uiStore = useUIStore();

const props = defineProps({
  card: { type: Object, required: true }
});

// Allow admins to see hidden cards
const hidden = computed(() => {
  return props.card.hidden && !uiStore.isAdminUI;
});
</script>