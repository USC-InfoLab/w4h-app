<template>
  <div class="code-container h-100 d-flex flex-column">
    <div class="code-content flex-grow-1 overflow-auto position-relative p-2">
      <highlightjs :language="language" :code="truncatedCode" class="highlight-wrapper" />

      <div class="copy-button-overlay">
        <button type="button" class="btn btn-primary btn-sm" @click="copyToClipboard"
          :title="copied ? 'Copied!' : 'Copy to clipboard'">
          <i v-if="copied" class="bi bi-check"></i>
          <i v-else class="bi bi-files"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import 'highlight.js/styles/github.css';

const props = defineProps({
  code: { type: String, required: true },
  language: { type: String, default: 'json' }
});

const copied = ref(false);

const TRUNCATE_LIMIT = 10000;

const truncatedCode = computed(() => {
  const charLimit = TRUNCATE_LIMIT;
  console.log('Original code length:', props.code);
  return props.code.length > charLimit ? props.code.substring(0, charLimit) + '...' : props.code;
});

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(props.code);
    copied.value = true;
    setTimeout(() => copied.value = false, 2000);
  } catch (err) {
    console.error('Failed to copy:', err);
  }
};
</script>

<style scoped>
.code-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.code-content {
  position: relative;
  flex-grow: 1;
  overflow: auto;
  padding: 1rem;
}

.copy-button-overlay {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
}

.code-content :deep(pre) {
  margin: 0;
  padding: 1rem;
  white-space: pre-wrap; /* optional for line wrapping */
}
</style>