<script setup>
import { ref, onBeforeUnmount, nextTick } from 'vue';

const props = defineProps({
  // 'bottom-start' | 'bottom-end'
  placement: { type: String, default: 'bottom-start' },
  minWidth: { type: String, default: '12rem' },
});

const open = ref(false);
const triggerRef = ref(null);
const menuRef = ref(null);
const pos = ref({ top: 0, left: 0, maxHeight: null, transform: undefined });

const VIEWPORT_PAD = 8;
const TRIGGER_GAP = 4;

function computePos() {
  const t = triggerRef.value?.getBoundingClientRect?.();
  if (!t) return;
  const menuW = menuRef.value?.offsetWidth || 208;
  let left = props.placement === 'bottom-end' ? t.right - menuW : t.left;
  left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - menuW - VIEWPORT_PAD));

  const spaceBelow = window.innerHeight - t.bottom - TRIGGER_GAP - VIEWPORT_PAD;
  const spaceAbove = t.top - TRIGGER_GAP - VIEWPORT_PAD;
  const menuH = menuRef.value?.scrollHeight || 0;
  const openAbove = menuH > spaceBelow && spaceAbove > spaceBelow;
  const maxHeight = Math.max(0, openAbove ? spaceAbove : spaceBelow);

  pos.value = {
    top: Math.round(openAbove ? t.top - TRIGGER_GAP : t.bottom + TRIGGER_GAP),
    left: Math.round(left),
    maxHeight,
    transform: openAbove ? 'translateY(-100%)' : undefined,
  };
}

function onDocPointer(e) {
  if (triggerRef.value?.contains(e.target) || menuRef.value?.contains(e.target)) return;
  close();
}

function onScroll(e) {
  const target = e.target;
  if (target instanceof Node && menuRef.value?.contains(target)) return;
  close();
}

function close() {
  if (!open.value) return;
  open.value = false;
  document.removeEventListener('mousedown', onDocPointer, true);
  window.removeEventListener('resize', close);
  window.removeEventListener('scroll', onScroll, true);
}

function show() {
  open.value = true;
  nextTick(() => {
    computePos();
    // Second pass once content height is known (flip / max-height for tall menus).
    nextTick(computePos);
  });
  document.addEventListener('mousedown', onDocPointer, true);
  window.addEventListener('resize', close, { passive: true });
  window.addEventListener('scroll', onScroll, true);
}

function toggle() {
  open.value ? close() : show();
}

function onPanelMouseDown(e) {
  if (e.target.closest('input, textarea, select')) return;
  e.preventDefault();
}

function onKeydown(e) {
  if (e.key === 'Escape') { e.stopPropagation(); close(); }
}

onBeforeUnmount(close);
defineExpose({ open, close });
</script>

<template>
  <div class="wz-menu" @keydown="onKeydown">
    <span ref="triggerRef" class="wz-menu__trigger" @mousedown.prevent @click="toggle">
      <slot name="trigger" :open="open" />
    </span>
    <div
      v-if="open"
      ref="menuRef"
      class="wz-menu__panel"
      role="menu"
      :style="{
        top: pos.top + 'px',
        left: pos.left + 'px',
        minWidth,
        maxHeight: pos.maxHeight != null ? pos.maxHeight + 'px' : undefined,
        transform: pos.transform,
      }"
      @mousedown="onPanelMouseDown"
    >
      <slot :close="close" />
    </div>
  </div>
</template>

<style scoped>
.wz-menu,
.wz-menu__trigger {
  display: inline-flex;
}
.wz-menu__panel {
  position: fixed;
  z-index: 1085;
  padding: 0.35rem;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  font-size: 0.875rem;
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}
</style>
