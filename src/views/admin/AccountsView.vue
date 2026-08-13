<template>
  <main role="main">
    <div v-if="rows.length" class="container-fluid">

      <!-- Header -->
      <div class="row align-items-center mb-2">
        <div class="col">
          <h5 class="mb-0">
            <i class="bi bi-building me-1"></i>
            Accounts
          </h5>
        </div>

        <div class="col-auto ms-auto">
          <button class="btn btn-sm btn-primary" @click="$router.push({ name: 'accountsAdd' })">
            <i class="bi bi-plus"></i> Add Account
          </button>
        </div>
      </div>

      <!-- Desktop -->
      <div class="d-none d-lg-block">
        <VueGoodTable :columns="columns" :rows="rows" :search-options="{ enabled: true }"
          :pagination-options="{ enabled: true }" compactMode :theme="tableTheme">
          <template #table-row="props">
            <span v-if="props.column.field === 'api_key'">
              <CopyBox :data="props.row.api_key" class="flex-grow-1 min-w-0" />
            </span>

            <span v-else-if="props.column.field === 'edit'">
              <button class="btn btn-primary btn-sm" @click="onEdit(props.row)">
                Edit
              </button>
            </span>

            <span v-else>
              {{ props.formattedRow[props.column.field] }}
            </span>
          </template>
        </VueGoodTable>
      </div>

      <!-- Mobile -->
      <div class="d-lg-none">
        <VueGoodTable :columns="columns" :rows="rows" :search-options="{ enabled: true }"
          :pagination-options="{ enabled: true }" compactMode :theme="tableTheme">
          <template #table-row="props">
            <span v-if="props.column.field === 'api_key'">
              <CopyBox :data="props.row.api_key" class="inline-copybox" />
            </span>

            <span v-else-if="props.column.field === 'edit'">
              <button class="btn btn-primary btn-sm" @click="onEdit(props.row)">
                Edit
              </button>
            </span>

            <span v-else>
              {{ props.formattedRow[props.column.field] }}
            </span>
          </template>
        </VueGoodTable>
      </div>
    </div>

    <!-- Loading -->
    <div v-else class="text-center mt-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p>Loading accounts...</p>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { api, authHeaders } from '../../utils/api';
import { APP_NAME } from '@/utils/defs';
import { VueGoodTable } from 'vue-good-table-next';
import 'vue-good-table-next/dist/vue-good-table-next.css';
import CopyBox from '@/components/CopyBox.vue';
import { useVgtTheme } from '@/composables/useVgtTheme';

const router = useRouter();
const rows = ref([]);
const { tableTheme } = useVgtTheme();

const columns = [
  { label: 'Account', field: 'name' },
  { label: 'City', field: 'city_name' },
  { label: 'API Key', field: 'api_key' },
  { label: '', field: 'edit', sortable: false }
];

// const columnsSmall = [
//   { label: 'Account', field: 'name' },
//   { label: '', field: 'edit', sortable: false }
// ];

onMounted(async () => {
  document.title = `${APP_NAME} Accounts`;

  try {
    const res = await api.get('users/accounts', authHeaders());

    rows.value = res.data.map(a => ({
      ...a,
      users_count: a.users_count ?? 0,
      cities_count: a.cities_count ?? 0,
      status: a.active ? 'Active' : 'Disabled'
    }));
  } catch (e) {
    console.error(e);
  }
});

function onEdit(account) {
  router.push({
    name: 'accountsEdit',
    params: { id: account.id }
  });
}
</script>