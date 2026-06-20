<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/projects">Projects</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Add Project</li>
      </ol>
    </nav>

    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <div class="card p-3">
          <h5 class="card-title mb-3">New Project</h5>

          <div class="mb-3">
            <label class="form-label">Project slug (optional)</label>
            <input v-model.trim="form.slug" class="form-control" placeholder="e.g. w4h-core" />
            <div class="form-text">URL-friendly key. Leave blank to auto-generate from name.</div>
          </div>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input v-model.trim="form.name" class="form-control" placeholder="e.g. My project" />
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
              Create Project
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';

const router = useRouter();

const form = reactive({
  slug: '',
  name: '',
  description: ''
});

const saving = ref(false);
const message = ref('');
const ok = ref(false);

async function onSave() {
  saving.value = true;
  message.value = '';
  ok.value = false;

  try {
    await api.post('projects', {
      slug: form.slug || undefined,
      name: form.name,
      description: form.description || null
    }, authHeaders());

    ok.value = true;
    message.value = 'Project created.';
    router.push({ name: 'adminProjects' });
  } catch (error) {
    message.value = error.response?.data?.error || error.message || 'Failed to create project.';
  } finally {
    saving.value = false;
  }
}
</script>
