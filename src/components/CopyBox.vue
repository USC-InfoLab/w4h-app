<template>
  <div ref="container" class="input-group input-group-sm flex-grow-1" :class="{ 'copybox-inline': hideInput }">
    <!-- Only show input if wide enough -->
    <input
      v-if="showInput"
      type="text"
      class="form-control copy-input"
      :value="data"
      readonly
    />

    <button
      type="button"
      class="btn btn-primary flex-shrink-0"
      @click="copyToClipboard"
      :title="copied ? 'Copied!' : 'Copy to clipboard'"
    >
      <i v-if="copied" class="bi bi-check"></i>
      <i v-else class="bi bi-files"></i>
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";

const props = defineProps({
  data: { type: String, required: true },
  hideInput: { type: Boolean, default: false },
});

const container = ref(null);
const showInput = ref(true);
const copied = ref(false);

const copyToClipboard = async () => {
  await navigator.clipboard.writeText(props.data);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
};

let resizeObserver;

const MIN_WIDTH = 160; 
onMounted(() => {
  resizeObserver = new ResizeObserver(entries => {
    if (props.hideInput) {
      showInput.value = false;
      return;
    }

    for (const entry of entries) {
      showInput.value = entry.contentRect.width >= MIN_WIDTH;
    }
  });

  watch(
    () => props.hideInput,
    (val) => {
      if (val) showInput.value = false;
    },
    { immediate: true }
  );

  if (container.value) resizeObserver.observe(container.value);
});

onBeforeUnmount(() => {
  if (resizeObserver && container.value) resizeObserver.unobserve(container.value);
});
</script>

<style scoped>
.copy-input {
  white-space: nowrap;
  overflow-x: auto;
}

.input-group {
  display: flex !important;
  width: 100%;
  min-width: 160px;
}

/* 👇 button-only / inline mode */
.copybox-inline {
  display: inline-flex !important;
  width: auto !important;
  min-width: unset !important;
}
/* .input-group {
  display: inline-flex !important;
  width: auto !important;
} */
</style>