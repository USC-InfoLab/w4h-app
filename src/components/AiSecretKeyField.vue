<template>
  <div>
    <label v-if="label" class="form-label" :for="inputId">{{ label }}</label>

    <div v-if="hasKey && !replacing" class="input-group">
      <span class="input-group-text"><i class="bi bi-key" aria-hidden="true"></i></span>
      <input
        class="form-control font-monospace"
        type="text"
        :value="displayPrefix"
        readonly
        :aria-label="`${label || 'API key'} (saved, masked)`"
      />
      <button
        v-if="!disabled"
        class="btn btn-outline-secondary"
        type="button"
        @click="startReplace"
      >
        Replace
      </button>
    </div>
    <div v-else class="input-group">
      <span class="input-group-text"><i class="bi bi-key" aria-hidden="true"></i></span>
      <input
        :id="inputId"
        class="form-control font-monospace"
        type="password"
        autocomplete="new-password"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
      />
      <button
        v-if="hasKey && replacing && !disabled"
        class="btn btn-outline-secondary"
        type="button"
        @click="cancelReplace"
      >
        Cancel
      </button>
    </div>

    <div v-if="hasKey && !replacing" class="form-text">
      Saved key {{ displayPrefix }}{{ sourceNote }}. The full key is not shown. Leave it as-is, or Replace to paste a new one.
    </div>
    <div v-else-if="hasKey && replacing" class="form-text">
      Paste a new key to replace the saved one. Saving with this field empty keeps the current key.
    </div>
    <div v-else class="form-text">
      {{ emptyHelp }}
    </div>

    <div v-if="!disabled && hasKey && clearable" class="form-check mt-2">
      <input :id="clearId" :checked="clear" type="checkbox" class="form-check-input" @change="$emit('update:clear', $event.target.checked)" />
      <label class="form-check-label" :for="clearId">Remove saved key</label>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  hasKey: { type: Boolean, default: false },
  keyPrefix: { type: String, default: '' },
  keySource: { type: String, default: '' },
  label: { type: String, default: 'Anthropic API key' },
  placeholder: { type: String, default: 'Paste sk-ant-…' },
  emptyHelp: { type: String, default: 'Paste a key from the Anthropic Console. It is stored encrypted and never shown in full.' },
  disabled: { type: Boolean, default: false },
  clearable: { type: Boolean, default: true },
  clear: { type: Boolean, default: false },
});

defineEmits(['update:modelValue', 'update:clear']);

const replacing = ref(false);
const uid = Math.random().toString(36).slice(2, 8);
const inputId = `ai-key-${uid}`;
const clearId = `ai-key-clear-${uid}`;

const displayPrefix = computed(() => props.keyPrefix || 'sk-ant-…••••');
const sourceNote = computed(() => (props.keySource === 'env' ? ' (from environment)' : ''));

function startReplace() {
  replacing.value = true;
}

function cancelReplace() {
  replacing.value = false;
}

watch(() => props.hasKey, (has) => {
  if (!has) replacing.value = false;
});
</script>
