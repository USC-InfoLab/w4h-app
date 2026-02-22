<template>
  <main role="main">

    <div v-if="allRows.length" class="container-fluid">

      <div class="row align-items-center mb-0">
        <div class="col-auto">
          <select class="form-select form-select-sm" v-model="selectedAccount">
            <option :value="null">All Accounts</option>
            <option v-for="acc in uniqueAccounts" :key="acc.id" :value="acc.id">
              {{ acc.name }}
            </option>
          </select>
        </div>

        <div class="col-auto">
          <select class="form-select form-select-sm" v-model="selectedCity">
            <option v-for="city in cities" :key="city.id" :value="city.id">
              {{ city.name }}
            </option>
          </select>
        </div>

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
                <div class="fw-bold text-warning">{{ props.row.account }}</div>
                <div class="fw-bold text-secondary">{{ props.row.name }}</div>
                <div><a :href="'mailto:' + props.row.email">{{ props.row.email }}</a></div>
              </span>
              <span v-else>{{ props.formattedRow[props.column.field] }}</span>
            </template>
          </VueGoodTable>
        </div>
      </div>

      <div v-else class="text-center my-5">
        <p class="text-muted">
          No users found for
          <strong>
            {{accounts.find(a => a.id === selectedAccount)?.name || 'this selection'}}
          </strong>.
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
import { ref, onMounted, onBeforeUnmount, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { VueGoodTable } from 'vue-good-table-next';
import 'vue-good-table-next/dist/vue-good-table-next.css';

const router = useRouter();
const userStore = useUserStore();

const selectedCity = ref(null);

const selectedAccount = ref(null);
const accounts = ref([]); // To store raw account data from API

const uniqueAccounts = computed(() => {
  return [...accounts.value].sort((a, b) =>
    a.name.localeCompare(b.name)
  );
});

// 2. Storage Watcher
watch(selectedCity, (val) => {
  if (val === null || val === undefined) {
    localStorage.removeItem('selected_city_id');
  } else {
    localStorage.setItem('selected_city_id', val);
  }
});

// 3. Columns
const columns = [
  { label: 'Account', field: 'account' },
  { label: 'Name', field: 'name' },
  { label: 'Email', field: 'email' },
  { label: 'Role', field: 'role' },
  { label: 'City', field: 'city' },
  { label: 'Can send', field: 'can_send' },
  { label: '', field: 'edit', sortable: false }
];

const columnsSmall = [
  { label: 'Name', field: 'name' },
  { label: '', field: 'edit', sortable: false }
];

// hold all users, never filtered
const allRows = ref([]);
const cities = ref([]);

// computed rows for table - now filters by selectedCity
const filteredRows = computed(() => {
  return allRows.value.filter(r => {
    const matchesCity = selectedCity.value === null || r.city_id === selectedCity.value;
    const matchesAccount = selectedAccount.value === null || r.account_id === selectedAccount.value;
    return matchesCity && matchesAccount;
  });
});

const tableTheme = ref('nocturnal bg-dark');

onMounted(async () => {
  document.title = 'Users';

  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
  prefersDarkTheme.addEventListener('change', updateTheme);
  updateTheme(prefersDarkTheme);

  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  tableTheme.value = mql.matches ? 'nocturnal bg-dark' : '';

  try {
    const [citiesRes, usersRes, accountsRes] = await Promise.all([
      api.get('datasets/cities', authHeaders()),
      api.get('users/list', authHeaders()),
      api.get('users/accounts', authHeaders()),
    ]);

    cities.value = [{ id: null, name: 'All Cities' }, ...citiesRes.data];
    accounts.value = accountsRes.data;

    allRows.value = usersRes.data.map(u => ({
      ...u,
      city: citiesRes.data.find(c => c.id === u.city_id)?.name || '',
      account: accountsRes.data.find(a => a.id === u.account_id)?.name || '',
      can_send: u.can_send ? 'Yes' : 'No'
    }));
  } catch (e) {
    console.error(e);
  }
});

// Navigation & Theme helpers
function onEditButtonClick(row) {
  const isSelf = row.email === userStore.user.email;
  router.push({
    name: isSelf ? 'userProfileEdit' : 'usersEdit',
    params: isSelf ? {} : { email: encodeURIComponent(row.email).replace(/\./g, '%2E') }
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