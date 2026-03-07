<template>
  <main class="container-fluid" v-if="loaded">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/studies">Studies</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Edit Study</li>
      </ol>
    </nav>

    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <div class="card p-3">
          <h5 class="card-title mb-3">Edit Study</h5>

          <div class="mb-3">
            <label class="form-label">Study ID</label>
            <input v-model="form.id" class="form-control" disabled />
            <div class="form-text">Study ID cannot be changed.</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model.trim="form.name" class="form-control" />
          </div>

          <div class="mb-3">
            <label class="form-label">Description</label>
            <textarea v-model.trim="form.description" class="form-control" rows="4" placeholder="Optional"></textarea>
          </div>

          <div v-if="message" class="alert" :class="ok ? 'alert-success' : 'alert-danger'">
            {{ message }}
          </div>

          <div class="d-flex justify-content-end">
            <button class="btn btn-primary" :disabled="saving || !form.name" @click="onSave">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" />
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';

const route = useRoute();
const router = useRouter();

const loaded = ref(false);
const saving = ref(false);
const message = ref('');
const ok = ref(false);

const form = reactive({
  id: '',
  name: '',
  description: ''
});

onMounted(async () => {
  try {
    const id = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id;
    const data = (await api.get(`datasets/studies-admin/${encodeURIComponent(id || '')}`, authHeaders())).data;
    form.id = data.id;
    form.name = data.name || '';
    form.description = data.description || '';
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to load study.';
  } finally {
    loaded.value = true;
  }
});

async function onSave() {
  saving.value = true;
  message.value = '';
  ok.value = false;

  try {
    await api.put(`datasets/studies-admin/${encodeURIComponent(form.id)}`, {
      name: form.name,
      description: form.description || null
    }, authHeaders());

    ok.value = true;
    message.value = 'Study updated.';
    router.push({ name: 'adminStudies' });
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to save study.';
  } finally {
    saving.value = false;
  }
}
</script>
