<template>
  <main role="main" class="container-fluid">
    <div class="row align-items-center mb-2">
      <div class="col">
        <h5 class="mb-0">
          <i class="bi bi-database me-1"></i>
          Datasets
          <span v-if="activeProjectName" class="text-muted fw-normal fs-6">· {{ activeProjectName }}</span>
        </h5>
      </div>
      <div v-if="isActiveProjectAdmin" class="col-auto ms-auto">
        <button class="btn btn-sm btn-primary my-2" @click="$router.push({ name: 'adminDatasetsAdd' })">
          <i class="bi bi-plus"></i> Add Dataset
        </button>
      </div>
    </div>

    <div class="btn-group mb-3" role="group" aria-label="Dataset filter">
      <button
        type="button"
        class="btn btn-sm"
        :class="filter === 'all' ? 'btn-primary' : 'btn-outline-primary'"
        @click="filter = 'all'"
      >
        All
      </button>
      <button
        type="button"
        class="btn btn-sm"
        :class="filter === 'mine' ? 'btn-primary' : 'btn-outline-primary'"
        @click="filter = 'mine'"
      >
        Mine
      </button>
      <button
        type="button"
        class="btn btn-sm"
        :class="filter === 'others' ? 'btn-primary' : 'btn-outline-primary'"
        @click="filter = 'others'"
      >
        Others
      </button>
      <button
        type="button"
        class="btn btn-sm"
        :class="filter === 'shared' ? 'btn-primary' : 'btn-outline-primary'"
        @click="filter = 'shared'"
      >
        Shared
      </button>
    </div>
    <p class="small text-muted mb-3">
      <template v-if="filter === 'all'">Owned, discoverable from other teams, and inbound shares.</template>
      <template v-else-if="filter === 'mine'">Datasets your team owns.</template>
      <template v-else-if="filter === 'others'">
        Discoverable datasets from other teams (name and description only — ask them to share to use).
      </template>
      <template v-else>
        Datasets explicitly shared with your team (linkable from a project).
      </template>
    </p>

    <div v-if="errorMessage" class="alert alert-danger">
      {{ errorMessage }}
    </div>

    <div v-if="loading" class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading datasets...</p>
    </div>

    <ul v-else-if="filteredDatasets.length" class="list-group">
      <li
        v-for="dataset in filteredDatasets"
        :key="dataset.id"
        class="list-group-item d-flex justify-content-between align-items-center gap-2"
      >
        <div class="min-w-0">
          <div class="fw-semibold">
            {{ dataset.name || dataset.id }}
          </div>
          <small class="text-muted">
            <template v-if="dataset.team_name">{{ dataset.team_name }}</template>
            <template v-if="dataset.source_kind === 'shared' || dataset.source_kind === 'listed'">
              <span v-if="dataset.team_name"> · </span>{{ dataset.source_label || dataset.source_kind }}
            </template>
            <template v-if="dataset.source_kind === 'local'">
              <span v-if="dataset.team_name"> · </span>
              <span>Projects: {{ dataset.project_names || 'None' }}</span>
              <span> · </span>
              <span>
                {{ dataset.table_count ?? 0 }}
                {{ Number(dataset.table_count) === 1 ? 'table' : 'tables' }}
              </span>
              <span v-if="dataset.discoverable === false"> · Hidden from other teams</span>
            </template>
          </small>
          <div
            v-if="dataset.source_kind === 'listed' && dataset.description"
            class="small text-muted mt-1 text-truncate"
          >
            {{ dataset.description }}
          </div>
        </div>
        <button
          v-if="dataset.source_kind === 'local' && isActiveProjectAdmin"
          class="btn btn-sm btn-outline-primary flex-shrink-0"
          @click="goEdit(dataset.id)"
        >
          Edit
        </button>
        <span v-else-if="dataset.source_kind === 'local'" class="small text-muted flex-shrink-0">
          View only
        </span>
        <span v-else class="small text-muted flex-shrink-0">
          {{ dataset.source_kind === 'shared' ? 'Shared' : 'Listed' }}
        </span>
      </li>
    </ul>

    <div v-else class="text-center my-5">
      <p class="text-muted mb-3">
        <template v-if="filter === 'all' || filter === 'mine'">No datasets yet.</template>
        <template v-else-if="filter === 'others'">No discoverable datasets from other teams.</template>
        <template v-else>No datasets shared with your team.</template>
      </p>
      <button
        v-if="(filter === 'all' || filter === 'mine') && isActiveProjectAdmin"
        class="btn btn-primary btn-sm"
        @click="$router.push({ name: 'adminDatasetsAdd' })"
      >
        Create the first dataset
      </button>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useTeamContext } from '@/composables/useTeamContext';

const router = useRouter();
const { activeProjectName, isActiveProjectAdmin } = useTeamContext();
const datasets = ref([]);
const loading = ref(true);
const errorMessage = ref('');
const filter = ref('all');

const filteredDatasets = computed(() => {
  const rows = datasets.value;
  if (filter.value === 'all') return rows;
  if (filter.value === 'shared') {
    return rows.filter((d) => d.source_kind === 'shared');
  }
  if (filter.value === 'others') {
    return rows.filter((d) => d.source_kind === 'listed');
  }
  return rows.filter((d) => d.source_kind === 'local' || !d.source_kind);
});

onMounted(async () => {
  document.title = 'Datasets';
  try {
    const res = await api.get('datasets', {
      ...authHeaders(),
      params: { catalog: 1 }
    });
    datasets.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load datasets.';
    datasets.value = [];
  } finally {
    loading.value = false;
  }
});

function goEdit(id) {
  router.push({ name: 'adminDatasetsEdit', params: { id } });
}
</script>
