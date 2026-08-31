<script setup>
import { computed, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';
import { datasetBasicStats, formatApproxNumber } from '@/utils/datasetBasicStats';

const props = defineProps({
  datasets: { type: Array, default: () => [] },
});

const previewsById = ref({});
const previewLoading = ref(false);
const openDatasets = ref({});
const openTables = ref({});

function datasetKey(card) {
  return String(card?.id || card?.name || '');
}

function tableKey(card, tableName) {
  return `${datasetKey(card)}::${tableName}`;
}

function isDatasetOpen(card) {
  return Boolean(openDatasets.value[datasetKey(card)]);
}

function isTableOpen(card, tableName) {
  return Boolean(openTables.value[tableKey(card, tableName)]);
}

function toggleDataset(card) {
  const key = datasetKey(card);
  openDatasets.value = { ...openDatasets.value, [key]: !openDatasets.value[key] };
}

function toggleTable(card, tableName) {
  const key = tableKey(card, tableName);
  openTables.value = { ...openTables.value, [key]: !openTables.value[key] };
}

const cards = computed(() =>
  (props.datasets || []).map((row) => {
    const base = datasetBasicStats(row);
    const previewTables = previewsById.value[base.id]?.tables;
    if (!Array.isArray(previewTables)) return base;
    return {
      ...base,
      tables: previewTables,
      tableCount: previewTables.length || base.tableCount,
    };
  })
);

watch(
  () => (props.datasets || []).map((row) => String(row?.id || row?.dataset_id || '')).join(','),
  async (ids) => {
    const list = ids.split(',').filter(Boolean);
    if (!list.length) {
      previewsById.value = {};
      return;
    }
    previewLoading.value = true;
    try {
      const entries = await Promise.all(
        list.map(async (id) => {
          try {
            const res = await api.get(
              `/datasets/${encodeURIComponent(id)}/tables/preview`,
              authHeaders()
            );
            return [id, res.data || { tables: [] }];
          } catch {
            return [id, null];
          }
        })
      );
      const next = {};
      for (const [id, payload] of entries) {
        if (payload) next[id] = payload;
      }
      previewsById.value = next;
    } finally {
      previewLoading.value = false;
    }
  },
  { immediate: true }
);

function display(value) {
  if (value == null || value === '') return '—';
  return value;
}

function cell(value) {
  if (value == null || value === '') return '—';
  const text = String(value);
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}
</script>

<template>
  <div>
    <div class="card p-3 mb-3">
      <h5 class="card-title mb-1">Dataset statistics</h5>
      <p class="small text-muted mb-0">
        Subject count, date range, device type, and size for each linked dataset.
        Counts from cached metadata may be approximate.
      </p>
    </div>

    <div v-if="cards.length === 0" class="card p-3">
      <p class="small text-muted mb-0">
        No datasets are linked to this project yet. Link a dataset on the Datasets tab
        to see statistics here.
      </p>
    </div>

    <div v-for="card in cards" :key="card.id || card.name" class="card p-3 mb-3">
      <div class="mb-3">
        <div class="small text-muted text-uppercase">Dataset</div>
        <div class="d-flex flex-wrap align-items-center gap-2 min-w-0">
          <h6 class="mb-0 text-truncate">{{ card.name }}</h6>
          <button
            type="button"
            class="btn btn-sm btn-outline-secondary dropdown-toggle"
            :class="{ show: isDatasetOpen(card) }"
            :aria-expanded="isDatasetOpen(card)"
            :disabled="!previewLoading && !card.tables.length && !(card.tableCount > 0)"
            @click="toggleDataset(card)"
          >
            {{ card.tableCount != null ? card.tableCount : '—' }}
            {{ card.tableCount === 1 ? 'table' : 'tables' }}
          </button>
        </div>
        <div v-show="isDatasetOpen(card)" class="dataset-tables">
          <div v-if="previewLoading && !card.tables.length" class="dataset-table-meta">
            Loading table previews…
          </div>
          <div v-for="table in card.tables" :key="table.name" class="dataset-table">
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary dropdown-toggle w-100 text-start"
              :class="{ show: isTableOpen(card, table.name) }"
              :aria-expanded="isTableOpen(card, table.name)"
              @click="toggleTable(card, table.name)"
            >
              {{ table.name }}
            </button>
            <div v-show="isTableOpen(card, table.name)" class="dataset-table-preview">
              <div v-if="table.columns.length" class="table-preview-wrap">
                <table class="table table-sm table-bordered mb-0">
                  <thead>
                    <tr>
                      <th v-for="col in table.columns" :key="col">{{ col }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, idx) in table.rows || []" :key="idx">
                      <td
                        v-for="col in table.columns"
                        :key="col"
                        :title="row[col] == null ? '' : String(row[col])"
                      >
                        {{ cell(row[col]) }}
                      </td>
                    </tr>
                    <tr v-if="!(table.rows && table.rows.length)">
                      <td :colspan="table.columns.length" class="text-muted">
                        {{ previewLoading ? 'Loading…' : 'No rows' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div v-else class="dataset-table-cols">—</div>
            </div>
          </div>
        </div>
      </div>

      <div class="row g-2">
        <div class="col-6 col-md-3">
          <div class="stat-tile">
            <div class="stat-value">{{ display(formatApproxNumber(card.subjects) || card.subjects) }}</div>
            <div class="stat-label">{{ card.subjects === 1 ? 'Subject' : 'Subjects' }}</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-tile">
            <div class="stat-value" :class="{ 'stat-value--sm': card.dateRange }">
              {{ display(card.dateRange) }}
            </div>
            <div class="stat-label">Date range</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-tile">
            <div class="stat-value stat-value--sm">{{ display(card.deviceTypes) }}</div>
            <div class="stat-label">Device type</div>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <div class="stat-tile">
            <div class="stat-value">
              {{
                card.observations != null
                  ? formatApproxNumber(card.observations, card.observationsApprox)
                  : '—'
              }}
            </div>
            <div class="stat-label">
              Rows{{ card.observationsApprox ? ' (approx.)' : '' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <p class="small text-muted mb-0">
      Protocol reports (wear time, METs) live in
      <router-link :to="{ name: 'contributions' }">Contributions</router-link>.
    </p>
  </div>
</template>

<style scoped>
.stat-tile {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  padding: 0.65rem 0.75rem;
  height: 100%;
}

.stat-value {
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1.2;
}

.stat-value--sm {
  font-size: 0.95rem;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
  margin-top: 0.15rem;
}

.dataset-table-meta {
  font-size: 0.8rem;
  color: var(--bs-secondary-color);
  flex-shrink: 0;
}

.dataset-tables {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dataset-table-preview {
  margin-top: 0.35rem;
}

.dataset-table-cols {
  font-size: 0.8rem;
  color: var(--bs-secondary-color);
  word-break: break-word;
}

.table-preview-wrap {
  overflow-x: auto;
  max-width: 100%;
  margin-top: 0.25rem;
}

.table-preview-wrap table {
  font-size: 0.75rem;
  width: max-content;
  min-width: 100%;
}

.table-preview-wrap th,
.table-preview-wrap td {
  white-space: nowrap;
  max-width: 12rem;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}
</style>
