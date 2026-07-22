<template>
  <main role="main" class="container-fluid">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb">
        <li class="breadcrumb-item">
          <router-link to="/admin/datasets">Datasets</router-link>
        </li>
        <li class="breadcrumb-item active" aria-current="page">Shares</li>
      </ol>
    </nav>

    <div class="row align-items-center mb-3">
      <div class="col">
        <h5 class="mb-0">
          <i class="bi bi-share me-1"></i>
          Dataset shares
        </h5>
        <p class="small text-muted mb-0">
          Outbound: datasets your team shared. Inbound: datasets shared with your team.
          Recipients link shared datasets from a project’s Linked datasets panel.
        </p>
      </div>
    </div>

    <div v-if="errorMessage" class="alert alert-danger">{{ errorMessage }}</div>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading shares...</p>
    </div>

    <template v-else>
      <div class="card p-3 mb-3">
        <h6 class="card-title">Outbound</h6>
        <div v-if="!outbound.length" class="small text-muted">No outbound shares.</div>
        <ul v-else class="list-group list-group-flush">
          <li
            v-for="s in outbound"
            :key="s.id"
            class="list-group-item px-0 d-flex justify-content-between align-items-center gap-2"
          >
            <div class="min-w-0 small">
              <div class="fw-semibold text-truncate">
                <router-link :to="{ name: 'adminDatasetsEdit', params: { id: s.dataset_id }, hash: '#shares' }">
                  {{ s.dataset_name || s.dataset_id }}
                </router-link>
                → {{ s.target_team_name }}
              </div>
              <div class="text-muted">
                {{ s.access_type }}
                <template v-if="s.shared_at"> · {{ formatWhen(s.shared_at) }}</template>
              </div>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger flex-shrink-0"
              :disabled="busy"
              @click="revoke(s)"
            >
              Revoke
            </button>
          </li>
        </ul>
      </div>

      <div class="card p-3">
        <h6 class="card-title">Inbound</h6>
        <div v-if="!inbound.length" class="small text-muted">No inbound shares.</div>
        <ul v-else class="list-group list-group-flush">
          <li
            v-for="s in inbound"
            :key="s.id"
            class="list-group-item px-0 d-flex justify-content-between align-items-center gap-2"
          >
            <div class="min-w-0 small">
              <div class="fw-semibold text-truncate">
                {{ s.dataset_name || s.dataset_id }}
                <span class="text-muted fw-normal">
                  · Shared by {{ s.owner_team_name || 'another team' }}
                </span>
              </div>
              <div class="text-muted">
                {{ s.access_type }}
                <template v-if="s.shared_at"> · {{ formatWhen(s.shared_at) }}</template>
              </div>
            </div>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger flex-shrink-0"
              :disabled="busy"
              @click="revoke(s)"
            >
              Revoke
            </button>
          </li>
        </ul>
      </div>
    </template>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { api, authHeaders } from '@/utils/api';

const loading = ref(true);
const busy = ref(false);
const errorMessage = ref('');
const outbound = ref([]);
const inbound = ref([]);

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

async function load() {
  loading.value = true;
  errorMessage.value = '';
  try {
    const res = await api.get('datasets/shares', authHeaders());
    outbound.value = Array.isArray(res.data?.outbound) ? res.data.outbound : [];
    inbound.value = Array.isArray(res.data?.inbound) ? res.data.inbound : [];
  } catch (error) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load shares.';
    outbound.value = [];
    inbound.value = [];
  } finally {
    loading.value = false;
  }
}

async function revoke(share) {
  if (!share?.id) return;
  const label = share.direction === 'inbound'
    ? `inbound share of ${share.dataset_name || share.dataset_id}`
    : `share of ${share.dataset_name || share.dataset_id} with ${share.target_team_name}`;
  if (!window.confirm(`Revoke ${label}?`)) return;
  busy.value = true;
  try {
    await api.delete(`datasets/shares/${encodeURIComponent(share.id)}`, authHeaders());
    await load();
  } catch (error) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to revoke share.';
  } finally {
    busy.value = false;
  }
}

onMounted(() => {
  document.title = 'Dataset shares';
  load();
});
</script>
