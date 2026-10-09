<script setup>
// Cached cohort cards on the Analytics tab (ADR-019): wear compliance and METs, computed by the
// platform from the dataset's mapped signals and stored in datasets.summary. Admins can refresh
// them and set the wear protocol; everyone sees them (MVP A-07).
import { computed, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';

const props = defineProps({
  datasetId: { type: String, default: '' },
  summary: { type: Object, default: () => ({}) },
  updatedAt: { type: String, default: null },
  canManage: { type: Boolean, default: false },
});
const emit = defineEmits(['refreshed']);

const wear = computed(() => props.summary?.wear_compliance || null);
const mets = computed(() => props.summary?.mets_summary || null);
const hasAnything = computed(() => Boolean(wear.value || mets.value));

const busy = ref(false);
const error = ref('');
const showProtocol = ref(false);
const form = ref({ daily: 60, overall: 60, windows: '08:00-20:00' });
const picked = ref([]);

watch(wear, (w) => {
  const p = w?.protocol;
  if (!p) return;
  form.value = {
    daily: p.daily_band_wear_percentage ?? 60,
    overall: p.overall_band_wear_percentage ?? 60,
    windows: (p.daily_band_wear_hours || [['08:00', '20:00']]).map((x) => x.join('-')).join(', '),
  };
}, { immediate: true });

const protocolText = computed(() => {
  const p = wear.value?.protocol;
  if (!p) return '';
  const windows = (p.daily_band_wear_hours || []).map((x) => `${x[0]}–${x[1]}`).join(', ');
  return `a day counts when worn ≥ ${p.daily_band_wear_percentage}% of ${windows}; a subject counts when ≥ ${p.overall_band_wear_percentage}% of their days do`;
});

const median = (nums) => {
  const v = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!v.length) return null;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

// A-04b: the same stats, scoped to the subjects picked in the table.
const scoped = computed(() => {
  const all = wear.value?.subjects || [];
  const rows = picked.value.length ? all.filter((s) => picked.value.includes(s.subject_id)) : all;
  const m = median(rows.map((s) => s.median_daily_wear_pct));
  return {
    n: rows.length,
    compliant: rows.filter((s) => s.is_overall_compliant).length,
    median: m == null ? null : Number(m.toFixed(1)),
    filtered: picked.value.length > 0,
  };
});

function parseWindows(text) {
  return String(text || '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => s.split('-').map((x) => x.trim()));
}

async function refresh(withProtocol = false) {
  busy.value = true;
  error.value = '';
  try {
    const body = withProtocol
      ? { wear_protocol: {
          daily_band_wear_percentage: Number(form.value.daily),
          overall_band_wear_percentage: Number(form.value.overall),
          daily_band_wear_hours: parseWindows(form.value.windows),
        } }
      : {};
    await api.post(`datasets/${encodeURIComponent(props.datasetId)}/summary/refresh`, body, authHeaders());
    showProtocol.value = false;
    emit('refreshed');
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not refresh the summary.';
  } finally {
    busy.value = false;
  }
}

const updated = computed(() => (props.updatedAt ? new Date(props.updatedAt).toLocaleString() : ''));
</script>

<template>
  <div class="mb-3 cached-cohort">
    <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
      <div>
        <span class="small fw-semibold">Cached cohort summary</span>
        <span v-if="updated" class="small text-muted ms-2">Updated {{ updated }}</span>
      </div>
      <div v-if="canManage" class="d-flex gap-1">
        <button type="button" class="btn btn-sm btn-outline-secondary" :disabled="busy" @click="refresh(false)">
          <i class="bi bi-arrow-clockwise" aria-hidden="true"></i> {{ busy ? 'Refreshing…' : 'Refresh' }}
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary" @click="showProtocol = !showProtocol">
          Wear protocol…
        </button>
      </div>
    </div>

    <div v-if="error" class="alert alert-danger py-1 small">{{ error }}</div>

    <form v-if="showProtocol" class="border rounded p-2 mb-2" @submit.prevent="refresh(true)">
      <div class="row g-2 align-items-end">
        <div class="col-6 col-md-2">
          <label class="form-label small mb-0" for="wp-daily">Daily wear ≥ %</label>
          <input id="wp-daily" v-model.number="form.daily" type="number" min="1" max="100" class="form-control form-control-sm" />
        </div>
        <div class="col-6 col-md-2">
          <label class="form-label small mb-0" for="wp-overall">Days compliant ≥ %</label>
          <input id="wp-overall" v-model.number="form.overall" type="number" min="1" max="100" class="form-control form-control-sm" />
        </div>
        <div class="col-md-5">
          <label class="form-label small mb-0" for="wp-win">Daily windows (HH:MM-HH:MM, comma-separated)</label>
          <input id="wp-win" v-model="form.windows" class="form-control form-control-sm" placeholder="08:00-20:00" />
        </div>
        <div class="col-md-3 d-flex gap-2">
          <button class="btn btn-sm btn-primary" type="submit" :disabled="busy">Save &amp; refresh</button>
          <button class="btn btn-sm btn-link" type="button" @click="showProtocol = false">Cancel</button>
        </div>
      </div>
    </form>

    <p v-if="!hasAnything" class="small text-muted mb-0">
      Nothing cached yet.
      <template v-if="canManage">Refresh to compute wear compliance and METs from this dataset's signals.</template>
      <template v-else>An Admin can refresh it.</template>
    </p>

    <div v-else class="row g-2">
      <div class="col-md-6">
        <div class="border rounded p-2 small h-100">
          <div class="text-muted">Wear compliance</div>
          <template v-if="wear?.available">
            <div class="fw-semibold">
              {{ scoped.compliant }} / {{ scoped.n }} subjects compliant
              <span v-if="!scoped.filtered && wear.compliance_pct != null" class="text-muted fw-normal">({{ wear.compliance_pct }}%)</span>
            </div>
            <div>
              {{ scoped.filtered ? 'Median of their daily wear' : 'Median daily wear' }}
              <strong>{{ (scoped.filtered ? scoped.median : wear.median_daily_wear_pct) ?? '—' }}%</strong>
            </div>
            <div class="text-muted mt-1">{{ protocolText }}. Heart rate is the wear proxy.</div>
            <div v-if="wear.subjects_capped" class="text-muted">First 100 subjects only.</div>
          </template>
          <div v-else class="text-muted">{{ wear?.reason || 'Not computed yet.' }}</div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="border rounded p-2 small h-100">
          <div class="text-muted">METs summary</div>
          <template v-if="mets && mets.available !== false">
            <div class="fw-semibold">Cohort mean {{ mets.cohort_mean_mets ?? '—' }} MET</div>
            <div v-if="mets.cohort_met_hours_per_day != null">{{ mets.cohort_met_hours_per_day }} MET-hours per day</div>
          </template>
          <div v-else class="text-muted">{{ mets?.reason || 'Not computed yet.' }}</div>
        </div>
      </div>
    </div>

    <details v-if="wear?.available && wear.subjects?.length" class="mt-2">
      <summary class="small">Wear compliance by subject ({{ wear.subjects.length }})</summary>
      <div class="table-responsive border rounded mt-1" style="max-height: 240px;">
        <table class="table table-sm mb-0 small">
          <thead class="sticky-top">
            <tr>
              <th style="width: 2rem;"></th><th>Subject</th><th class="text-end">Days</th>
              <th class="text-end">Compliant days</th><th class="text-end">Overall %</th>
              <th class="text-end">Median daily %</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in wear.subjects" :key="s.subject_id">
              <td><input v-model="picked" type="checkbox" class="form-check-input" :value="s.subject_id"
                :aria-label="`Include ${s.subject_id}`" /></td>
              <td>{{ s.subject_id }}</td>
              <td class="text-end">{{ s.days_with_data }}</td>
              <td class="text-end">{{ s.compliant_days }}</td>
              <td class="text-end">{{ s.overall_compliance_percentage }}</td>
              <td class="text-end">{{ s.median_daily_wear_pct }}</td>
              <td><span class="badge" :class="s.is_overall_compliant ? 'text-bg-success' : 'text-bg-secondary'">
                {{ s.is_overall_compliant ? 'compliant' : 'not compliant' }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="small text-muted mt-1">
        Tick subjects to scope the wear numbers above to them
        <button v-if="picked.length" type="button" class="btn btn-link btn-sm p-0 align-baseline" @click="picked = []">clear</button>.
      </div>
    </details>
  </div>
</template>
