<script setup>
// Shared chart frame (ADR-029 §2): title, loading/empty/error states, PNG + CSV export,
// "view as table" for accessibility, and theme tokens for dark mode.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { VChart } from '@/components/viz/echarts';
import { toCsv } from '@/components/viz/vizOptions';

const props = defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  option: { type: Object, default: null },
  table: { type: Object, default: () => ({ columns: [], rows: [] }) },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
  emptyText: { type: String, default: 'Nothing to show for this selection.' },
  height: { type: Number, default: 320 },
  filename: { type: String, default: 'chart' },
  ariaLabel: { type: String, default: '' },
});

const chartRef = ref(null);
const showTable = ref(false);
const hasData = computed(() => Boolean(props.option) && (props.table?.rows?.length || 0) > 0);
const TABLE_CAP = 200;

function download(href, name) {
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportPng() {
  const url = chartRef.value?.getDataURL?.({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
  if (url) download(url, `${props.filename}.png`);
}

function exportCsv() {
  const blob = new Blob([toCsv(props.table)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  download(url, `${props.filename}.csv`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Re-theme when the page switches between light and dark.
const emit = defineEmits(['theme-changed']);
let observer = null;
onMounted(() => {
  observer = new MutationObserver(() => emit('theme-changed'));
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme', 'class'] });
});
onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div class="chart-card">
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-1">
      <div class="min-w-0">
        <div v-if="title" class="small fw-semibold">{{ title }}</div>
        <div v-if="subtitle" class="small text-muted">{{ subtitle }}</div>
      </div>
      <div v-if="hasData" class="btn-group btn-group-sm flex-shrink-0" role="group" aria-label="Chart actions">
        <button type="button" class="btn btn-outline-secondary" :class="{ active: showTable }"
          :aria-pressed="showTable" @click="showTable = !showTable">
          <i class="bi bi-table" aria-hidden="true"></i> Table
        </button>
        <button type="button" class="btn btn-outline-secondary" :disabled="showTable" @click="exportPng">
          <i class="bi bi-image" aria-hidden="true"></i> PNG
        </button>
        <button type="button" class="btn btn-outline-secondary" @click="exportCsv">
          <i class="bi bi-filetype-csv" aria-hidden="true"></i> CSV
        </button>
      </div>
    </div>

    <div v-if="loading" class="chart-card__state text-muted small" :style="{ height: height + 'px' }">
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Loading…
    </div>
    <div v-else-if="error" class="alert alert-danger small py-2 mb-0" role="alert">{{ error }}</div>
    <div v-else-if="!hasData" class="chart-card__state text-muted small" :style="{ height: Math.min(height, 120) + 'px' }">
      {{ emptyText }}
    </div>
    <template v-else>
      <div v-if="showTable" class="table-responsive border rounded" :style="{ maxHeight: height + 'px' }">
        <table class="table table-sm table-striped mb-0 small">
          <thead class="sticky-top"><tr><th v-for="c in table.columns" :key="c">{{ c }}</th></tr></thead>
          <tbody>
            <tr v-for="(row, i) in table.rows.slice(0, TABLE_CAP)" :key="i">
              <td v-for="(cell, j) in row" :key="j">{{ cell }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="table.rows.length > TABLE_CAP" class="small text-muted p-2">
          Showing {{ TABLE_CAP }} of {{ table.rows.length }} rows — export CSV for all.
        </div>
      </div>
      <VChart v-else ref="chartRef" class="chart-card__chart" :option="option" autoresize
        :style="{ height: height + 'px' }" role="img" :aria-label="ariaLabel || title || 'Chart'" />
    </template>
  </div>
</template>

<style scoped>
.chart-card__chart { width: 100%; }
.chart-card__state { display: flex; align-items: center; justify-content: center; }
</style>
