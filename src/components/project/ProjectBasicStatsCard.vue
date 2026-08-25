<script setup>
import { computed } from 'vue';
import { datasetBasicStats, formatApproxNumber } from '@/utils/datasetBasicStats';

const props = defineProps({
  datasets: { type: Array, default: () => [] },
});

const cards = computed(() => (props.datasets || []).map((row) => datasetBasicStats(row)));

function display(value) {
  if (value == null || value === '') return '—';
  return value;
}
</script>

<template>
  <div>
    <div class="card p-3 mb-3">
      <h5 class="card-title mb-1">Dataset statistics</h5>
      <p class="small text-muted mb-0">
        Subject count, date range, and device type come from dataset metadata when
        set; size is an approximate row count of mapped tables.
      </p>
    </div>

    <div v-if="cards.length === 0" class="card p-3">
      <p class="small text-muted mb-0">
        No datasets are linked to this project yet. Link a dataset on the Datasets tab
        to see statistics here.
      </p>
    </div>

    <div v-for="card in cards" :key="card.id || card.name" class="card p-3 mb-3">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
        <div class="min-w-0">
          <div class="small text-muted text-uppercase">Dataset</div>
          <h6 class="mb-0 text-truncate">{{ card.name }}</h6>
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
                  : display(card.tableCount)
              }}
            </div>
            <div class="stat-label">
              <template v-if="card.observations != null">
                Rows{{ card.observationsApprox ? ' (approx.)' : '' }}
              </template>
              <template v-else>
                {{ card.tableCount === 1 ? 'Table' : 'Tables' }}
              </template>
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
</style>
