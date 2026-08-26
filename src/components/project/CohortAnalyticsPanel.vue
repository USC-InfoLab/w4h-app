<script setup>
import { computed, ref, watch } from 'vue';
import Multiselect from '@vueform/multiselect';
import { api, authHeaders } from '@/utils/api';
import CohortLineChart from '@/components/project/CohortLineChart.vue';

const props = defineProps({
  datasetId: { type: String, default: '' },
  loaded: { type: Boolean, default: false },
});

const setup = ref(null);
const setupError = ref('');
const setupLoading = ref(false);
const subjectIds = ref([]);
const controlMode = ref('all');
const controlIds = ref([]);
const startDate = ref('');
const endDate = ref('');
const timeWindows = ref([]);
const running = ref(false);
const runError = ref('');
const result = ref(null);

const DEMO_WINDOWS = [
  { label: 'Workout #1', start: '06:45', end: '09:30' },
  { label: 'Workout #2', start: '12:30', end: '16:00' },
  { label: 'Sleep schedule', start: '20:00', end: '04:45' },
];

const subjects = computed(() => setup.value?.subjects || []);
const signals = computed(() => setup.value?.signals || []);
const canRun = computed(
  () =>
    props.loaded &&
    subjectIds.value.length > 0 &&
    startDate.value &&
    endDate.value &&
    !running.value &&
    (controlMode.value !== 'ids' || controlIds.value.length > 0)
);

const resultSignals = computed(() => {
  const map = result.value?.signals || {};
  const order = ['heart_rate', 'calories', 'mets_computed', 'mets'];
  return order.filter((key) => map[key]).map((key) => ({ key, ...map[key] }));
});

const primaryKpis = computed(() => {
  const map = result.value?.signals || {};
  const rows = [];
  if (map.heart_rate) {
    rows.push({
      key: 'hr-avg',
      label: 'Average heart rate',
      value: map.heart_rate.selected?.avg,
      delta: map.heart_rate.delta_avg,
    });
    rows.push({
      key: 'hr-min',
      label: 'Min heart rate',
      value: map.heart_rate.selected?.min,
      delta:
        map.heart_rate.selected?.min != null && map.heart_rate.control?.avg != null
          ? roundDelta(map.heart_rate.selected.min - map.heart_rate.control.avg)
          : null,
    });
    rows.push({
      key: 'hr-max',
      label: 'Max heart rate',
      value: map.heart_rate.selected?.max,
      delta:
        map.heart_rate.selected?.max != null && map.heart_rate.control?.avg != null
          ? roundDelta(map.heart_rate.selected.max - map.heart_rate.control.avg)
          : null,
    });
  }
  if (map.calories) {
    rows.push({
      key: 'cal',
      label: 'Avg calories',
      value: map.calories.selected?.avg,
      delta: map.calories.delta_avg,
    });
  }
  const mets = map.mets_computed || map.mets;
  if (mets) {
    rows.push({
      key: 'mets',
      label: 'Avg METs',
      value: mets.selected?.avg,
      delta: mets.delta_avg,
    });
  }
  return rows;
});

function roundDelta(value) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  return Number(Number(value).toFixed(2));
}

function formatNum(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function deltaText(delta) {
  if (delta == null) return 'vs control';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${formatNum(delta)} vs control`;
}

function barHeight(value, other) {
  const a = Number(value);
  const b = Number(other);
  const max = Math.max(a || 0, b || 0, 0.0001);
  if (!Number.isFinite(a)) return 0;
  return Math.max(4, (a / max) * 100);
}

async function loadSetup(datasetId) {
  setup.value = null;
  result.value = null;
  runError.value = '';
  setupError.value = '';
  subjectIds.value = [];
  controlIds.value = [];
  if (!datasetId || !props.loaded) return;
  setupLoading.value = true;
  try {
    const res = await api.get(
      `/datasets/${encodeURIComponent(datasetId)}/analytics/cohort`,
      authHeaders()
    );
    setup.value = res.data || null;
    const range = res.data?.date_range;
    startDate.value = range?.start || '';
    endDate.value = range?.end || '';
    const ids = res.data?.subjects || [];
    if (ids.length) subjectIds.value = [ids[0]];
  } catch (err) {
    setupError.value = err.response?.data?.error || err.message || 'Failed to load subjects';
  } finally {
    setupLoading.value = false;
  }
}

watch(
  [() => props.datasetId, () => props.loaded],
  ([id]) => loadSetup(id),
  { immediate: true }
);

function addWindow() {
  const next = DEMO_WINDOWS[timeWindows.value.length] || {
    label: `Time range ${timeWindows.value.length + 1}`,
    start: '08:00',
    end: '12:00',
  };
  timeWindows.value = [...timeWindows.value, { ...next }];
}

function removeWindow(idx) {
  timeWindows.value = timeWindows.value.filter((_, i) => i !== idx);
}

function fillDemoWindows() {
  timeWindows.value = DEMO_WINDOWS.map((w) => ({ ...w }));
}

async function runComparison() {
  if (!canRun.value) return;
  running.value = true;
  runError.value = '';
  result.value = null;
  try {
    const res = await api.post(
      `/datasets/${encodeURIComponent(props.datasetId)}/analytics/cohort`,
      {
        subject_ids: subjectIds.value,
        control: {
          mode: controlMode.value,
          ids: controlMode.value === 'ids' ? controlIds.value : [],
        },
        start: startDate.value,
        end: endDate.value,
        time_windows: timeWindows.value,
      },
      authHeaders()
    );
    result.value = res.data;
  } catch (err) {
    runError.value = err.response?.data?.error || err.message || 'Comparison failed';
  } finally {
    running.value = false;
  }
}
</script>

<template>
  <div class="border rounded p-3 mb-3">
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
      <div>
        <h6 class="mb-1">Cohort comparison</h6>
        <p class="small text-muted mb-0">
          Compare selected subjects to a control group on mapped heart rate, calories, and METs
          (ICDE demo offline query). Groups are filter-based, not statistically matched.
        </p>
      </div>
    </div>

    <div v-if="!loaded" class="small text-muted">Load tables on the Datasets tab first.</div>
    <div v-else-if="setupLoading" class="small text-muted">Loading subjects…</div>
    <div v-else-if="setupError" class="alert alert-warning py-2 small mb-0">{{ setupError }}</div>
    <div v-else-if="!signals.length" class="small text-muted">
      {{ setup?.reason || 'No heart rate, calories, or METs signals mapped on this dataset.' }}
    </div>
    <template v-else>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label small mb-1">Selected subjects</label>
          <Multiselect
            v-model="subjectIds"
            mode="tags"
            :options="subjects"
            :searchable="true"
            :close-on-select="false"
            placeholder="Choose subject IDs"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label small mb-1">Control group</label>
          <div class="d-flex flex-wrap gap-3 small mb-2">
            <label class="mb-0">
              <input v-model="controlMode" class="form-check-input me-1" type="radio" value="all" />
              Entire dataset
            </label>
            <label class="mb-0">
              <input v-model="controlMode" class="form-check-input me-1" type="radio" value="rest" />
              Everyone else
            </label>
            <label class="mb-0">
              <input v-model="controlMode" class="form-check-input me-1" type="radio" value="ids" />
              Specific IDs
            </label>
          </div>
          <Multiselect
            v-if="controlMode === 'ids'"
            v-model="controlIds"
            mode="tags"
            :options="subjects"
            :searchable="true"
            :close-on-select="false"
            placeholder="Control subject IDs"
          />
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-1" for="cohort-start">Start date</label>
          <input id="cohort-start" v-model="startDate" type="date" class="form-control form-control-sm" />
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-1" for="cohort-end">End date</label>
          <input id="cohort-end" v-model="endDate" type="date" class="form-control form-control-sm" />
        </div>
        <div class="col-md-6 d-flex align-items-end">
          <button
            type="button"
            class="btn btn-sm btn-primary"
            :disabled="!canRun"
            @click="runComparison"
          >
            {{ running ? 'Running…' : 'Show results' }}
          </button>
        </div>
      </div>

      <div class="mt-3">
        <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
          <span class="small fw-semibold">Time-of-day windows</span>
          <span class="small text-muted">(optional, recurring each day)</span>
          <button type="button" class="btn btn-sm btn-outline-secondary" @click="addWindow">
            Add window
          </button>
          <button
            v-if="!timeWindows.length"
            type="button"
            class="btn btn-sm btn-link"
            @click="fillDemoWindows"
          >
            Use ICDE demo windows
          </button>
        </div>
        <div v-for="(win, idx) in timeWindows" :key="idx" class="row g-2 align-items-end mb-2">
          <div class="col-md-4">
            <label class="form-label small mb-0">Label</label>
            <input v-model="win.label" type="text" class="form-control form-control-sm" />
          </div>
          <div class="col-md-3">
            <label class="form-label small mb-0">Start</label>
            <input v-model="win.start" type="time" class="form-control form-control-sm" />
          </div>
          <div class="col-md-3">
            <label class="form-label small mb-0">End</label>
            <input v-model="win.end" type="time" class="form-control form-control-sm" />
          </div>
          <div class="col-md-2">
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="removeWindow(idx)">
              Remove
            </button>
          </div>
        </div>
      </div>

      <div v-if="runError" class="alert alert-danger py-2 small mt-3 mb-0">{{ runError }}</div>

      <div v-if="result" class="mt-3">
        <p class="small text-muted mb-2">
          {{ result.note }}
          Selected {{ result.selected_ids?.length || 0 }} · control {{ result.control_ids?.length || 0 }}
          · {{ result.start }} to {{ result.end }}.
        </p>
        <div class="row g-2 mb-3">
          <div v-for="kpi in primaryKpis" :key="kpi.key" class="col-6 col-lg">
            <div class="border rounded p-2 h-100">
              <div class="text-muted small">{{ kpi.label }}</div>
              <div class="fs-5 fw-semibold">{{ formatNum(kpi.value) }}</div>
              <div class="small" :class="kpi.delta > 0 ? 'text-success' : kpi.delta < 0 ? 'text-danger' : 'text-muted'">
                {{ deltaText(kpi.delta) }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="result.signals?.heart_rate" class="mb-3">
          <CohortLineChart
            label="Heart rate"
            :series="result.signals.heart_rate.series"
            :band="result.signals.heart_rate.safe_band"
          />
        </div>
        <details v-if="result.signals?.calories || result.signals?.mets_computed || result.signals?.mets">
          <summary class="small fw-semibold">Calories and METs plots</summary>
          <div class="mt-2">
            <CohortLineChart
              v-if="result.signals.calories"
              class="mb-3"
              label="Calories"
              :series="result.signals.calories.series"
            />
            <CohortLineChart
              v-if="result.signals.mets_computed || result.signals.mets"
              label="METs"
              :series="(result.signals.mets_computed || result.signals.mets).series"
            />
          </div>
        </details>
        <p v-else-if="!result.signals?.mets_computed && !result.signals?.mets" class="small text-muted mt-2">
          METs appear after a mapped <code>mets</code> or <code>mets_computed</code> table exists
          (run the SQL compute-METs contribution).
        </p>

        <div class="small fw-semibold mt-3 mb-2">Selected vs control averages</div>
        <div class="row g-3">
          <div v-for="sig in resultSignals" :key="sig.key" class="col-md-4">
            <div class="small text-muted mb-1">{{ sig.label }}</div>
            <div class="d-flex gap-3">
              <div class="flex-fill text-center">
                <div class="cohort-bar-track">
                  <div
                    class="cohort-bar cohort-bar--selected"
                    :style="{ height: barHeight(sig.selected?.avg, sig.control?.avg) + '%' }"
                  />
                </div>
                <div class="small mt-1">Selected</div>
                <div class="small fw-semibold">{{ formatNum(sig.selected?.avg) }}</div>
              </div>
              <div class="flex-fill text-center">
                <div class="cohort-bar-track">
                  <div
                    class="cohort-bar cohort-bar--control"
                    :style="{ height: barHeight(sig.control?.avg, sig.selected?.avg) + '%' }"
                  />
                </div>
                <div class="small mt-1">Control</div>
                <div class="small fw-semibold">{{ formatNum(sig.control?.avg) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="result.windows?.length" class="mt-3">
          <div class="small fw-semibold mb-2">Selected time windows</div>
          <details v-for="(win, idx) in result.windows" :key="idx" class="mb-2">
            <summary class="small">
              {{ win.label }}: {{ win.start }} to {{ win.end }}
            </summary>
            <div class="row g-2 mt-2">
              <div
                v-for="key in ['heart_rate', 'calories', 'mets_computed', 'mets']"
                :key="key"
                class="col-md-4"
              >
                <div v-if="win.signals?.[key]" class="border rounded p-2 small">
                  <div class="text-muted">{{ win.signals[key].label }}</div>
                  <div>
                    Selected {{ formatNum(win.signals[key].selected?.avg) }}
                    · control {{ formatNum(win.signals[key].control?.avg) }}
                  </div>
                  <div :class="win.signals[key].delta_avg > 0 ? 'text-success' : win.signals[key].delta_avg < 0 ? 'text-danger' : 'text-muted'">
                    {{ deltaText(win.signals[key].delta_avg) }}
                  </div>
                </div>
              </div>
            </div>
          </details>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cohort-bar-track {
  height: 120px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.cohort-bar {
  width: 2.25rem;
  border-radius: 0.25rem 0.25rem 0 0;
}
.cohort-bar--selected {
  background: #636efa;
}
.cohort-bar--control {
  background: #00b050;
}
</style>
