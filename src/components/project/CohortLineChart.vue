<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: { type: String, default: '' },
  series: { type: Object, default: () => ({ control: [], subjects: {} }) },
  band: { type: Object, default: null },
});

const SUBJECT_COLORS = ['#636efa', '#ef553b', '#ab63fa', '#ffa15a', '#19d3f3', '#ff6692', '#b6e880', '#ff97ff'];
const W = 640;
const H = 220;
const PAD = { l: 44, r: 12, t: 14, b: 28 };

const subjectEntries = computed(() => {
  const subjects = props.series?.subjects || {};
  return Object.keys(subjects).sort().map((id, idx) => ({
    id,
    points: (subjects[id] || []).filter((p) => p?.t && p.avg != null),
    color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
  }));
});

const controlPoints = computed(() =>
  (props.series?.control || []).filter((p) => p?.t && p.avg != null)
);

const allPoints = computed(() => [
  ...controlPoints.value,
  ...subjectEntries.value.flatMap((s) => s.points),
]);

const domain = computed(() => {
  const pts = allPoints.value;
  if (!pts.length) return null;
  const times = pts.map((p) => new Date(p.t).getTime()).filter((n) => Number.isFinite(n));
  const vals = pts.map((p) => Number(p.avg)).filter((n) => Number.isFinite(n));
  if (props.band?.min != null) vals.push(Number(props.band.min));
  if (props.band?.max != null) vals.push(Number(props.band.max));
  if (!times.length || !vals.length) return null;
  let yMin = Math.min(...vals);
  let yMax = Math.max(...vals);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const pad = (yMax - yMin) * 0.08;
  return {
    t0: Math.min(...times),
    t1: Math.max(...times),
    y0: yMin - pad,
    y1: yMax + pad,
  };
});

function xOf(t) {
  const d = domain.value;
  const inner = W - PAD.l - PAD.r;
  if (!d || d.t1 === d.t0) return PAD.l;
  return PAD.l + ((new Date(t).getTime() - d.t0) / (d.t1 - d.t0)) * inner;
}

function yOf(v) {
  const d = domain.value;
  const inner = H - PAD.t - PAD.b;
  if (!d || d.y1 === d.y0) return PAD.t + inner / 2;
  return PAD.t + ((d.y1 - v) / (d.y1 - d.y0)) * inner;
}

function linePath(points) {
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(p.t).toFixed(1)} ${yOf(p.avg).toFixed(1)}`)
    .join(' ');
}

const bandRect = computed(() => {
  const d = domain.value;
  const band = props.band;
  if (!d || band?.min == null || band?.max == null) return null;
  const yTop = yOf(band.max);
  const yBot = yOf(band.min);
  return {
    x: PAD.l,
    y: Math.min(yTop, yBot),
    width: W - PAD.l - PAD.r,
    height: Math.max(1, Math.abs(yBot - yTop)),
  };
});

const yTicks = computed(() => {
  const d = domain.value;
  if (!d) return [];
  const ticks = 4;
  const out = [];
  for (let i = 0; i <= ticks; i += 1) {
    const v = d.y0 + ((d.y1 - d.y0) * i) / ticks;
    out.push({ v, y: yOf(v), label: Number(v.toFixed(1)) });
  }
  return out;
});

const xTicks = computed(() => {
  const d = domain.value;
  if (!d) return [];
  const ticks = 3;
  const out = [];
  for (let i = 0; i <= ticks; i += 1) {
    const t = d.t0 + ((d.t1 - d.t0) * i) / ticks;
    const date = new Date(t);
    out.push({
      x: xOf(date.toISOString()),
      label: date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    });
  }
  return out;
});
</script>

<template>
  <div class="cohort-line-chart">
    <div v-if="label" class="small fw-semibold mb-1">{{ label }}</div>
    <svg
      v-if="domain"
      class="cohort-line-chart__svg"
      :viewBox="`0 0 ${W} ${H}`"
      role="img"
      :aria-label="label || 'Time series'"
    >
      <rect
        v-if="bandRect"
        class="cohort-line-chart__band"
        :x="bandRect.x"
        :y="bandRect.y"
        :width="bandRect.width"
        :height="bandRect.height"
      />
      <g class="cohort-line-chart__grid">
        <line
          v-for="(tick, idx) in yTicks"
          :key="idx"
          :x1="PAD.l"
          :x2="W - PAD.r"
          :y1="tick.y"
          :y2="tick.y"
        />
      </g>
      <g class="cohort-line-chart__axis small">
        <text
          v-for="(tick, idx) in yTicks"
          :key="'y' + idx"
          :x="PAD.l - 6"
          :y="tick.y + 3"
          text-anchor="end"
        >{{ tick.label }}</text>
        <text
          v-for="(tick, idx) in xTicks"
          :key="'x' + idx"
          :x="tick.x"
          :y="H - 8"
          text-anchor="middle"
        >{{ tick.label }}</text>
      </g>
      <path
        v-if="controlPoints.length > 1"
        class="cohort-line-chart__control"
        fill="none"
        :d="linePath(controlPoints)"
      />
      <path
        v-for="entry in subjectEntries"
        :key="entry.id"
        fill="none"
        class="cohort-line-chart__subject"
        :stroke="entry.color"
        :d="linePath(entry.points)"
      />
    </svg>
    <div v-else class="small text-muted">No series in this range.</div>
    <ul v-if="domain" class="list-unstyled d-flex flex-wrap gap-2 small mb-0 mt-1">
      <li v-if="controlPoints.length" class="d-flex align-items-center gap-1">
        <span class="cohort-line-chart__swatch cohort-line-chart__swatch--control" />
        Control mean
      </li>
      <li v-for="entry in subjectEntries" :key="entry.id" class="d-flex align-items-center gap-1">
        <span class="cohort-line-chart__swatch" :style="{ background: entry.color }" />
        {{ entry.id }}
      </li>
      <li v-if="band" class="d-flex align-items-center gap-1">
        <span class="cohort-line-chart__swatch cohort-line-chart__swatch--band" />
        Control ±2σ
      </li>
    </ul>
  </div>
</template>

<style scoped>
.cohort-line-chart__svg {
  width: 100%;
  height: auto;
  display: block;
}
.cohort-line-chart__band {
  fill: rgba(25, 135, 84, 0.12);
}
.cohort-line-chart__grid line {
  stroke: var(--bs-border-color);
  stroke-width: 1;
}
.cohort-line-chart__axis text {
  fill: var(--bs-secondary-color);
  font-size: 10px;
}
.cohort-line-chart__control {
  stroke: #00b050;
  stroke-width: 2;
}
.cohort-line-chart__subject {
  stroke-width: 1.75;
}
.cohort-line-chart__swatch {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 2px;
  display: inline-block;
}
.cohort-line-chart__swatch--control {
  background: #00b050;
}
.cohort-line-chart__swatch--band {
  background: rgba(25, 135, 84, 0.35);
}
</style>
