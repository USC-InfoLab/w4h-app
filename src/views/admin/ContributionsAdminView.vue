<template>
  <main role="main" class="container-fluid">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
      <div>
        <h5 class="mb-1">
          <i class="bi bi-box-seam me-1"></i>
          Contributions
        </h5>
        <p class="small text-muted mb-0">
          Super admin catalog. Published rows appear in the app-shell
          <router-link :to="{ name: 'contributions' }">Contributions</router-link> browse.
        </p>
      </div>
      <button class="btn btn-sm btn-primary" type="button" @click="openNew">
        <i class="bi bi-plus"></i> Add contribution
      </button>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <table v-else class="table table-sm align-middle">
      <thead>
        <tr>
          <th>Title</th>
          <th>Publisher</th>
          <th>Kind</th>
          <th>Language</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in items" :key="row.slug">
          <td>
            <div class="fw-semibold">{{ row.title }}</div>
            <div class="small font-monospace text-muted">{{ row.slug }}</div>
          </td>
          <td>{{ row.publisher }}</td>
          <td>{{ (row.kinds && row.kinds.length ? row.kinds : [row.kind]).join(', ') }}</td>
          <td>{{ row.language }}</td>
          <td>{{ row.status }}</td>
          <td class="text-end">
            <button class="btn btn-sm btn-outline-secondary me-1" type="button" @click="openEdit(row)">Edit</button>
            <button class="btn btn-sm btn-outline-danger" type="button" @click="remove(row)">Delete</button>
          </td>
        </tr>
      </tbody>
    </table>

    <div v-if="formOpen" class="card p-3 mt-3">
      <h6 class="mb-3">{{ editingSlug ? 'Edit contribution' : 'Add contribution' }}</h6>
      <div class="row g-3">
        <div class="col-md-4">
          <label class="form-label">Slug</label>
          <input v-model="form.slug" class="form-control font-monospace" :disabled="Boolean(editingSlug)" />
        </div>
        <div class="col-md-4">
          <label class="form-label">Publisher</label>
          <input v-model="form.publisher" class="form-control" />
        </div>
        <div class="col-md-4">
          <label class="form-label">Title</label>
          <input v-model="form.title" class="form-control" />
        </div>
        <div class="col-12">
          <label class="form-label">Summary</label>
          <input v-model="form.summary" class="form-control" />
        </div>
        <div class="col-md-3">
          <label class="form-label">Kinds</label>
          <div class="d-flex flex-column gap-1">
            <label v-for="k in kindChoices" :key="k" class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                :value="k"
                v-model="form.kinds"
              />
              <span class="form-check-label">{{ k }}</span>
            </label>
          </div>
        </div>
        <div class="col-md-3">
          <label class="form-label">Language</label>
          <select v-model="form.language" class="form-select">
            <option value="python">python</option>
            <option value="r">r</option>
            <option value="sql">sql</option>
            <option value="other">other</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Status</label>
          <select v-model="form.status" class="form-select">
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="deprecated">deprecated</option>
          </select>
        </div>
        <div class="col-md-3">
          <label class="form-label">Ref</label>
          <input v-model="form.repo_ref" class="form-control font-monospace" />
        </div>
        <div class="col-md-8">
          <label class="form-label">Repository URL</label>
          <input v-model="form.repo_url" class="form-control font-monospace" />
        </div>
        <div class="col-md-4">
          <label class="form-label">Docs path</label>
          <input v-model="form.docs_path" class="form-control font-monospace" />
        </div>
      </div>
      <div class="mt-3 d-flex gap-2">
        <button class="btn btn-primary" type="button" :disabled="saving" @click="save">
          {{ saving ? 'Saving…' : 'Save' }}
        </button>
        <button class="btn btn-outline-secondary" type="button" @click="formOpen = false">Cancel</button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { api, authHeaders } from '@/utils/api';
import { contributionKinds } from '@/utils/contributionKinds';

const kindChoices = ['notebook', 'cli', 'script', 'postgres_extension'];

const items = ref([]);
const loading = ref(false);
const saving = ref(false);
const errorMessage = ref('');
const formOpen = ref(false);
const editingSlug = ref('');
const form = reactive(emptyForm());

function emptyForm() {
  return {
    slug: '',
    publisher: '',
    title: '',
    summary: '',
    kind: 'notebook',
    kinds: ['notebook'],
    language: 'python',
    repo_url: '',
    repo_ref: 'main',
    docs_path: 'README.md',
    status: 'published',
  };
}

function assignForm(src) {
  const next = emptyForm();
  Object.assign(next, src || {});
  next.kinds = contributionKinds(src || next);
  Object.assign(form, next);
}

function openNew() {
  editingSlug.value = '';
  assignForm();
  formOpen.value = true;
}

function openEdit(row) {
  editingSlug.value = row.slug;
  assignForm(row);
  formOpen.value = true;
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await api.get('/contributions', { ...authHeaders(), params: { all: '1' } });
    items.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    errorMessage.value = e.response?.data?.error || e.message || 'Failed to load contributions.';
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  errorMessage.value = '';
  try {
    const payload = { ...form, kinds: form.kinds, kind: form.kinds?.[0] || form.kind };
    if (editingSlug.value) {
      await api.patch(`/contributions/${encodeURIComponent(editingSlug.value)}`, payload, authHeaders());
    } else {
      await api.post('/contributions', payload, authHeaders());
    }
    formOpen.value = false;
    await load();
  } catch (e) {
    errorMessage.value = e.response?.data?.error || e.message || 'Save failed.';
  } finally {
    saving.value = false;
  }
}

async function remove(row) {
  if (!window.confirm(`Delete contribution ${row.slug}?`)) return;
  try {
    await api.delete(`/contributions/${encodeURIComponent(row.slug)}`, authHeaders());
    await load();
  } catch (e) {
    errorMessage.value = e.response?.data?.error || e.message || 'Delete failed.';
  }
}

onMounted(load);
</script>
