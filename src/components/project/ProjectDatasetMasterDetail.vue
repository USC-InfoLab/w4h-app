<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  datasets: { type: Array, default: () => [] },
});

const selectedId = ref('');

function summaryOf(row) {
  const raw = row?.summary;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return typeof raw === 'object' ? raw : null;
}

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

function relativeFreshness(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return 'Updated just now';
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `Updated ${mins <= 1 ? 'just now' : `${mins} minutes ago`}`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `Updated ${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  return `Updated ${days} day${days === 1 ? '' : 's'} ago`;
}

const orderedDatasets = computed(() => {
  const rows = [...(props.datasets || [])].map((d) => ({
    id: String(d.id || d.dataset_id || ''),
    name: d.name || d.id || 'Dataset',
    description: d.description || '',
    summary: summaryOf(d),
    summary_updated_at: d.summary_updated_at || null,
    table_count: Number(d.table_count ?? summaryOf(d)?.table_count ?? 0),
    physical_table_count: Number(
      d.physical_table_count ?? summaryOf(d)?.physical_table_count ?? 0
    ),
  }));
  // Stable alphabetical default until projects support an explicit primary dataset.
  rows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return rows;
});

const selected = computed(() => {
  const id = selectedId.value;
  return orderedDatasets.value.find((d) => d.id === id) || null;
});

const selectedSummary = computed(() => selected.value?.summary || {});

const cohorts = computed(() => {
  const list = selectedSummary.value?.cohorts;
  return Array.isArray(list) && list.length ? list : [];
});

const coverage = computed(() => {
  const list = selectedSummary.value?.coverage;
  return Array.isArray(list) && list.length ? list : [];
});

const hasStats = computed(() => {
  const s = selectedSummary.value;
  return Boolean(
    selected.value?.table_count != null ||
    s.observations != null ||
    s.participants != null ||
    s.participant_days != null ||
    formatDateRange(s) ||
    cohorts.value.length ||
    coverage.value.length
  );
});

function rowMeta(row) {
  const s = row.summary;
  const parts = [];
  if (s?.modality || s?.type) parts.push(s.modality || s.type);
  if (s?.participants != null) {
    parts.push(`${formatApproxNumber(s.participants)} participants`);
  }
  const range = formatDateRange(s);
  if (range) parts.push(range);
  return parts.join(' · ');
}

function selectDefault() {
  const rows = orderedDatasets.value;
  if (!rows.length) {
    selectedId.value = '';
    return;
  }
  if (!selectedId.value || !rows.some((r) => r.id === selectedId.value)) {
    selectedId.value = rows[0].id;
  }
}

watch(
  () => props.datasets,
  () => selectDefault(),
  { immediate: true, deep: true }
);
</script>

<template>
  <div v-if="orderedDatasets.length === 0" class="card p-3">
    <h5 class="card-title mb-2">Datasets on this project</h5>
    <p class="text-muted mb-0">No datasets are currently assigned to this project.</p>
  </div>

  <div v-else class="card overflow-hidden">
    <div class="row g-0">
      <div class="col-12 col-lg-5 border-end">
        <div class="p-3 border-bottom">
          <h5 class="mb-0">Datasets on this project</h5>
        </div>
        <div class="list-group list-group-flush dataset-selector">
          <button v-for="row in orderedDatasets" :key="row.id" type="button"
            class="list-group-item list-group-item-action dataset-row text-start"
            :class="{ 'dataset-row--selected': row.id === selectedId }" @click="selectedId = row.id">
            <div class="d-flex align-items-start justify-content-between gap-2">
              <div class="d-flex align-items-start gap-2 min-w-0">
                <i class="bi bi-database text-muted flex-shrink-0" aria-hidden="true"></i>
                <div class="min-w-0">
                  <div class="fw-semibold text-truncate">{{ row.name }}</div>
                  <div v-if="rowMeta(row)" class="small text-muted text-truncate">{{ rowMeta(row) }}</div>
                </div>
              </div>
              <i class="bi bi-chevron-right text-muted flex-shrink-0 mt-1" aria-hidden="true"></i>
            </div>
          </button>
        </div>
      </div>

      <div class="col-12 col-lg-7">
        <div v-if="selected" class="p-3 h-100 d-flex flex-column">
          <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
            <div class="min-w-0">
              <div class="small text-muted text-uppercase">Dataset overview</div>
              <h5 class="mb-0 text-truncate">{{ selected.name }}</h5>
            </div>
            <small v-if="selected.summary_updated_at" class="text-muted">
              {{ relativeFreshness(selected.summary_updated_at) }}
            </small>
          </div>

          <template v-if="hasStats">
            <div class="row g-2 mb-3">
              <div class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value">{{ selected.table_count }}</div>
                  <div class="stat-label">
                    {{ selected.table_count === 1 ? 'Table' : 'Tables' }}
                  </div>
                </div>
              </div>
              <div v-if="selectedSummary.observations != null" class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value">
                    {{
                      formatApproxNumber(
                        selectedSummary.observations,
                        selectedSummary.observations_approx !== false
                      )
                    }}
                  </div>
                  <div class="stat-label">Observations</div>
                </div>
              </div>
              <div v-if="selectedSummary.participants != null" class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value">{{ formatApproxNumber(selectedSummary.participants) }}</div>
                  <div class="stat-label">Participants</div>
                </div>
              </div>
              <div v-if="selectedSummary.participant_days != null" class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value">{{ formatApproxNumber(selectedSummary.participant_days) }}</div>
                  <div class="stat-label">Participant-days</div>
                </div>
              </div>
              <div v-if="formatDateRange(selectedSummary)" class="col-6 col-md-3">
                <div class="stat-tile">
                  <div class="stat-value stat-value--sm">{{ formatDateRange(selectedSummary) }}</div>
                  <div class="stat-label">Date range</div>
                </div>
              </div>
            </div>

            <div v-if="cohorts.length" class="mb-3">
              <div class="small fw-semibold mb-2">Cohorts</div>
              <div class="row g-2">
                <div v-for="(c, idx) in cohorts" :key="idx" class="col-6">
                  <div class="d-flex justify-content-between small border rounded px-2 py-1">
                    <span>{{ c.name || c.label || 'Cohort' }}</span>
                    <strong>{{ formatApproxNumber(c.count ?? c.n) }}</strong>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="coverage.length" class="mb-3 flex-grow-1">
              <div class="small fw-semibold mb-2">Data coverage</div>
              <div v-for="(c, idx) in coverage" :key="idx" class="mb-2">
                <div class="d-flex justify-content-between small mb-1">
                  <span>{{ c.label || c.name || c.modality }}</span>
                  <span>{{ Number(c.pct ?? c.percent ?? 0) }}%</span>
                </div>
                <div class="progress" style="height: 6px">
                  <div class="progress-bar" role="progressbar"
                    :style="{ width: `${Math.max(0, Math.min(100, Number(c.pct ?? c.percent ?? 0)))}%` }" />
                </div>
              </div>
            </div>

            <p v-if="selected.table_count === 0" class="small text-muted mb-3">
              No tables are registered for this dataset. Ingestion may not have been configured yet.
            </p>
            <p v-else-if="selected.physical_table_count === 0" class="small text-muted mb-3">
              {{ selected.table_count }} registered
              {{ selected.table_count === 1 ? 'table is' : 'tables are' }} not present in the
              database yet. Ingestion may not have run.
            </p>
            <p v-else-if="Number(selectedSummary.observations) === 0" class="small text-muted mb-3">
              The registered tables exist and currently report 0 observations.
            </p>
          </template>

          <div v-else class="text-muted small mb-3 flex-grow-1">
            <p v-if="selected.description" class="mb-2">{{ selected.description }}</p>
            <p class="mb-0">
              Summary statistics are not available yet for this dataset. They appear here from a
              cached metadata layer after ingestion — this page does not run live full-table counts.
            </p>
          </div>

          <div class="mt-auto pt-2">
            <router-link :to="{ name: 'home' }" class="small text-decoration-none">
              Explore this dataset →
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dataset-row {
  border-left: 3px solid transparent;
}

.dataset-row--selected {
  background: rgba(13, 110, 253, 0.06);
  border-left-color: var(--bs-primary);
}

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
