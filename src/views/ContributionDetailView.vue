<template>
  <main role="main" class="container-fluid">
    <p class="mb-3">
      <router-link :to="{ name: 'contributions' }">← Contributions</router-link>
    </p>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
    </div>

    <template v-else-if="row">
      <h5 class="mb-1">{{ row.title || row.slug }}</h5>
      <div class="small text-muted mb-2">{{ row.publisher }}</div>
      <div class="mb-3">
        <ContributionKindBadges :row="row" />
        <span v-if="row.status && row.status !== 'published'" class="badge text-bg-warning">{{ row.status }}</span>
      </div>
      <p>{{ row.summary }}</p>
      <ContributionRolesNote />

      <dl class="row">
        <dt class="col-sm-3">Repository</dt>
        <dd class="col-sm-9">
          <a :href="row.repo_url" target="_blank" rel="noopener">{{ row.repo_url }}</a>
          <span class="text-muted">
            · {{ row.repo_ref || 'main' }}
            <template v-if="row.version"> ({{ row.version }})</template>
          </span>
        </dd>
      </dl>

      <div class="d-flex flex-wrap gap-2 mb-4">
        <a
          v-if="row.docs_url"
          class="btn btn-outline-primary"
          :href="row.docs_url"
          target="_blank"
          rel="noopener"
        >Open README on GitHub</a>
        <button type="button" class="btn btn-outline-primary" :disabled="!row.repo_url" @click="copy(row.repo_url)">
          {{ copied ? 'Copied' : 'Copy repo URL' }}
        </button>
      </div>

      <h6>Documentation</h6>
      <div v-if="row.docs_error" class="alert alert-secondary small">
        {{ row.docs_error }}
        <a v-if="row.docs_url" :href="row.docs_url" target="_blank" rel="noopener">Open README</a>
      </div>
      <div v-else-if="row.docs_html" class="contribution-docs border rounded p-3" v-html="row.docs_html" />
      <p v-else class="text-muted small">No README loaded.</p>
    </template>
  </main>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';
import ContributionRolesNote from '@/components/contributions/ContributionRolesNote.vue';
import ContributionKindBadges from '@/components/contributions/ContributionKindBadges.vue';

const props = defineProps({
  slug: { type: String, required: true },
});

const row = ref(null);
const loading = ref(false);
const errorMessage = ref('');
const copied = ref(false);

async function load() {
  loading.value = true;
  errorMessage.value = '';
  row.value = null;
  try {
    const res = await api.get(`/contributions/${encodeURIComponent(props.slug)}`, authHeaders());
    row.value = res.data;
  } catch (e) {
    errorMessage.value = e.response?.data?.error || e.message || 'Contribution not found.';
  } finally {
    loading.value = false;
  }
}

function copy(text) {
  const s = String(text || '').trim();
  if (!s) return;
  navigator.clipboard?.writeText(s).then(() => {
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1500);
  });
}

onMounted(load);
watch(() => props.slug, load);
</script>

<style scoped>
.contribution-docs :deep(img) {
  max-width: 100%;
}
.contribution-docs :deep(pre) {
  overflow-x: auto;
}
</style>
