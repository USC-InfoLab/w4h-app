<template>
  <main class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/teams">Teams</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Add Team</li>
      </ol>
    </nav>

    <div class="row justify-content-center">
      <div class="col-12 col-md-8 col-lg-6">
        <div class="card p-3">
          <h5 class="card-title mb-3">New Team</h5>

          <div class="mb-3">
            <label class="form-label">Name</label>
            <input
              v-model.trim="form.name"
              class="form-control"
              placeholder="e.g. Cardiology Trial"
              @input="onNameInput"
            />
          </div>

          <div class="mb-3">
            <label class="form-label">Slug</label>
            <input
              v-model.trim="form.slug"
              class="form-control"
              placeholder="e.g. cardiology-trial"
              @input="onSlugInput"
            />
            <div class="form-text">
              URL-friendly key, auto-filled from the name.
              Must be unique — if taken, the server appends <code>-1</code>, <code>-2</code>, …
            </div>
          </div>

          <div v-if="message" class="alert" :class="ok ? 'alert-success' : 'alert-danger'">
            {{ message }}
          </div>

          <div class="d-flex justify-content-end">
            <button class="btn btn-primary" :disabled="saving || !form.name" @click="onSave">
              <span v-if="saving" class="spinner-border spinner-border-sm me-2" />
              Create Team
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

const router = useRouter();
const form = reactive({ name: '', slug: '' });
const saving = ref(false);
const message = ref('');
const ok = ref(false);
const slugTouched = ref(false);

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function onNameInput() {
  if (!slugTouched.value) {
    form.slug = slugify(form.name);
  }
}

function onSlugInput() {
  slugTouched.value = true;
  form.slug = slugify(form.slug);
}

onMounted(() => {
  document.title = `${APP_NAME} Add Team`;
});

async function onSave() {
  saving.value = true;
  message.value = '';
  ok.value = false;
  try {
    const res = await api.post(
      'teams',
      { name: form.name, slug: form.slug || undefined },
      authHeaders()
    );
    ok.value = true;
    const finalSlug = res.data?.slug;
    message.value = finalSlug && finalSlug !== form.slug
      ? `Team created as “${finalSlug}” (slug was adjusted to stay unique).`
      : 'Team created.';
    router.push({ name: 'adminTeams' });
  } catch (error) {
    message.value = error.response?.data?.error || `Failed to create team: ${error}`;
  } finally {
    saving.value = false;
  }
}
</script>
