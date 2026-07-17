<template>
  <div class="modal fade" id="settingsModal" tabindex="-1" aria-labelledby="settingsModalLabel" aria-hidden="true">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title modal-title-sm" id="settingsModalLabel"><i class="bi bi-gear"></i> Doc Settings</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">

          <h6 class="text-muted text-uppercase small mb-3">Document</h6>

          <div class="mb-3 row align-items-start">
            <label class="col-sm-3 text-end fw-bold pt-1">Slug</label>
            <div class="col-sm-9">
              <input type="text" v-model="doc.slug" class="form-control form-control-sm" />
              <div class="form-text">URL identifier for this page (e.g. <code>quick-start</code> → <code>/docs/quick-start</code>). Automatically set from the doc title.</div>
            </div>
          </div>

          <div class="mb-3 row align-items-start">
            <label class="col-sm-3 text-end fw-bold pt-1">Doc Type</label>
            <div class="col-sm-9">
              <select v-model="doc.doc_type" class="form-select form-select-sm">
                <option value="">None</option>
                <option v-for="t in typeOptions" :key="t.slug" :value="t.slug">{{ t.label }}</option>
              </select>
              <div class="form-text">Sidebar section this page belongs to. Matches a top-level folder in the docs source repo.</div>
              <button
                v-if="isAdmin && !showCreateType"
                type="button"
                class="btn btn-sm btn-link ps-0 mt-1"
                @click="showCreateType = true"
              >
                Add new type…
              </button>
            </div>
          </div>

          <div v-if="isAdmin && showCreateType" class="mb-3 row align-items-start">
            <label class="col-sm-3 text-end fw-bold pt-1">New Doc Type</label>
            <div class="col-sm-9">
              <div class="d-flex gap-2 mb-2">
                <input
                  v-model="newTypeSlug"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="slug (e.g. changelog)"
                  @input="onNewTypeSlugInput"
                />
                <input
                  v-model="newTypeLabel"
                  type="text"
                  class="form-control form-control-sm"
                  placeholder="Label (e.g. Changelog)"
                />
              </div>
              <div class="d-flex align-items-center gap-2">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  :disabled="creatingType || !canCreateType"
                  @click="handleCreateDocType"
                >
                  <span v-if="creatingType" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  Create Type
                </button>
                <button type="button" class="btn btn-sm btn-link" @click="showCreateType = false">Cancel</button>
                <small v-if="typeError" class="text-danger">{{ typeError }}</small>
              </div>
            </div>
          </div>

          <div class="mb-3 row align-items-start">
            <label class="col-sm-3 text-end fw-bold pt-1">Sort Order</label>
            <div class="col-sm-9">
              <input type="number" v-model.number="doc.sort_order" class="form-control form-control-sm" style="max-width: 8rem" />
              <div class="form-text">Position within its doc-type group in the sidebar. Lower numbers appear first.</div>
            </div>
          </div>

          <hr class="my-3" />
          <h6 class="text-muted text-uppercase small mb-3">Visibility</h6>

          <div class="mb-3 row align-items-start">
            <div class="col-sm-3 text-end fw-bold pt-1">Show in Docs</div>
            <div class="col-sm-9">
              <div class="form-check form-switch mb-0">
                <input id="show_in_docs" class="form-check-input" type="checkbox" v-model="doc.show_in_docs" />
              </div>
              <div class="form-text">Include this page in the docs sidebar. Turn off for pages that should only be linked to directly.</div>
            </div>
          </div>

          <div class="mb-3 row align-items-start">
            <div class="col-sm-3 text-end fw-bold pt-1">Hide from Users</div>
            <div class="col-sm-9">
              <div class="form-check form-switch mb-0">
                <input id="hidden" class="form-check-input" type="checkbox" v-model="doc.hidden" />
              </div>
              <div class="form-text">Restrict to admins. Hidden from researchers and clinicians, and excluded from search.</div>
            </div>
          </div>

          <hr class="my-3" />
          <h6 class="text-muted text-uppercase small mb-3">Home Page Card</h6>

          <div class="mb-3 row align-items-start">
            <div class="col-sm-3 text-end fw-bold pt-1">Feature Card</div>
            <div class="col-sm-9">
              <div class="form-check form-switch mb-0">
                <input id="is_feature_card" class="form-check-input" type="checkbox" v-model="doc.is_feature_card" />
              </div>
              <div class="form-text">Show as a promotional card on the docs home page.</div>
            </div>
          </div>

          <div class="mb-3 row align-items-start">
            <label class="col-sm-3 text-end fw-bold pt-1">Card Title</label>
            <div class="col-sm-9">
              <input type="text" v-model="doc.card_title" class="form-control form-control-sm" />
              <div class="form-text">Headline on the home page card. Leave empty to use the page title.</div>
            </div>
          </div>

          <div class="mb-3 row align-items-start">
            <label class="col-sm-3 text-end fw-bold pt-1">Card Description</label>
            <div class="col-sm-9">
              <textarea v-model="doc.description" class="form-control form-control-sm" rows="2"></textarea>
              <div class="form-text">Short summary shown on the home page card.</div>
            </div>
          </div>

          <div class="mb-3 row align-items-start">
            <label class="col-sm-3 text-end fw-bold pt-1">Action Label</label>
            <div class="col-sm-9">
              <input type="text" v-model="doc.action_label" class="form-control form-control-sm" style="max-width: 12rem" />
              <div class="form-text">Button text on the card (default: <em>Open</em>).</div>
            </div>
          </div>

          <div class="mb-1 row align-items-start">
            <label class="col-sm-3 text-end fw-bold pt-1">Card Order</label>
            <div class="col-sm-9">
              <input type="number" v-model.number="doc.card_order" class="form-control form-control-sm" style="max-width: 8rem" />
              <div class="form-text">Position among feature cards on the home page. Lower numbers appear first.</div>
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
import { computed, onMounted, ref } from 'vue';
import { useDocTypes } from '@/composables/useDocTypes';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';

const doc = defineModel('doc', { type: Object, required: true });
const userStore = useUserStore();
const isAdmin = computed(() => isSuperAdmin(userStore.user?.role));

const { docTypes, fetchDocTypes, createDocType, formatDocTypeLabel, typeSortOrder } = useDocTypes();

const showCreateType = ref(false);
const newTypeSlug = ref('');
const newTypeLabel = ref('');
const creatingType = ref(false);
const typeError = ref('');

const typeOptions = computed(() => {
  const bySlug = new Map();
  for (const t of docTypes.value) {
    bySlug.set(t.slug, t);
  }
  if (doc.value.doc_type && !bySlug.has(doc.value.doc_type)) {
    bySlug.set(doc.value.doc_type, {
      slug: doc.value.doc_type,
      label: formatDocTypeLabel(doc.value.doc_type),
    });
  }
  return [...bySlug.values()].sort(
    (a, b) => typeSortOrder(a.slug) - typeSortOrder(b.slug) || a.slug.localeCompare(b.slug)
  );
});

const canCreateType = computed(() => {
  const slug = newTypeSlug.value.trim().toLowerCase();
  const label = newTypeLabel.value.trim();
  return slug.length > 0 && label.length > 0 && /^[a-z][a-z0-9-]*$/.test(slug);
});

function onNewTypeSlugInput() {
  newTypeSlug.value = newTypeSlug.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
}

async function handleCreateDocType() {
  typeError.value = '';
  if (!canCreateType.value) {
    typeError.value = 'Enter a valid slug and label';
    return;
  }

  creatingType.value = true;
  try {
    const created = await createDocType({
      slug: newTypeSlug.value.trim().toLowerCase(),
      label: newTypeLabel.value.trim(),
    });
    doc.value.doc_type = created.slug;
    newTypeSlug.value = '';
    newTypeLabel.value = '';
    showCreateType.value = false;
  } catch (err) {
    typeError.value = err.response?.data?.error || 'Failed to create doc type';
  } finally {
    creatingType.value = false;
  }
}

onMounted(() => {
  fetchDocTypes({ force: true });
});

defineExpose({
  async refreshTypes() {
    showCreateType.value = false;
    await fetchDocTypes({ force: true });
  },
});
</script>

<style>
.modal-content {
  z-index: 3000 !important;
}
</style>
