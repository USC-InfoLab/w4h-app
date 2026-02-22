<template>
  <div class="modal fade" id="settingsModal" tabindex="-1" aria-labelledby="settingsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title modal-title-sm" id="settingsModalLabel"><i class="bi bi-gear"></i> Settings
          </h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <!-- Slug (readonly) -->
          <div class="mb-3 row align-items-center">
            <label class="col-sm-3 text-end fw-bold">Slug</label>
            <div class="col-sm-9">
              <input type="text" v-model="doc.slug" class="form-control form-control-sm" />
            </div>
          </div>

          <!-- Title -->
          <!-- <div class="mb-3 row align-items-center">
            <label class="col-sm-3 text-end fw-bold">Title</label>
            <div class="col-sm-9">
              <input type="text" v-model="doc.title" class="form-control form-control-sm" />
            </div>
          </div> -->

          <!-- Card Title -->
          <div class="mb-3 row align-items-center">
            <label class="col-sm-3 text-end fw-bold">Card Title</label>
            <div class="col-sm-9">
              <input type="text" v-model="doc.card_title" class="form-control form-control-sm" />
            </div>
          </div>

          <!-- Card Description -->
          <div class="mb-3 row align-items-start">
            <label class="col-sm-3 text-end fw-bold">Card Description</label>
            <div class="col-sm-9">
              <textarea v-model="doc.description" class="form-control form-control-sm" rows="3"></textarea>
            </div>
          </div>

          <!-- Action Label -->
          <div class="mb-3 row align-items-center">
            <label class="col-sm-3 text-end fw-bold">Card Action Label</label>
            <div class="col-sm-9">
              <input type="text" v-model="doc.action_label" class="form-control form-control-sm" />
            </div>
          </div>

          <!-- Sort Order -->
          <div class="mb-3 row align-items-center">
            <label class="col-sm-3 text-end fw-bold">Card Order</label>
            <div class="col-sm-9">
              <input type="number" v-model.number="doc.card_order" class="form-control form-control-sm" />
            </div>
          </div>

          <!-- Doc Type -->
          <div class="mb-3 row align-items-center">
            <label class="col-sm-3 text-end fw-bold">Doc Type</label>
            <div class="col-sm-9">
              <select v-model="doc.doc_type" class="form-select form-select-sm">
                <option v-for="t in DOC_TYPES" :key="t" :value="t">{{ capitalizeType(t) }}</option>
              </select>
            </div>
          </div>

          <!-- Sort Order -->
          <div class="mb-3 row align-items-center">
            <label class="col-sm-3 text-end fw-bold">Sort Order</label>
            <div class="col-sm-9">
              <input type="number" v-model.number="doc.sort_order" class="form-control form-control-sm" />
            </div>
          </div>

          <!-- Switches aligned inline with label to right -->
          <div class="mb-3 row align-items-center">
            <div class="col-sm-3 text-end fw-bold">Feature Card</div>
            <div class="col-sm-9 d-flex align-items-center">
              <div class="form-check form-switch mb-0">
                <input id="is_feature_card" class="form-check-input" type="checkbox" v-model="doc.is_feature_card" />
              </div>
            </div>
          </div>

          <div class="mb-3 row align-items-center">
            <div class="col-sm-3 text-end fw-bold">Show in Docs</div>
            <div class="col-sm-9 d-flex align-items-center">
              <div class="form-check form-switch mb-0">
                <input id="show_in_docs" class="form-check-input" type="checkbox" v-model="doc.show_in_docs" />
              </div>
            </div>
          </div>

          <div class="mb-1 row align-items-center">
            <div class="col-sm-3 text-end fw-bold">Hide from Users</div>
            <div class="col-sm-9 d-flex align-items-center">
              <div class="form-check form-switch mb-0">
                <input id="hidden" class="form-check-input" type="checkbox" v-model="doc.hidden" />
              </div>
            </div>
          </div>

        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-sm btn-primary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const DOC_TYPES = ['', 'guide', 'tutorial', 'reference', 'faq', 'internal', 'other'];

function capitalizeType(type) {
  if (type === '') {
    return 'None'; // This will be the label for the '' value
  }
  return type.charAt(0).toUpperCase() + type.slice(1);
}

const props = defineProps({
  doc: { type: Object, required: true }
});

// const emit = defineEmits(['delete']);
</script>

<style>
/* Force Bootstrap modals above md-editor preview */
/* Raise Bootstrap modal and backdrop */
.modal-content {
  z-index: 3000 !important;
}
</style>