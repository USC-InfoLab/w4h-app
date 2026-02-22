<template>
  <div v-if="show" class="modal fade show" style="display: block;" tabindex="-1">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Confirm Deletion</h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <p>
            Are you sure you want to delete
            <strong>{{ doc?.title || doc?.slug }}</strong>? This action cannot be undone.
          </p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn btn-danger" @click="deleteDoc" :disabled="loading">
            <span v-if="loading" class="spinner-border spinner-border-sm"></span>
            Delete
          </button>
        </div>
      </div>
    </div>
    <div class="modal-backdrop fade show"></div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { api, authHeaders } from '@/utils/api';

const props = defineProps({
  show: Boolean,
  doc: Object
});

const emit = defineEmits(['close', 'deleted']);

const loading = ref(false);

async function deleteDoc() {
  if (!props.doc) return;
  loading.value = true;

  try {
    await api.delete(`/docs/${props.doc.slug}`, authHeaders());
    emit('deleted', props.doc.slug);
    emit('close');
  } catch (err) {
    console.error(err);
    alert(`Failed to delete: ${err.response?.data?.message || err.message}`);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}
</style>