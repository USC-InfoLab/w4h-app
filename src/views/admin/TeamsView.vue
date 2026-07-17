<template>
  <main role="main">
    <div class="container-fluid">
      <div class="row align-items-center mb-2">
        <div class="col">
          <h5 class="mb-0">
            <i class="bi bi-people-fill me-1"></i>
            Teams
          </h5>
        </div>
        <div v-if="isSuperAdmin(user.role)" class="col-auto ms-auto">
          <button class="btn btn-sm btn-primary" @click="$router.push({ name: 'adminTeamsAdd' })">
            <i class="bi bi-plus"></i> Add Team
          </button>
        </div>
      </div>

      <div v-if="loading" class="text-center mt-5">
        <div class="spinner-border text-primary" role="status"></div>
        <p>Loading teams...</p>
      </div>

      <div v-else-if="!rows.length" class="text-center my-5">
        <p class="text-muted mb-3">No teams yet.</p>
        <button
          v-if="isSuperAdmin(user.role)"
          class="btn btn-primary btn-sm"
          @click="$router.push({ name: 'adminTeamsAdd' })"
        >
          Create the first team
        </button>
      </div>

      <div v-else class="d-none d-lg-block">
        <VueGoodTable
          :columns="columns"
          :rows="rows"
          :search-options="{ enabled: true }"
          :pagination-options="{ enabled: true }"
          compactMode
          :theme="tableTheme"
        >
          <template #table-row="props">
            <span v-if="props.column.field === 'edit'">
              <button class="btn btn-primary btn-sm" @click="onEdit(props.row)">Edit</button>
            </span>
            <span v-else>{{ props.formattedRow[props.column.field] }}</span>
          </template>
        </VueGoodTable>
      </div>

      <div v-if="rows.length" class="d-lg-none">
        <div v-for="row in rows" :key="row.id" class="border rounded p-3 mb-2">
          <div class="fw-semibold">{{ row.name }}</div>
          <div class="small text-muted">{{ row.slug }} · {{ row.member_count }} members · {{ row.status }}</div>
          <button class="btn btn-primary btn-sm mt-2" @click="onEdit(row)">Edit</button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { VueGoodTable } from 'vue-good-table-next';
import 'vue-good-table-next/dist/vue-good-table-next.css';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';
import { isSuperAdmin } from '@/utils/roles';
import { useUserStore } from '@/stores/user';

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const rows = ref([]);
const loading = ref(true);
const tableTheme = ref('');

const columns = [
  { label: 'Name', field: 'name' },
  { label: 'Slug', field: 'slug' },
  { label: 'Members', field: 'member_count' },
  { label: 'Status', field: 'status' },
  { label: '', field: 'edit', sortable: false },
];

function onEdit(row) {
  router.push({ name: 'adminTeamsEdit', params: { id: row.id } });
}

function updateTheme(mql) {
  tableTheme.value = mql.matches ? 'nocturnal bg-dark' : '';
}

onMounted(async () => {
  document.title = `${APP_NAME} Teams`;
  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
  prefersDarkTheme.addEventListener('change', updateTheme);
  updateTheme(prefersDarkTheme);

  try {
    const res = await api.get('teams', authHeaders());
    rows.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    console.error(e);
    rows.value = [];
  } finally {
    loading.value = false;
  }
});

onBeforeUnmount(() => {
  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
  prefersDarkTheme.removeEventListener('change', updateTheme);
});
</script>
