<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';

const props = defineProps({
  /** Show the Owned filter (Admins). */
  showOwnedFilter: { type: Boolean, default: false },
});

const catalogRows = ref([]);
const catalogLoading = ref(false);
const catalogError = ref('');
const catalogFilter = ref('all');

const filteredCatalog = computed(() => {
  const rows = catalogRows.value;
  if (catalogFilter.value === 'owned') {
    return rows.filter((d) => d.source_kind === 'local' || !d.source_kind);
  }
  if (catalogFilter.value === 'outside') {
    return rows.filter((d) => d.source_kind === 'listed' || d.source_kind === 'shared');
  }
  return rows;
});

function catalogStatusLabel(dataset) {
  if (dataset?.source_kind === 'shared') return 'Already shared — ask your Admin to add it';
  if (dataset?.source_kind === 'listed') return 'Listed — contact owner to request access';
  return '';
}

function contactPeople(dataset) {
  const emails = String(dataset?.contact_emails || '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);
  const names = String(dataset?.contact_names || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean);
  return emails.map((email, i) => ({
    email,
    name: names[i] && names[i] !== email ? names[i] : '',
  }));
}

async function loadCatalog() {
  catalogLoading.value = true;
  catalogError.value = '';
  try {
    const res = await api.get('datasets', {
      ...authHeaders(),
      params: { catalog: 1 },
    });
    catalogRows.value = Array.isArray(res.data) ? res.data : [];
  } catch (error) {
    catalogError.value = error.response?.data?.error || error.message || 'Failed to load datasets.';
    catalogRows.value = [];
  } finally {
    catalogLoading.value = false;
  }
}

watch(
  () => props.showOwnedFilter,
  (show) => {
    if (!show && catalogFilter.value === 'owned') catalogFilter.value = 'all';
  }
);

onMounted(loadCatalog);

defineExpose({ reload: loadCatalog });
</script>

<template>
  <div class="card mb-3">
    <div class="card-body">
      <div class="mb-2">
        <h6 class="card-title mb-1">Datasets</h6>
        <p class="small text-muted mb-2">
          Browse what is available. Contact an owner to request access;
          your <strong>Admin</strong> can then add it on the Project page.
        </p>
        <div class="btn-group" role="group" aria-label="Dataset filter">
          <button
            type="button"
            class="btn btn-sm"
            :class="catalogFilter === 'all' ? 'btn-primary' : 'btn-outline-primary'"
            @click="catalogFilter = 'all'"
          >
            All
          </button>
          <button
            v-if="showOwnedFilter"
            type="button"
            class="btn btn-sm"
            :class="catalogFilter === 'owned' ? 'btn-primary' : 'btn-outline-primary'"
            @click="catalogFilter = 'owned'"
          >
            Owned
          </button>
          <button
            type="button"
            class="btn btn-sm"
            :class="catalogFilter === 'outside' ? 'btn-primary' : 'btn-outline-primary'"
            @click="catalogFilter = 'outside'"
          >
            Outside
          </button>
        </div>
        <p class="small text-muted mb-0 mt-2">
          <template v-if="catalogFilter === 'all'">
            Everything you can see — owned by your group plus listings from other groups.
          </template>
          <template v-else-if="catalogFilter === 'owned'">
            Datasets you own.
          </template>
          <template v-else>
            Datasets from other groups. Use the owner contact to request access, then ask your
            Admin to add it.
          </template>
        </p>
      </div>
      <div v-if="catalogLoading" class="text-muted small">Loading catalog…</div>
      <div v-else-if="catalogError" class="alert alert-danger py-2 small mb-0">{{ catalogError }}</div>
      <ul v-else-if="filteredCatalog.length" class="list-group list-group-flush">
        <li
          v-for="d in filteredCatalog"
          :key="d.id"
          class="list-group-item px-0 d-flex justify-content-between align-items-start gap-2"
        >
          <div class="min-w-0">
            <div class="fw-semibold">{{ d.name || d.id }}</div>
            <div class="small text-muted">
              <template v-if="d.team_name">{{ d.team_name }}</template>
              <template v-if="d.source_kind === 'local' || !d.source_kind">
                <span v-if="d.team_name"> · </span>
                <span>Projects: {{ d.project_names || 'None' }}</span>
                <span> · </span>
                <span>
                  {{ d.table_count ?? 0 }}
                  {{ Number(d.table_count) === 1 ? 'table' : 'tables' }}
                </span>
              </template>
              <template v-else-if="catalogStatusLabel(d)">
                <span v-if="d.team_name"> · </span>{{ catalogStatusLabel(d) }}
              </template>
            </div>
            <div
              v-if="(d.source_kind === 'listed' || d.source_kind === 'shared') && d.description"
              class="small text-muted mt-1 text-truncate"
            >
              {{ d.description }}
            </div>
            <div v-if="contactPeople(d).length" class="small mt-1">
              <span class="text-muted">Owner: </span>
              <template v-for="(p, i) in contactPeople(d)" :key="p.email">
                <span v-if="i">, </span>
                <a :href="`mailto:${p.email}?subject=${encodeURIComponent('Access request: ' + (d.name || d.id))}`">
                  {{ p.name ? `${p.name} (${p.email})` : p.email }}
                </a>
              </template>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="small text-muted mb-0">
        <template v-if="catalogFilter === 'owned'">No owned datasets yet.</template>
        <template v-else-if="catalogFilter === 'outside'">No outside datasets listed.</template>
        <template v-else>No datasets yet.</template>
      </p>
    </div>
  </div>
</template>
