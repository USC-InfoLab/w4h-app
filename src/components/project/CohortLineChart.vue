<script setup>
// Cohort comparison line chart (ADR-021). Now a thin wrapper over the shared chart layer
// (ADR-029): same props as before, rendered with ECharts via ChartCard.
import { computed, ref } from 'vue';
import ChartCard from '@/components/viz/ChartCard.vue';
import { lineOption, readTheme, tableFor } from '@/components/viz/vizOptions';

const props = defineProps({
  label: { type: String, default: '' },
  series: { type: Object, default: () => ({ control: [], subjects: {} }) },
  band: { type: Object, default: null },
});

const themeTick = ref(0);

const lines = computed(() => {
  const out = [];
  const control = (props.series?.control || []).filter((p) => p?.t && p.avg != null);
  if (control.length) {
    out.push({ key: 'Control mean', points: control.map((p) => [p.t, p.avg]), color: '#009E73', emphasis: true });
  }
  const subjects = props.series?.subjects || {};
  for (const id of Object.keys(subjects).sort()) {
    const pts = (subjects[id] || []).filter((p) => p?.t && p.avg != null);
    if (pts.length) out.push({ key: id, points: pts.map((p) => [p.t, p.avg]) });
  }
  return out;
});

const option = computed(() => {
  // eslint-disable-next-line no-unused-expressions
  themeTick.value;
  return lines.value.length ? lineOption(lines.value, readTheme(), { band: props.band }) : null;
});
const table = computed(() => tableFor('series', { series: lines.value }));
</script>

<template>
  <ChartCard
    :title="label"
    :subtitle="band ? 'Shaded: control ±2σ' : ''"
    :option="option"
    :table="table"
    :height="240"
    :filename="(label || 'cohort-series').toLowerCase().replace(/[^a-z0-9]+/g, '-')"
    empty-text="No series in this range."
    @theme-changed="themeTick += 1"
  />
</template>
