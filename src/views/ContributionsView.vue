<template>
  <main role="main" class="container-fluid">
    <div class="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
      <div>
        <h5 class="mb-1">
          <i class="bi bi-box-seam me-1"></i>
          Contributions
        </h5>
        <p class="small text-muted mb-0">
          Curated notebooks, CLI, scripts, and Postgres extensions (publisher + git README).
          <router-link :to="{ name: 'docs', params: { slug: 'sample-packages' } }">How to contribute</router-link>
        </p>
      </div>
    </div>

    <ContributionRolesNote />

    <div class="row g-2 mb-3">
      <div class="col-md-5">
        <label class="visually-hidden" for="contribution-search">Search contributions</label>
        <input
          id="contribution-search"
          v-model="q"
          type="search"
          class="form-control"
          placeholder="Search — e.g. CSV, fft, python"
        />
      </div>
      <div class="col-md-7">
        <div class="btn-group flex-wrap" role="group" aria-label="Contribution kind">
          <button
            v-for="k in kindOptions"
            :key="k.id"
            type="button"
            class="btn btn-sm"
            :class="kind === k.id ? 'btn-primary' : 'btn-outline-primary'"
            @click="kind = k.id"
          >
            {{ k.label }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>
    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading contributions…</p>
    </div>

    <div v-else-if="items.length" class="row g-3">
      <div v-for="row in items" :key="row.slug" class="col-md-6 col-xl-4">
        <button
          type="button"
          class="card h-100 text-start w-100 contribution-card"
          @click="$router.push({ name: 'contributionDetail', params: { slug: row.slug } })"
        >
          <div class="card-body">
            <h6 class="card-title mb-1">{{ row.title || row.slug }}</h6>
            <div class="small text-muted mb-2">{{ row.publisher }}</div>
            <div class="mb-2">
              <ContributionKindBadges :row="row" />
              <span class="badge text-bg-light border">{{ row.language }}</span>
            </div>
            <p class="small text-muted mb-0">{{ row.summary }}</p>
          </div>
        </button>
      </div>
    </div>

    <div v-else class="alert alert-secondary">No contributions match this search.</div>
  </main>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';
import ContributionRolesNote from '@/components/contributions/ContributionRolesNote.vue';
import ContributionKindBadges from '@/components/contributions/ContributionKindBadges.vue';

const kindOptions = [
  { id: '', label: 'All' },
  { id: 'notebook', label: 'Notebook' },
  { id: 'cli', label: 'CLI' },
  { id: 'script', label: 'Script' },
  { id: 'postgres_extension', label: 'Postgres extension' },
  { id: 'dataset', label: 'Dataset' },
];

const q = ref('');
const kind = ref('');
const items = ref([]);
const loading = ref(false);
const errorMessage = ref('');

async function load() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const params = {};
    if (q.value.trim()) params.q = q.value.trim();
    if (kind.value) params.kind = kind.value;
    const res = await api.get('/contributions', { ...authHeaders(), params });
    items.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    errorMessage.value = e.response?.data?.error || e.message || 'Failed to load contributions.';
    items.value = [];
  } finally {
    loading.value = false;
  }
}

let debounce;
watch([q, kind], () => {
  clearTimeout(debounce);
  debounce = setTimeout(load, 200);
});

onMounted(load);
</script>

<style scoped>
.contribution-card {
  border: 1px solid var(--bs-border-color);
  background: var(--bs-body-bg);
  color: inherit;
  cursor: pointer;
}
.contribution-card:hover {
  border-color: var(--bs-primary);
}
</style>
