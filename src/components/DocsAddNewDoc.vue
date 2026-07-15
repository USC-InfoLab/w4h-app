<template>
  <button class="btn btn-primary" @click="showForm = true">
    <i class="bi bi-plus-lg"></i> Add New Doc
  </button>

  <div class="mb-3">

    <div v-if="showForm" class="card mt-3 p-3">
      <h5 class="mb-3">New Feature Card</h5>

      <div class="row mb-2 align-items-center">
        <label for="slug" class="col-sm-2 col-form-label">Slug</label>
        <div class="col-sm-10">
          <input id="slug" type="text" v-model="form.slug" class="form-control" />
        </div>
      </div>

      <div class="row mb-2 align-items-center">
        <label for="title" class="col-sm-2 col-form-label">Title</label>
        <div class="col-sm-10">
          <input id="title" type="text" v-model="form.title" class="form-control" />
        </div>
      </div>

      <div class="row mb-2 align-items-center">
        <label for="title" class="col-sm-2 col-form-label">Card Title</label>
        <div class="col-sm-10">
          <input id="title" type="text" v-model="form.card_title" class="form-control" />
        </div>
      </div>

      <div class="row mb-2 align-items-center">
        <label for="description" class="col-sm-2 col-form-label">Card Description</label>
        <div class="col-sm-10">
          <input id="description" type="text" v-model="form.description" class="form-control" />
        </div>
      </div>

      <div class="row mb-2 align-items-center">
        <label for="action_label" class="col-sm-2 col-form-label">Action Label</label>
        <div class="col-sm-10">
          <input id="action_label" type="text" v-model="form.action_label" class="form-control" placeholder="Open" />
        </div>
      </div>

      <div class="mb-2 row align-items-center">
        <label class="col-sm-2 col-form-label">Doc Type</label>
        <div class="col-sm-2">
          <select v-model="form.doc_type" class="form-select">
            <option value="">None (top-level)</option>
            <option v-for="t in docTypes" :key="t.slug" :value="t.slug">{{ t.label }}</option>
          </select>
        </div>
      </div>

      <div class="mb-2 row align-items-center">
        <label class="col-sm-2 col-form-label">Sort Order</label>
        <div class="col-sm-2">
          <input type="number" v-model.number="form.sort_order" class="form-control" />
        </div>
      </div>

      <div class="mb-2 row align-items-center">
        <label class="col-sm-2 col-form-label">Card Sort Order</label>
        <div class="col-sm-2">
          <input type="number" v-model.number="form.card_order" class="form-control" />
        </div>
      </div>

      <div class="form-check mb-2">
        <input id="is_feature_card" class="form-check-input" type="checkbox" v-model="form.is_feature_card" />
        <label class="form-check-label" for="is_feature_card">Feature Card</label>
      </div>

      <div class="form-check mb-2">
        <input id="show_in_docs" class="form-check-input" type="checkbox" v-model="form.show_in_docs" />
        <label class="form-check-label" for="show_in_docs">Show in Docs</label>
      </div>

      <div class="form-check mb-2">
        <input id="hidden" class="form-check-input" type="checkbox" v-model="form.hidden" />
        <label class="form-check-label" for="hidden">Hide from users</label>
      </div>


      <div class="d-flex justify-content-end gap-2 mt-3">
        <button class="btn btn-primary" @click="submitNewDoc">
          <i class="bi bi-check-lg"></i> Add
        </button>
        <button class="btn btn-secondary" @click="resetForm">
          <i class="bi bi-x-lg"></i> Cancel
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { api, authHeaders } from '../utils/api';
import { useRouter } from 'vue-router';
import { useDocTypes } from '@/composables/useDocTypes';

const router = useRouter();
const { docTypes, fetchDocTypes } = useDocTypes();

const form = reactive({
  slug: '',
  title: '',
  description: '',
  action_label: 'Open',
  is_feature_card: false,
  hidden: false,
  doc_type: 'other',
  sort_order: 0,
  show_in_docs: true,
  md: '',
});

const showForm = ref(false);

onMounted(() => {
  fetchDocTypes();
});

async function submitNewDoc() {
  if (!form.slug.trim()) return;

  try {
    const res = await api.put(`/docs/${form.slug}`, {
      md: '',
      ...form
    }, authHeaders());

    resetForm();
    router.push({ name: 'docs', params: { slug: res.data.slug } });
  } catch (err) {
    console.error(err);
  }
}


function resetForm() {
  Object.assign(form, {
    slug: '',
    title: '',
    description: '',
    action_label: 'Open',
    is_feature_card: false,
    hidden: false
  });
  showForm.value = false;
}

</script>