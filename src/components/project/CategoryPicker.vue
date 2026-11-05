<script setup>
/** Pick a page category or type a new one (combobox). */
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { categoryColor, categoryKey, categoryLabel } from '@/utils/pageCategories';

const props = defineProps({
  modelValue: { type: String, default: '' },
  /** [{ key, value, label, count }] from buildCategories() */
  categories: { type: Array, default: () => [] },
});
const emit = defineEmits(['update:modelValue']);

const open = ref(false);
const query = ref('');
const highlighted = ref(0);
const rootEl = ref(null);
const inputEl = ref(null);

const options = computed(() => {
  const q = query.value.trim().toLowerCase();
  const rows = props.categories.filter((c) => !q || c.label.toLowerCase().includes(q));
  const exact = props.categories.some((c) => c.key === categoryKey(query.value));
  const create = q && !exact ? [{ create: true, key: `create:${q}`, value: query.value.trim(), label: query.value.trim() }] : [];
  return [...rows, ...create];
});

function onDocPointer(e) {
  if (!rootEl.value?.contains(e.target)) close();
}
function show() {
  open.value = true;
  query.value = '';
  highlighted.value = 0;
  document.addEventListener('mousedown', onDocPointer, true);
  nextTick(() => inputEl.value?.focus());
}
function close() {
  open.value = false;
  document.removeEventListener('mousedown', onDocPointer, true);
}
function choose(opt) {
  if (!opt) return;
  emit('update:modelValue', opt.value);
  close();
}
function onKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    highlighted.value = Math.min(highlighted.value + 1, options.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    highlighted.value = Math.max(highlighted.value - 1, 0);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    choose(options.value[highlighted.value]);
  } else if (e.key === 'Escape') {
    e.stopPropagation();
    close();
  }
}
onBeforeUnmount(close);
</script>

<template>
  <div ref="rootEl" class="cat-picker">
    <button
      type="button"
      class="cat-chip cat-chip--button"
      :style="{ '--cat': categoryColor(modelValue) }"
      aria-haspopup="listbox"
      :aria-expanded="open"
      aria-label="Category"
      @click="open ? close() : show()"
    >
      <span class="cat-dot"></span>
      {{ categoryLabel(modelValue) }}
      <i class="bi bi-chevron-down small opacity-75"></i>
    </button>

    <div v-if="open" class="cat-pop shadow" role="listbox">
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        class="form-control form-control-sm mb-1"
        placeholder="Find or create a category…"
        maxlength="40"
        aria-label="Find or create a category"
        @input="highlighted = 0"
        @keydown="onKeydown"
      />
      <button
        v-for="(opt, i) in options"
        :key="opt.key"
        type="button"
        class="cat-option"
        :class="{ 'is-hl': i === highlighted }"
        role="option"
        :aria-selected="categoryKey(modelValue) === opt.key"
        @mouseenter="highlighted = i"
        @click="choose(opt)"
      >
        <template v-if="opt.create">
          <i class="bi bi-plus-lg"></i>
          <span class="flex-grow-1">Create “{{ opt.label }}”</span>
        </template>
        <template v-else>
          <span class="cat-dot" :style="{ '--cat': categoryColor(opt.value) }"></span>
          <span class="flex-grow-1">{{ opt.label }}</span>
          <span v-if="opt.count" class="small text-muted">{{ opt.count }}</span>
          <i v-if="categoryKey(modelValue) === opt.key" class="bi bi-check2 text-primary"></i>
        </template>
      </button>
      <div v-if="!options.length" class="small text-muted px-2 py-1">No categories.</div>
    </div>
  </div>
</template>

<style scoped>
.cat-picker {
  position: relative;
  display: inline-block;
}
.cat-pop {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 1060;
  width: 15rem;
  max-height: 18rem;
  overflow: auto;
  padding: 0.4rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  background: var(--bs-body-bg);
}
.cat-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.35rem 0.5rem;
  border: 0;
  border-radius: 0.35rem;
  background: transparent;
  color: var(--bs-body-color);
  font-size: 0.875rem;
  text-align: left;
}
.cat-option.is-hl {
  background: var(--bs-tertiary-bg);
}
</style>
