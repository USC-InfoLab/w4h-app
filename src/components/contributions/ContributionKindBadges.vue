<template>
  <span>
    <span v-for="k in kinds" :key="k" class="badge text-bg-secondary me-1">{{ k }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { contributionKinds } from '@/utils/contributionKinds';

const props = defineProps({
  row: { type: Object, default: null },
});

const kinds = computed(() => contributionKinds(props.row));
</script>
