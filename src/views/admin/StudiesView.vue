<template>
  <main role="main">
    <div v-if="!loading" class="container-fluid">
      <div class="row align-items-center mb-0">
        <div class="col-auto ms-auto">
          <button class="btn btn-sm btn-primary my-2" @click="$router.push({ name: 'adminStudiesAdd' })">
            <i class="bi bi-plus"></i> Add Study
          </button>
        </div>
      </div>

      <div v-if="errorMessage" class="alert alert-danger">
        {{ errorMessage }}
      </div>

      <div v-if="filteredRows.length > 0">
        <div class="d-none d-lg-block">
          <VueGoodTable :columns="columns" :rows="filteredRows" :search-options="{ enabled: true }"
            :pagination-options="{ enabled: true }" compactMode :theme="tableTheme">
            <template #table-row="props">
              <span v-if="props.column.field === 'edit'">
                <button class="btn btn-primary btn-sm" @click="onEditButtonClick(props.row)">Edit</button>
              </span>
              <span v-else>{{ props.formattedRow[props.column.field] }}</span>
            </template>
          </VueGoodTable>
        </div>

        <div class="d-lg-none">
          <VueGoodTable :columns="columnsSmall" :rows="filteredRows" :search-options="{ enabled: true }"
            :paginate="true" compactMode :theme="tableTheme">
            <template #table-row="props">
              <span v-if="props.column.field === 'edit'">
                <button class="btn btn-secondary btn-sm" @click="onEditButtonClick(props.row)">Edit</button>
              </span>
              <span v-else-if="props.column.field === 'name'">
                <div class="fw-bold text-secondary">{{ props.row.name }}</div>
                <div class="small text-muted">{{ props.row.id }}</div>
                <div class="small text-muted">Datasets: {{ props.row.dataset_count }} | Users: {{ props.row.user_count
                  }}</div>
              </span>
              <span v-else>{{ props.formattedRow[props.column.field] }}</span>
            </template>
          </VueGoodTable>
        </div>
      </div>

      <div v-else class="text-center my-5">
        <p class="text-muted">No studies found.</p>
      </div>
    </div>

    <div v-else class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading studies...</p>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { VueGoodTable } from 'vue-good-table-next';
import 'vue-good-table-next/dist/vue-good-table-next.css';

const router = useRouter();

const columns = [
  { label: 'Name', field: 'name' },
  { label: 'ID', field: 'id' },
  { label: 'Description', field: 'description' },
  { label: 'Datasets', field: 'dataset_count' },
  { label: 'Users', field: 'user_count' },
  { label: '', field: 'edit', sortable: false }
];

const columnsSmall = [
  { label: 'Study', field: 'name' },
  { label: '', field: 'edit', sortable: false }
];

const allRows = ref([]);
const filteredRows = computed(() => allRows.value);
const tableTheme = ref('nocturnal bg-dark');
const loading = ref(true);
const errorMessage = ref('');

onMounted(async () => {
  document.title = 'Studies';

  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
  prefersDarkTheme.addEventListener('change', updateTheme);
  updateTheme(prefersDarkTheme);

  try {
    const res = await api.get('datasets/studies-admin', authHeaders());
    const rows = Array.isArray(res.data) ? res.data : [];

    allRows.value = rows.map((r) => ({
      id: r.id || '',
      name: r.name || '',
      description: r.description || '',
      dataset_count: r.dataset_count ?? 0,
      user_count: r.user_count ?? 0
    }));
  } catch (error) {
    console.error(error);
    errorMessage.value = error.response?.data?.error || error.message || 'Failed to load studies.';
    allRows.value = [];
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
  prefersDarkTheme.removeEventListener('change', updateTheme);
});

function updateTheme(prefersDarkTheme) {
  tableTheme.value = prefersDarkTheme.matches ? 'nocturnal bg-dark' : '';
}

function onEditButtonClick(row) {
  router.push({
    name: 'adminStudiesEdit',
    params: { id: row.id }
  });
}
</script>

<style scoped>
:deep(.vgt-table.nocturnal) {
  background-color: #343a40 !important;
}
</style>
