<script setup>
import { computed } from 'vue';

const props = defineProps({
  tableCount: { type: Number, default: 0 },
  summary: { type: Object, default: () => ({}) },
});

function formatApproxNumber(value, approx = false) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value);
  const abs = Math.abs(n);
  let text;
  if (abs >= 1e9) text = `${(n / 1e9).toFixed(1).replace(/\.0$/, '')}B`;
  else if (abs >= 1e6) text = `${(n / 1e6).toFixed(1).replace(/\.0$/, '')}M`;
  else if (abs >= 1e3) text = `${(n / 1e3).toFixed(0)}k`;
  else text = String(Math.round(n));
  return (approx || abs >= 1e6) && abs > 0 ? `~${text}` : text;
}

function formatDateRange(summary) {
  if (!summary) return '';
  if (summary.date_range) return String(summary.date_range);
  const start = summary.date_start || summary.start_date;
  const end = summary.date_end || summary.end_date;
  if (!start && !end) return '';
  const fmt = (v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
  };
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt(start || end);
}

const dateRangeLabel = computed(() => formatDateRange(props.summary));

const hasStats = computed(() => {
  const s = props.summary || {};
  return Boolean(
    props.tableCount != null ||
    s.observations != null ||
    s.participants != null ||
    s.participant_days != null ||
    s.modality != null ||
    dateRangeLabel.value
  );
});
</script>

<template>
  <div v-if="hasStats" class="row g-2">
    <div class="col-6 col-md-3">
      <div class="stat-tile">
        <div class="stat-value">{{ tableCount }}</div>
        <div class="stat-label">{{ tableCount === 1 ? 'Table' : 'Tables' }}</div>
      </div>
    </div>
    <div v-if="summary.observations != null" class="col-6 col-md-3">
      <div class="stat-tile">
        <div class="stat-value">
          {{ formatApproxNumber(summary.observations, summary.observations_approx !== false) }}
        </div>
        <div class="stat-label">Observations</div>
      </div>
    </div>
    <div v-if="summary.participants != null" class="col-6 col-md-3">
      <div class="stat-tile">
        <div class="stat-value">{{ formatApproxNumber(summary.participants) }}</div>
        <div class="stat-label">Participants</div>
      </div>
    </div>
    <div v-if="summary.participant_days != null" class="col-6 col-md-3">
      <div class="stat-tile">
        <div class="stat-value">{{ formatApproxNumber(summary.participant_days) }}</div>
        <div class="stat-label">Participant-days</div>
      </div>
    </div>
    <div v-if="dateRangeLabel" class="col-6 col-md-3">
      <div class="stat-tile">
        <div class="stat-value stat-value--sm">{{ dateRangeLabel }}</div>
        <div class="stat-label">Date range</div>
      </div>
    </div>
    <div v-if="summary.modality" class="col-6 col-md-3">
      <div class="stat-tile">
        <div class="stat-value stat-value--sm">{{ summary.modality }}</div>
        <div class="stat-label">Device type</div>
      </div>
    </div>
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
