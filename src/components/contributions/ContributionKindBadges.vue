<template>
  <span>
    <span
      v-for="k in kinds"
      :key="k"
      class="badge me-1"
      :class="k === 'cli' ? 'text-bg-primary' : 'text-bg-secondary'"
    >{{ k }}</span>
    <span v-if="language" class="badge text-bg-light border me-1">{{ language }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { contributionKinds } from '@/utils/contributionKinds';

const props = defineProps({
  row: { type: Object, default: null },
});

const kinds = computed(() => contributionKinds(props.row));

/** Language is omitted when it already appears as a kind (e.g. kind sql + language sql). */
const language = computed(() => {
  const lang = String(props.row?.language || '').trim();
  if (!lang || kinds.value.includes(lang)) return '';
  return lang;
});
</script>
