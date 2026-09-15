<script setup>
import { computed, onMounted, onBeforeUnmount, nextTick, ref, watch } from 'vue';
import { Tooltip } from 'bootstrap';
import { fieldHelp, UNAVAILABLE_NOTE } from '@/utils/metadataFieldHelp.js';

const props = defineProps({
  fieldKey: { type: String, required: true },
  /** Override label; defaults to METADATA_FIELD_HELP[fieldKey].label */
  label: { type: String, default: null },
  /** When true, append Unavailable note to tooltip */
  unavailable: { type: Boolean, default: false },
  as: { type: String, default: 'span' }, // 'span' | 'th'
  scope: { type: String, default: null },
});

const tipEl = ref(null);
let tooltipInstance = null;

const help = computed(() => fieldHelp(props.fieldKey));
const displayLabel = computed(() => props.label || help.value.label);
const tipText = computed(() => {
  const base = help.value.definition || UNAVAILABLE_NOTE;
  if (props.unavailable) return `${base} ${UNAVAILABLE_NOTE}`;
  return base;
});

function dispose() {
  if (tooltipInstance) {
    tooltipInstance.dispose();
    tooltipInstance = null;
  }
}

function init() {
  dispose();
  if (!tipEl.value) return;
  tooltipInstance = new Tooltip(tipEl.value, {
    title: tipText.value,
    placement: 'top',
    trigger: 'hover focus',
    container: 'body',
  });
}

onMounted(() => nextTick(init));
onBeforeUnmount(dispose);
watch(tipText, () => nextTick(init));
</script>

<template>
  <component :is="as" class="metadata-field-label" :scope="scope || undefined">
    <span>{{ displayLabel }}</span>
    <button
      ref="tipEl"
      type="button"
      class="btn btn-link btn-sm p-0 ms-1 align-baseline metadata-field-info"
      :aria-label="`About ${displayLabel}`"
      :title="tipText"
    >
      <i class="bi bi-info-circle" aria-hidden="true"></i>
    </button>
  </component>
</template>

<style scoped>
.metadata-field-label {
  font-weight: inherit;
}

.metadata-field-info {
  line-height: 1;
  vertical-align: baseline;
  color: var(--bs-secondary-color, #6c757d);
  text-decoration: none;
}

.metadata-field-info:hover,
.metadata-field-info:focus {
  color: var(--bs-primary, #0d6efd);
}
</style>
