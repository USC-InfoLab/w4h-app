<script setup>
// Generic signal explorer (ADR-029 §2): charts any mapped signal of a dataset — wearable or
// clinical, any vendor — chosen from the dataset's role mapping and column types.
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';
import ChartCard from '@/components/viz/ChartCard.vue';
import {
  boxOption, eventsOption, formatTime, heatmapOption, histogramOption, lineOption,
  readTheme, scatterOption, tableFor, valueAxisName,
} from '@/components/viz/vizOptions';

const props = defineProps({
  datasetId: { type: String, default: '' },
  loaded: { type: Boolean, default: false },
});

const CHARTS = [
  { value: 'line', label: 'Time series' },
  { value: 'distribution', label: 'Distribution' },
  { value: 'coverage', label: 'Coverage' },
  { value: 'scatter', label: 'Scatter (two signals)' },
  { value: 'events', label: 'Events' },
];
const BUCKETS = [
  { value: 'auto', label: 'Auto' }, { value: '1m', label: '1 min' }, { value: '5m', label: '5 min' },
  { value: '15m', label: '15 min' }, { value: '1h', label: '1 hour' }, { value: '6h', label: '6 hours' },
  { value: '1d', label: '1 day' },
];

const catalog = ref(null);
const catalogError = ref('');
const result = ref(null);
const loading = ref(false);
const error = ref('');
const themeTick = ref(0);

const chart = ref('line');
const signal = ref('');
const value = ref('');
const subjects = ref([]);
const start = ref('');
const end = ref('');
const bucket = ref('auto');
const agg = ref('avg');
const groupBy = ref('subject');
const bins = ref(20);
const resolution = ref('day');
const xSignal = ref('');
const xValue = ref('');
const ySignal = ref('');
const yValue = ref('');
// 'utc' or 'local'. Only offered when the signal's times carry a zone (epoch or timestamptz).
const timeZone = ref('utc');
const localZoneName = Intl.DateTimeFormat().resolvedOptions().timeZone || 'your time zone';

// Plain-language labels for the in-app help.
const ROLE_LABELS = {
  numeric: 'Number',
  categorical: 'Category (text)',
  boolean: 'Yes / No',
};
const roleLabel = (role) => ROLE_LABELS[role] || role;
function timeLabel(time) {
  if (!time) return 'No time column';
  const cols = time.columns.join(' + ');
  if (time.source === 'epoch') return `${cols} — Unix time, converted to dates (UTC)`;
  if (time.source === 'date_time') return `${cols} — separate date and time, as recorded`;
  if (time.source === 'date') return `${cols} — one value per day`;
  return time.zone === 'utc' ? `${cols} — date and time with a time zone (UTC)` : `${cols} — date and time as recorded (no time zone)`;
}

const signals = computed(() => catalog.value?.signals || []);
const timeSignals = computed(() => signals.value.filter((s) => s.has_time));
const numericOf = (s) => (s?.values || []).filter((v) => v.role === 'numeric');
const numericSignals = computed(() => signals.value.filter((s) => numericOf(s).length));

const signalChoices = computed(() => {
  switch (chart.value) {
    case 'line': return timeSignals.value.filter((s) => numericOf(s).length);
    case 'distribution': return numericSignals.value;
    case 'coverage': return timeSignals.value;
    case 'events': return timeSignals.value.filter((s) => s.values.length);
    default: return signals.value;
  }
});
const currentSignal = computed(() => signals.value.find((s) => s.name === signal.value) || null);
const zoneAware = computed(() => chart.value !== 'scatter' && currentSignal.value?.time?.zone === 'utc');
// Coverage buckets are whole UTC days/hours, so only line and event charts can switch zone.
const canSwitchZone = computed(() => zoneAware.value && ['line', 'events'].includes(chart.value));
const showUtc = computed(() => !canSwitchZone.value || timeZone.value === 'utc');
const cellFormatter = (cell) => formatTime(cell, { utc: showUtc.value });

// Help follows the selection: the chosen signal, or both signals of a scatter.
const helpSignals = computed(() => {
  if (chart.value !== 'scatter') return currentSignal.value ? [currentSignal.value] : [];
  const names = [...new Set([xSignal.value, ySignal.value].filter(Boolean))];
  return names.map((n) => signals.value.find((s) => s.name === n)).filter(Boolean);
});
function isSelectedValue(s, v) {
  if (chart.value === 'coverage') return false;
  if (chart.value !== 'scatter') return v.name === value.value;
  return (s.name === xSignal.value && v.name === xValue.value) || (s.name === ySignal.value && v.name === yValue.value);
}
const valueChoices = computed(() => {
  const s = currentSignal.value;
  if (!s) return [];
  return chart.value === 'events' ? s.values : numericOf(s);
});
const scatterSignals = computed(() => timeSignals.value.filter((s) => numericOf(s).length));
const availableCharts = computed(() => CHARTS.filter((c) => {
  if (c.value === 'scatter') return scatterSignals.value.length >= 2;
  if (c.value === 'line') return timeSignals.value.some((s) => numericOf(s).length);
  if (c.value === 'distribution') return numericSignals.value.length > 0;
  if (c.value === 'coverage') return timeSignals.value.length > 0;
  return timeSignals.value.some((s) => s.values.length);
}));

function pickDefaults() {
  const c = catalog.value;
  if (!c) return;
  if (!availableCharts.value.some((a) => a.value === chart.value)) {
    chart.value = availableCharts.value[0]?.value || 'line';
  }
  if (!signalChoices.value.some((s) => s.name === signal.value)) {
    signal.value = signalChoices.value[0]?.name || '';
  }
  if (!valueChoices.value.some((v) => v.name === value.value)) {
    value.value = valueChoices.value[0]?.name || '';
  }
  if (chart.value === 'scatter') {
    const list = scatterSignals.value;
    if (!list.some((s) => s.name === xSignal.value)) xSignal.value = list[0]?.name || '';
    if (!list.some((s) => s.name === ySignal.value)) ySignal.value = (list[1] || list[0])?.name || '';
    const xv = numericOf(list.find((s) => s.name === xSignal.value));
    const yv = numericOf(list.find((s) => s.name === ySignal.value));
    if (!xv.some((v) => v.name === xValue.value)) xValue.value = xv[0]?.name || '';
    if (!yv.some((v) => v.name === yValue.value)) yValue.value = yv[0]?.name || '';
  }
}

async function loadCatalog() {
  catalog.value = null;
  result.value = null;
  catalogError.value = '';
  if (!props.datasetId || !props.loaded) return;
  try {
    const res = await api.get(`datasets/${encodeURIComponent(props.datasetId)}/analytics/catalog`, authHeaders());
    catalog.value = res.data;
    start.value = (res.data.start || '').slice(0, 10);
    end.value = (res.data.end || '').slice(0, 10);
    subjects.value = [];
    pickDefaults();
    await run();
  } catch (e) {
    catalogError.value = e.response?.data?.error || 'Could not read this dataset’s signals.';
  }
}

let timer = null;
function schedule() {
  clearTimeout(timer);
  timer = setTimeout(run, 250);
}
onBeforeUnmount(() => clearTimeout(timer));

function bodyFor() {
  const common = { subjects: subjects.value, start: start.value || undefined, end: end.value || undefined };
  switch (chart.value) {
    case 'line':
      return { kind: 'series', signal: signal.value, value: value.value, bucket: bucket.value, agg: agg.value, group_by: groupBy.value, ...common };
    case 'distribution':
      return { kind: 'distribution', signal: signal.value, value: value.value, bins: Number(bins.value), ...common };
    case 'coverage':
      return { kind: 'coverage', signal: signal.value, resolution: resolution.value, ...common };
    case 'scatter':
      return { kind: 'scatter', x: { signal: xSignal.value, value: xValue.value }, y: { signal: ySignal.value, value: yValue.value }, bucket: bucket.value, ...common };
    default:
      return { kind: 'events', signal: signal.value, value: value.value, ...common };
  }
}

async function run() {
  if (!props.datasetId || !catalog.value) return;
  if (chart.value !== 'scatter' && !signal.value) return;
  loading.value = true;
  error.value = '';
  try {
    const res = await api.post(`datasets/${encodeURIComponent(props.datasetId)}/analytics/series`, bodyFor(), authHeaders());
    result.value = res.data;
  } catch (e) {
    result.value = null;
    error.value = e.response?.data?.error || 'Could not build this chart.';
  } finally {
    loading.value = false;
  }
}

watch(() => [props.datasetId, props.loaded], loadCatalog, { immediate: true });
watch(chart, () => { pickDefaults(); schedule(); });
watch(signal, () => { pickDefaults(); schedule(); });
watch([xSignal, ySignal], () => { pickDefaults(); schedule(); });
watch([value, subjects, start, end, bucket, agg, groupBy, bins, resolution, xValue, yValue], schedule, { deep: true });

const title = computed(() => {
  const r = result.value;
  if (!r) return '';
  if (r.kind === 'scatter') return `${r.y.signal} · ${r.y.value} vs ${r.x.signal} · ${r.x.value}`;
  return `${r.signal || ''}${r.value ? ' · ' + r.value : ''}`;
});
const subtitle = computed(() => {
  const r = result.value;
  if (!r) return '';
  const bits = [];
  if (r.bucket_seconds) bits.push(`${r.agg || 'avg'} per ${r.bucket_seconds >= 86400 ? r.bucket_seconds / 86400 + ' d' : r.bucket_seconds >= 3600 ? r.bucket_seconds / 3600 + ' h' : r.bucket_seconds / 60 + ' min'}`);
  if (r.truncated) bits.push('truncated — narrow the range or subjects');
  if (['series', 'events', 'coverage'].includes(r.kind)) {
    bits.push(zoneAware.value ? (showUtc.value ? 'times in UTC' : `times in ${localZoneName}`) : 'times as recorded');
  }
  return bits.join(' · ');
});
const theme = computed(() => { themeTick.value; return readTheme(); });
const filename = computed(() => `${chart.value}-${(title.value || 'chart').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 80));

const cards = computed(() => {
  const r = result.value;
  if (!r) return [];
  const t = theme.value;
  if (r.kind === 'series') return [{ key: 'line', option: r.series.length ? lineOption(r.series, t, { yName: valueAxisName(r.value, r.unit), utc: showUtc.value }) : null, table: tableFor('series', r) }];
  if (r.kind === 'distribution') {
    return [
      { key: 'hist', title: 'Distribution', option: r.histogram.length ? histogramOption(r.histogram, t, { xName: valueAxisName(r.value, r.unit) }) : null, table: tableFor('distribution', r) },
      { key: 'box', title: 'Spread per subject', option: r.box.length ? boxOption(r.box, t, { yName: valueAxisName(r.value, r.unit) }) : null, table: tableFor('box', r) },
    ];
  }
  if (r.kind === 'coverage') return [{ key: 'cov', option: r.cells.length ? heatmapOption(r, t) : null, table: tableFor('coverage', r) }];
  if (r.kind === 'scatter') return [{ key: 'sc', option: r.points.length ? scatterOption(r, t) : null, table: tableFor('scatter', r) }];
  return [{ key: 'ev', option: r.events.length ? eventsOption(r, t, { utc: showUtc.value }) : null, table: tableFor('events', r) }];
});
</script>

<template>
  <div class="card p-3 mb-3 signal-explorer">
    <div class="mb-2">
      <h6 class="mb-0">Explore signals</h6>
      <p class="small text-muted mb-0">
        Chart any signal of this dataset — wearable or clinical, any vendor. Charts are built from the
        dataset's column mapping and show aggregates, not raw rows.
      </p>
    </div>

    <div v-if="!loaded" class="small text-muted">Load tables on the Datasets tab to explore signals.</div>
    <div v-else-if="catalogError" class="alert alert-danger small py-2 mb-0">{{ catalogError }}</div>
    <div v-else-if="!catalog" class="small text-muted">
      <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Reading signals…
    </div>
    <div v-else-if="!availableCharts.length" class="small text-muted">
      This dataset has no signal with a time or numeric column to chart yet.
    </div>
    <template v-else>
      <div class="row g-2 align-items-end mb-2">
        <div class="col-6 col-md-3">
          <label class="form-label small mb-0" for="viz-chart">Chart</label>
          <select id="viz-chart" v-model="chart" class="form-select form-select-sm">
            <option v-for="c in availableCharts" :key="c.value" :value="c.value">{{ c.label }}</option>
          </select>
        </div>

        <template v-if="chart !== 'scatter'">
          <div class="col-6 col-md-3">
            <label class="form-label small mb-0" for="viz-signal">Signal</label>
            <select id="viz-signal" v-model="signal" class="form-select form-select-sm">
              <option v-for="s in signalChoices" :key="s.name" :value="s.name">{{ s.name }}</option>
            </select>
          </div>
          <div v-if="chart !== 'coverage'" class="col-6 col-md-3">
            <label class="form-label small mb-0" for="viz-value">{{ chart === 'events' ? 'Label' : 'Value' }}</label>
            <select id="viz-value" v-model="value" class="form-select form-select-sm">
              <option v-for="v in valueChoices" :key="v.name" :value="v.name">{{ v.name }}</option>
            </select>
          </div>
        </template>
        <template v-else>
          <div class="col-6 col-md-3">
            <label class="form-label small mb-0" for="viz-xs">X signal</label>
            <select id="viz-xs" v-model="xSignal" class="form-select form-select-sm">
              <option v-for="s in scatterSignals" :key="s.name" :value="s.name">{{ s.name }}</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small mb-0" for="viz-xv">X value</label>
            <select id="viz-xv" v-model="xValue" class="form-select form-select-sm">
              <option v-for="v in numericOf(signals.find((s) => s.name === xSignal))" :key="v.name" :value="v.name">{{ v.name }}</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small mb-0" for="viz-ys">Y signal</label>
            <select id="viz-ys" v-model="ySignal" class="form-select form-select-sm">
              <option v-for="s in scatterSignals" :key="s.name" :value="s.name">{{ s.name }}</option>
            </select>
          </div>
          <div class="col-6 col-md-3">
            <label class="form-label small mb-0" for="viz-yv">Y value</label>
            <select id="viz-yv" v-model="yValue" class="form-select form-select-sm">
              <option v-for="v in numericOf(signals.find((s) => s.name === ySignal))" :key="v.name" :value="v.name">{{ v.name }}</option>
            </select>
          </div>
        </template>
      </div>

      <details v-if="helpSignals.length" class="small mb-3">
        <summary>
          <i class="bi bi-info-circle" aria-hidden="true"></i>
          About {{ helpSignals.map((h) => h.name).join(' and ') }} — values, types and units
        </summary>
        <div class="border rounded p-2 mt-2">
          <div v-for="s in helpSignals" :key="s.name" class="mb-3">
            <div class="d-flex flex-wrap align-items-baseline justify-content-between gap-2">
              <div>
                <span class="fw-semibold">{{ s.name }}</span>
                <span v-if="s.description" class="text-muted"> — {{ s.description }}</span>
              </div>
              <a v-if="s.source_url" :href="s.source_url" target="_blank" rel="noopener noreferrer">
                {{ s.source_name ? `${s.source_name} documentation` : 'Vendor documentation' }}
                <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
              </a>
            </div>
            <div class="text-muted">
              Time: {{ timeLabel(s.time) }}<span v-if="s.interval_minutes"> · one row every {{ s.interval_minutes }} min</span>
              <span v-if="s.subject_column"> · Subject: {{ s.subject_column }}</span>
              <span v-if="s.span?.start"> · {{ formatTime(s.span.start) }} → {{ formatTime(s.span.end) }}</span>
            </div>
            <div class="table-responsive">
              <table class="table table-sm mb-0 mt-1">
                <thead>
                  <tr><th>Value</th><th>Type</th><th>Unit</th><th>What it means</th></tr>
                </thead>
                <tbody>
                  <tr
                    v-for="v in s.values"
                    :key="v.name"
                    :class="{ 'table-active': isSelectedValue(s, v) }"
                    :aria-current="isSelectedValue(s, v) ? 'true' : undefined"
                  >
                    <td><code>{{ v.name }}</code></td>
                    <td :title="v.type">{{ roleLabel(v.role) }}</td>
                    <td>{{ v.unit || '—' }}</td>
                    <td>{{ v.description || '—' }}</td>
                  </tr>
                  <tr v-if="!s.values.length">
                    <td colspan="4" class="text-muted">No chartable values (only subject and time).</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p class="text-muted mb-0">
            <em>Number</em> values can be drawn as a time series, distribution or scatter; <em>Category</em>
            values (text labels or codes) are drawn as events. Charts show an aggregate per time bucket, not every
            raw row. From/To are whole days: UTC days when the signal's time is UTC, otherwise days as recorded.
          </p>
        </div>
      </details>

      <div class="row g-2 align-items-end mb-3">
        <div class="col-6 col-md-3">
          <label class="form-label small mb-0" for="viz-start">From</label>
          <input id="viz-start" v-model="start" type="date" class="form-control form-control-sm" />
        </div>
        <div class="col-6 col-md-3">
          <label class="form-label small mb-0" for="viz-end">To</label>
          <input id="viz-end" v-model="end" type="date" class="form-control form-control-sm" />
        </div>
        <div v-if="chart === 'line' || chart === 'scatter'" class="col-6 col-md-2">
          <label class="form-label small mb-0" for="viz-bucket">Bucket</label>
          <select id="viz-bucket" v-model="bucket" class="form-select form-select-sm">
            <option v-for="b in BUCKETS" :key="b.value" :value="b.value">{{ b.label }}</option>
          </select>
        </div>
        <div v-if="chart === 'line'" class="col-6 col-md-2">
          <label class="form-label small mb-0" for="viz-agg">Aggregate</label>
          <select id="viz-agg" v-model="agg" class="form-select form-select-sm">
            <option v-for="a in catalog.aggregates" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div v-if="chart === 'line'" class="col-6 col-md-2">
          <label class="form-label small mb-0" for="viz-group">Lines</label>
          <select id="viz-group" v-model="groupBy" class="form-select form-select-sm">
            <option value="subject">Per subject</option>
            <option value="none">All subjects</option>
          </select>
        </div>
        <div v-if="chart === 'distribution'" class="col-6 col-md-2">
          <label class="form-label small mb-0" for="viz-bins">Bins</label>
          <input id="viz-bins" v-model.number="bins" type="number" min="4" max="60" class="form-control form-control-sm" />
        </div>
        <div v-if="chart === 'coverage'" class="col-6 col-md-2">
          <label class="form-label small mb-0" for="viz-res">Resolution</label>
          <select id="viz-res" v-model="resolution" class="form-select form-select-sm">
            <option value="day">Day</option><option value="hour">Hour</option>
          </select>
        </div>
        <div v-if="canSwitchZone" class="col-6 col-md-2">
          <label class="form-label small mb-0" for="viz-tz">Show times in</label>
          <select id="viz-tz" v-model="timeZone" class="form-select form-select-sm">
            <option value="utc">UTC</option>
            <option value="local">{{ localZoneName }}</option>
          </select>
        </div>
        <div class="col-12 col-md">
          <label class="form-label small mb-0" for="viz-subjects">Subjects <span class="text-muted">(none selected = first 12)</span></label>
          <select id="viz-subjects" v-model="subjects" multiple size="2" class="form-select form-select-sm">
            <option v-for="s in catalog.subjects" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>

      <ChartCard
        v-for="card in cards"
        :key="card.key"
        class="mb-2"
        :title="card.title || title"
        :subtitle="card.title ? '' : subtitle"
        :option="card.option"
        :table="card.table"
        :loading="loading && !result"
        :error="error"
        :height="chart === 'coverage' ? 340 : 300"
        :filename="filename"
        :format-cell="cellFormatter"
        @theme-changed="themeTick += 1"
      />
      <ChartCard v-if="!cards.length" :loading="loading" :error="error" :option="null" />
    </template>
  </div>
</template>
