<script setup>
import DatasetCatalogCard from '@/components/home/DatasetCatalogCard.vue';

defineProps({
  activeProjectId: { type: [String, Number], default: '' },
});
</script>

<template>
  <div>
    <div class="mb-3">
      <h5 class="mb-0">Your work</h5>
      <p class="text-muted small mb-0">
        Browse available datasets below. Use <strong>Project</strong> in the nav for study info,
        members, and datasets already assigned to this project.
      </p>
    </div>

    <DatasetCatalogCard :show-owned-filter="false" />
  </div>
</template>
