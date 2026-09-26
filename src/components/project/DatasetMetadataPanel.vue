<script setup>
import { computed, ref, watch } from 'vue';
import { buildDemoDatasetMetadata, findDemoSignalTable } from '@/utils/datasetMetadataDemo.js';
import DatasetMetadataOverview from '@/components/project/DatasetMetadataOverview.vue';
import SignalTableList from '@/components/project/SignalTableList.vue';
import SignalTableDetail from '@/components/project/SignalTableDetail.vue';

const props = defineProps({
  dataset: { type: Object, default: null },
});

const selectedTableId = ref('');

const metadata = computed(() => buildDemoDatasetMetadata(props.dataset));

const selectedTable = computed(() => findDemoSignalTable(metadata.value, selectedTableId.value));

watch(
  () => props.dataset?.id,
  () => {
    selectedTableId.value = '';
  }
);

function onSelectTable(id) {
  selectedTableId.value = id;
}

function onBackToList() {
  selectedTableId.value = '';
}
</script>

<template>
  <div v-if="dataset" class="dataset-metadata-panel">
    <div class="alert alert-secondary py-2 px-3 small mb-3" role="status">
      <i class="bi bi-info-circle me-1" aria-hidden="true"></i>
      Demo metadata UI — values are illustrative until the metadata storage API is connected.
    </div>

    <template v-if="!selectedTable">
      <p v-if="metadata.overview.description" class="small text-muted mb-3">
        {{ metadata.overview.description }}
      </p>

      <DatasetMetadataOverview
        :overview="metadata.overview"
        :quality="metadata.quality"
        :research-context="metadata.researchContext"
      />

      <SignalTableList
        :signal-tables="metadata.signalTables"
        :selected-table-id="selectedTableId"
        @select="onSelectTable"
      />
    </template>

    <SignalTableDetail v-else :table="selectedTable" @back="onBackToList" />
  </div>
</template>

<style scoped>
.dataset-metadata-panel {
  flex: 1 1 auto;
  min-height: 0;
}
</style>
