<script setup>
/** Rename (or merge) project page categories. Emits rename(from, to). */
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { categoryColor } from '@/utils/pageCategories';

const props = defineProps({
  categories: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
});
const emit = defineEmits(['rename']);

const open = ref(false);
const editingKey = ref('');
const editValue = ref('');
const rootEl = ref(null);
const popEl = ref(null);
const inputs = ref({});
const popStyle = ref({});
const POP_WIDTH = 256; // 16rem
const MARGIN = 8;

const inUse = computed(() => props.categories.filter((c) => c.count > 0));

function onDocPointer(e) {
  if (!rootEl.value?.contains(e.target) && !popEl.value?.contains(e.target)) close();
}
/** The popover lives in <body> (the docs card clips overflow), so place it under the button, inside the viewport. */
function place() {
  const r = rootEl.value?.getBoundingClientRect();
  if (!r) return;
  const width = Math.min(POP_WIDTH, window.innerWidth - 2 * MARGIN);
  const left = Math.max(MARGIN, Math.min(r.left, window.innerWidth - width - MARGIN));
  popStyle.value = { top: `${r.bottom + 4}px`, left: `${left}px`, width: `${width}px` };
}
function toggle() {
  if (open.value) return close();
  place();
  open.value = true;
  document.addEventListener('mousedown', onDocPointer, true);
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
}
function close() {
  open.value = false;
  editingKey.value = '';
  document.removeEventListener('mousedown', onDocPointer, true);
  window.removeEventListener('resize', place);
  window.removeEventListener('scroll', place, true);
}
function startEdit(cat) {
  editingKey.value = cat.key;
  editValue.value = cat.label;
  nextTick(() => inputs.value[cat.key]?.focus());
}
function commit(cat) {
  const to = editValue.value.trim();
  editingKey.value = '';
  if (!to || to === cat.label) return;
  const merging = props.categories.some((c) => c.key === to.toLowerCase() && c.key !== cat.key && c.count > 0);
  if (merging && !window.confirm(`Move all “${cat.label}” pages into “${to}”?`)) return;
  emit('rename', cat.value, to);
}
onBeforeUnmount(close);
</script>

<template>
  <div ref="rootEl" class="cat-manager">
    <button
      type="button"
      class="btn btn-sm btn-link text-decoration-none px-1 text-muted"
      v-tooltip="'Edit categories'"
      aria-label="Edit categories"
      :aria-expanded="open"
      @click="toggle"
    >
      <i class="bi bi-pencil-square"></i>
    </button>
    <Teleport to="body">
    <div v-if="open" ref="popEl" class="cat-pop shadow" :style="popStyle" @keydown.esc="close">
      <div class="small fw-semibold px-2 pt-1 pb-2">Categories</div>
      <div v-if="!inUse.length" class="small text-muted px-2 pb-2">No pages yet.</div>
      <div v-for="cat in inUse" :key="cat.key" class="cat-row">
        <span class="cat-dot" :style="{ '--cat': categoryColor(cat.value) }"></span>
        <input
          v-if="editingKey === cat.key"
          :ref="(el) => (inputs[cat.key] = el)"
          v-model="editValue"
          class="form-control form-control-sm"
          maxlength="40"
          aria-label="Category name"
          @keydown.enter.prevent="commit(cat)"
          @keydown.esc.stop="editingKey = ''"
          @blur="commit(cat)"
        />
        <template v-else>
          <span class="flex-grow-1 text-truncate">{{ cat.label }}</span>
          <span class="small text-muted">{{ cat.count }}</span>
          <button
            type="button"
            class="btn btn-sm btn-link p-0 text-muted"
            :disabled="busy"
            :aria-label="`Rename ${cat.label}`"
            @click="startEdit(cat)"
          >
            <i class="bi bi-pencil"></i>
          </button>
        </template>
      </div>
      <div class="small text-muted px-2 pt-2">
        Rename to an existing name to merge. A category disappears when no page uses it.
      </div>
    </div>
    </Teleport>
  </div>
</template>

<style scoped>
.cat-manager {
  position: relative;
  display: inline-block;
}
.cat-pop {
  position: fixed;
  z-index: 1060;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  padding: 0.4rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  background: var(--bs-body-bg);
}
.cat-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0.5rem;
  font-size: 0.875rem;
}
</style>
