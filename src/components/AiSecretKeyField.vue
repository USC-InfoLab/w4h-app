<template>
  <div>
    <label v-if="label" class="form-label" :for="inputId">{{ label }}</label>

    <div v-if="pendingRemove" class="alert alert-warning py-2 small mb-2" role="status">
      {{ removeWarning }}
      <button type="button" class="btn btn-link btn-sm p-0 ms-1 align-baseline" :disabled="disabled" @click="undoRemove">
        Undo
      </button>
    </div>

    <div v-else-if="hasKey" class="d-flex flex-wrap align-items-center gap-2 mb-2">
      <span class="badge text-bg-secondary">
        {{ keySource === 'env' ? 'On file (environment)' : 'On file' }}
      </span>
      <code class="small mb-0">{{ displayPrefix }}</code>
      <span class="small text-muted">encrypted · not shown in full</span>
      <button
        v-if="!disabled && clearable && keySource !== 'env'"
        class="btn btn-sm btn-outline-danger ms-auto"
        type="button"
        @click="startRemove"
      >
        Remove
      </button>
    </div>
    <div v-else class="mb-2">
      <span class="badge text-bg-warning">No key</span>
    </div>

    <div v-if="!pendingRemove" class="input-group">
      <span class="input-group-text"><i class="bi bi-key" aria-hidden="true"></i></span>
      <input
        :id="inputId"
        class="form-control font-monospace"
        type="password"
        autocomplete="new-password"
        :placeholder="hasKey ? 'Paste a new key to replace, then Save' : placeholder"
        :disabled="disabled"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      />
    </div>

    <div v-if="pendingRemove" class="form-text">
      Click Save AI settings to confirm. The key is stored encrypted; this page never shows the full value.
    </div>
    <div v-else-if="hasKey" class="form-text">
      {{ savedHelp }} Paste a new value above to replace it, then Save. An empty field keeps the current key.
    </div>
    <div v-else class="form-text">
      {{ emptyHelp }}
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  hasKey: { type: Boolean, default: false },
  keyPrefix: { type: String, default: '' },
  keySource: { type: String, default: '' },
  label: { type: String, default: 'Anthropic API key' },
  placeholder: { type: String, default: 'Paste sk-ant-…' },
  emptyHelp: { type: String, default: 'Paste a key from the Anthropic Console. It is stored encrypted and never shown in full.' },
  savedHelp: {
    type: String,
    default: 'A key is on file.',
  },
  replacingHelp: { type: String, default: '' },
  removeWarning: {
    type: String,
    default: 'The saved key will be deleted when you save.',
  },
  disabled: { type: Boolean, default: false },
  clearable: { type: Boolean, default: true },
  clear: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'update:clear']);

const uid = Math.random().toString(36).slice(2, 8);
const inputId = `ai-key-${uid}`;

const displayPrefix = computed(() => props.keyPrefix || 'sk-ant-…••••');
const pendingRemove = computed(() => props.clear && props.hasKey);

function startRemove() {
  emit('update:modelValue', '');
  emit('update:clear', true);
}

function undoRemove() {
  emit('update:clear', false);
}
</script>
