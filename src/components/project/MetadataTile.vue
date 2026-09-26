<script setup>
import { computed } from 'vue';
import MetadataFieldLabel from '@/components/project/MetadataFieldLabel.vue';

const props = defineProps({
  fieldKey: { type: String, required: true },
  label: { type: String, default: null },
  value: { type: [String, Number, Boolean, Array, Object], default: null },
  /** Force the Unavailable tooltip note even when a value is present */
  alwaysNote: { type: Boolean, default: false },
  /** Smaller value type for long text (descriptions, URLs, rules) */
  small: { type: Boolean, default: false },
  /** Limit value text to N lines (e.g. 2 for signal descriptions). */
  clampLines: { type: Number, default: null },
  /** Minimum height for multi-line / expanded tiles. */
  expanded: { type: Boolean, default: false },
});

const missing = computed(() => {
  const v = props.value;
  if (v == null || v === '') return true;
  if (Array.isArray(v) && !v.length) return true;
  return false;
});

const displayValue = computed(() => {
  const v = props.value;
  if (missing.value) return 'Unavailable';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
});
</script>

<template>
  <div class="metadata-tile" :class="{ 'metadata-tile--expanded': expanded || clampLines }">
    <div
      class="metadata-tile-value"
      :class="{
        'metadata-tile-value--sm': small,
        'metadata-tile-value--muted': missing,
        'metadata-tile-value--clamp': clampLines,
      }"
      :style="clampLines ? { WebkitLineClamp: clampLines } : undefined"
    >
      <slot>{{ displayValue }}</slot>
    </div>
    <MetadataFieldLabel
      :field-key="fieldKey"
      :label="label"
      :unavailable="missing || alwaysNote"
      class="metadata-tile-label"
    />
  </div>
</template>

<style scoped>
.metadata-tile {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  padding: 0.65rem 0.75rem;
  height: 100%;
}

.metadata-tile--expanded {
  min-height: 4.5rem;
}

.metadata-tile-value {
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1.2;
  word-break: break-word;
}

.metadata-tile-value--sm {
  font-size: 0.9rem;
  font-weight: 600;
}

.metadata-tile-value--muted {
  font-size: 0.9rem;
  font-weight: 400;
  color: var(--bs-secondary-color);
}

.metadata-tile-value--clamp {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.875rem;
  font-weight: 500;
  line-height: 1.35;
}

.metadata-tile-label {
  display: block;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
  margin-top: 0.15rem;
}
</style>
