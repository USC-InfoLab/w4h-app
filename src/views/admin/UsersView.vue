<template>
  <main role="main">

    <div v-if="allRows.length" class="container-fluid">

      <div class="row align-items-center mb-0">
        <div class="col-auto ms-auto">
          <button class="btn btn-sm btn-primary my-2" @click="$router.push({ name: 'usersAdd' })">
            <i class="bi bi-plus"></i> Add User
          </button>
        </div>
      </div>

      <div v-if="filteredRows.length > 0">
        <div class="d-none d-lg-block">
          <VueGoodTable :columns="columns" :rows="filteredRows" :search-options="{ enabled: true }"
            :pagination-options="{ enabled: true }" compactMode :theme="tableTheme">
            <template #table-row="props">
              <span v-if="props.column.field == 'edit'">
                <button class="btn btn-primary btn-sm" @click="onEditButtonClick(props.row)">Edit</button>
              </span>
              <span v-else-if="props.column.field == 'email'">
                <a :href="'mailto:' + props.row.email">{{ props.row.email }}</a>
              </span>
              <span v-else>{{ props.formattedRow[props.column.field] }}</span>
            </template>
          </VueGoodTable>
        </div>

        <div class="d-lg-none">
          <VueGoodTable :columns="columnsSmall" :rows="filteredRows" :search-options="{ enabled: true }"
            :paginate="true" compactMode :theme="tableTheme">
            <template #table-row="props">
              <span v-if="props.column.field == 'edit'">
                <button class="btn btn-secondary btn-sm" @click="onEditButtonClick(props.row)">Edit</button>
              </span>
              <span v-else-if="props.column.field == 'name'">
                <div class="fw-bold text-secondary">{{ props.row.name }}</div>
                <div><a :href="'mailto:' + props.row.email">{{ props.row.email }}</a></div>
                <div class="small text-muted">{{ props.row.studies || 'No projects assigned' }}</div>
              </span>
              <span v-else>{{ props.formattedRow[props.column.field] }}</span>
            </template>
          </VueGoodTable>
        </div>
      </div>

      <div v-else class="text-center my-5">
        <p class="text-muted">
          No users found.
        </p>
      </div>
    </div>

    <div v-else class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading data...</p>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { VueGoodTable } from 'vue-good-table-next';
import 'vue-good-table-next/dist/vue-good-table-next.css';
import { APP_NAME } from '@/utils/defs';

const router = useRouter();
const userStore = useUserStore();

const columns = [
  { label: 'Name', field: 'name' },
  { label: 'Email', field: 'email' },
  { label: 'Role', field: 'role' },
  { label: 'Projects', field: 'studies' },
  { label: '', field: 'edit', sortable: false }
];

const columnsSmall = [
  { label: 'Name', field: 'name' },
  { label: '', field: 'edit', sortable: false }
];

// hold all users, never filtered
const allRows = ref([]);

// computed rows for table
const filteredRows = computed(() => {
  return allRows.value;
});

const tableTheme = ref('nocturnal bg-dark');

onMounted(async () => {
  document.title = `${APP_NAME} Users`;

  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
  prefersDarkTheme.addEventListener('change', updateTheme);
  updateTheme(prefersDarkTheme);

  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  tableTheme.value = mql.matches ? 'nocturnal bg-dark' : '';

  try {
    const usersRes = await api.get('users/', authHeaders());
    const users = Array.isArray(usersRes.data) ? usersRes.data : [];

    allRows.value = users.map(u => ({
      ...u,
      name: u.name || '',
      email: u.email || '',
      role: u.role || '',
      studies: u.studies || ''
    }));
  } catch (e) {
    console.error(e);
    allRows.value = [];
  }
});

// Navigation & Theme helpers
function onEditButtonClick(row) {
  const isSelf = row.email === userStore.user.email;
  const isAdmin = userStore.user.role === 'admin';
  router.push({
    name: !isAdmin && isSelf ? 'userProfileEdit' : 'usersEdit',
    params: !isAdmin && isSelf ? {} : { email: row.email }
  });
}

onBeforeUnmount(() => {
  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
  prefersDarkTheme.removeEventListener('change', updateTheme);
});

function updateTheme(prefersDarkTheme) {
  tableTheme.value = prefersDarkTheme.matches ? 'nocturnal bg-dark' : '';
}
</script>

<style scoped>
:deep(.vgt-table.nocturnal) {
  background-color: #343a40 !important;
}
</style>