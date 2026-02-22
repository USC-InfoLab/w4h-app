<template>
  <main class="Datasets">

    <div class="d-flex align-items-center justify-content-between mb-3">
      <!-- Left: city name -->
      <div style="max-width: 300px;">
        <select class="form-select form-select-sm" v-model="selectedCity" @change="loadDatasets">
          <option disabled value="">Select a city...</option>
          <option v-for="city in cities" :key="city.id" :value="city.id">
            {{ city.name }}
          </option>
        </select>
      </div>

      <small>{{ datasets.length }} datasets
        <button type="button" class="btn btn-link btn-sm p-0 ms-2" @click="loadDatasets" :disabled="loading">
          <i class="bi bi-arrow-clockwise"></i> Refresh
        </button>
      </small>
    </div>

    <div class="toast-container position-fixed top-0 end-0 p-3">
      <div id="statusToast" class="toast align-items-center text-bg-success border-0" role="alert" aria-live="assertive"
        aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
          </div>
          <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    </div>

    <div v-if="datasets.length > 0">
      <details v-for="dataset in datasets" :key="dataset.id" class="mb-3 border rounded">

        <summary class="px-2 py-1 h5 m-0 d-flex align-items-center gap-2" style="cursor: pointer;">

          <!-- Dataset name -->
          <span class="fw-semibold text-truncate" style="max-width: 300px;"
            v-tooltip="dataset.description || 'No description available'">
            {{ dataset.name }}
          </span>

          <!-- Eye icon (moved BEFORE pills) -->
          <span class="text-muted" v-tooltip="dataset.hidden ? 'Dataset is hidden' : 'Dataset is visible'">
            <i class="bi" :class="dataset.hidden ? 'bi-eye-slash-fill' : 'bi-eye-fill'"></i>
          </span>

          <!-- Pills: start immediately after name + eye -->
          <span class="d-flex align-items-center gap-2">

            <!-- TABLE STATUS PILL -->
            <span class="badge rounded-pill bg-body-secondary text-body
             d-flex align-items-center gap-1 px-2" v-tooltip="tableStatusTooltip(dataset)">
              <i class="bi bi-table"></i>

              <span v-if="tablesOk(dataset) > 0" class="badge bg-success square-pill">
                {{ tablesOk(dataset) }}
              </span>

              <span v-if="tablesNeedingAttention(dataset) > 0" class="badge bg-warning text-dark square-pill">
                {{ tablesNeedingAttention(dataset) }}
              </span>
            </span>

          </span>

          <!-- Push utilities to the far right -->
          <span class="ms-auto d-flex align-items-center gap-2 flex-nowrap">
            <CopyBox :data="dataset.id" />

            <button type="button" class="btn btn-outline-primary btn-sm" @click.stop="refreshDataset(dataset.id)"
              :disabled="isRefreshing(dataset.id)" title="Refresh this dataset">
              <span v-if="isRefreshing(dataset.id)" class="spinner-border spinner-border-sm"></span>
              <i v-else class="bi bi-arrow-clockwise"></i>
              <span class="d-none d-sm-inline ms-1">
                {{ isRefreshing(dataset.id) ? 'Refreshing...' : 'Refresh' }}
              </span>
            </button>
          </span>

        </summary>
        <div class="ps-3">

          {{ dataset.description }}

          <div v-if="!dataset.hidden">
            <a :href="router.resolve({
              name: 'docs',
              params: { slug: docsSlug(dataset.id) },
              hash: docsHash(dataset.id),
            }).href" target="_blank" rel="noopener" class="text-decoration-none"> 📚 Docs <i
                class="bi bi-box-arrow-in-up-right"></i> </a>
          </div>

          <div class="accordion mb-3 me-2" :id="`datasetAccordion-${dataset.id}`">
            <div class="accordion-item">
              <h2 class="accordion-header" :id="`headingDataset-${dataset.id}`">
                <button class="accordion-button" @click="triggerJsonRender(dataset.id)" :class="[
                  dataset.tables?.some(t => t.status?.needs_index)
                    ? 'bg-danger-subtle'
                    : dataset.tables?.some(t => t.status?.needs_update)
                      ? 'bg-warning-subtle'
                      : ''
                ]" type="button" data-bs-toggle="collapse" :data-bs-target="`#collapseDataset-${dataset.id}`"
                  aria-expanded="true" :aria-controls="`collapseDataset-${dataset.id}`">
                  <i class="bi-code me-2"></i> Dataset
                </button>
              </h2>

              <div :id="`collapseDataset-${dataset.id}`" class="accordion-collapse collapse"
                :aria-labelledby="`headingDataset-${dataset.id}`" :data-bs-parent="`#datasetAccordion-${dataset.id}`">
                <div class="accordion-body">
                  <div class="json-scroll">
                    <highlightjs v-if="loadedJsonViews.has(dataset.id)" language="json"
                      :code="JSON.stringify(dataset, null, 2)" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="dataset.tables?.length" class="mt-3">

            <div class="accordion me-2" :id="`tablesAccordion-${dataset.id}`">
              <div class="accordion-item">

                <!-- HEADER -->
                <h2 class="accordion-header" :id="`headingTables-${dataset.id}`">
                  <button class="accordion-button py-2" type="button" data-bs-toggle="collapse"
                    :data-bs-target="`#collapseTables-${dataset.id}`" aria-expanded="true"
                    :aria-controls="`collapseTables-${dataset.id}`">
                    <i class="bi bi-grid-3x3-gap-fill me-2"></i>
                    <strong>Tables</strong>
                    <span class="badge bg-body-secondary text-body ms-2">
                      {{ dataset.tables.length }}
                    </span>
                  </button>
                </h2>

                <!-- BODY (OPEN BY DEFAULT) -->
                <div :id="`collapseTables-${dataset.id}`" class="accordion-collapse collapse show"
                  :aria-labelledby="`headingTables-${dataset.id}`" :data-bs-parent="`#tablesAccordion-${dataset.id}`">
                  <div class="accordion-body p-2">

                    <ul class="ps-2 list-unstyled mb-0">

                      <li v-for="tableInfo in dataset.tables" :key="tableInfo.name" class="mb-2">

                        <details class="mb-1 me-2 border rounded" :class="!tableInfo.status?.needs_update && !tableInfo.status?.needs_index
                          ? 'bg-success-subtle'
                          : 'bg-warning-subtle'">
                          <!-- SUMMARY: TEXT ONLY -->
                          <summary class="px-2 py-1 m-0 h6 d-flex align-items-center gap-2" style="cursor: pointer;">
                            {{ tableInfo.name }}

                            <span v-if="tableInfo.status?.table_name && tableInfo.status.table_name !== tableInfo.name"
                              class="text-bg-danger px-1 py-0 rounded">
                              {{ tableInfo.status.table_name }}
                            </span>
                          </summary>

                          <!-- HEADER CONTROLS (INTERACTIVE, ACCESSIBLE) -->
                          <div class="px-2 pt-2 d-flex align-items-center justify-content-between flex-wrap gap-2"
                            v-if="tableInfo.status || tableInfo.metabase_url">
                            <CopyBox v-if="tableInfo.status" :data="tableInfo.status.id" class="inline-copybox" />

                            <a v-if="tableInfo.metabase_url" target="_blank" :href="tableInfo.metabase_url"
                              class="ms-auto">
                              Metabase <i class="bi bi-box-arrow-in-up-right"></i>
                            </a>
                          </div>

                          <!-- DETAILS CONTENT (UNCHANGED) -->
                          <div class="px-3 pb-2" v-if="tableInfo.status">
                            <div class="table-responsive">
                              <table class="table table-sm align-middle mb-0">
                                <thead>
                                  <tr>
                                    <th></th>
                                    <th>Rows</th>
                                    <th>Start Date</th>
                                    <th>End Date</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr>
                                    <th>Table</th>
                                    <td :class="tableInfo.status.source_row_count &&
                                      tableInfo.status.source_row_count !== tableInfo.status.table_row_count
                                      ? 'text-warning'
                                      : ''">
                                      {{ formatNumber(tableInfo.status.table_row_count) }}
                                    </td>
                                    <td v-if="tableInfo.status.table_date_min">
                                      {{ tableInfo.status.table_date_min }}
                                    </td>
                                    <td v-if="tableInfo.status.table_date_max">
                                      {{ tableInfo.status.table_date_max }}
                                    </td>
                                    <td v-else colspan="2" class="text-muted">NA</td>
                                  </tr>

                                  <tr>
                                    <th>Source</th>
                                    <td>{{ formatNumber(tableInfo.status.source_row_count) }}</td>
                                    <td v-if="tableInfo.status.source_date_min">
                                      {{ tableInfo.status.source_date_min }}
                                    </td>
                                    <td v-if="tableInfo.status.source_date_max">
                                      {{ tableInfo.status.source_date_max }}
                                    </td>
                                    <td v-else colspan="2" class="text-muted">NA</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            <small v-if="tableInfo.status.log_time">
                              <div>Last checked: {{ formatDate(tableInfo.status.log_time) }}</div>
                              <div>
                                <strong>Status info:</strong>
                                <pre>{{ tableInfo.status.update_message }}</pre>
                              </div>
                            </small>
                          </div>
                        </details>

                      </li>

                    </ul>

                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </details>
    </div>

    <div v-else>
      <div v-if="loading" class="text-center">
        <p>Loading datasets...</p>
        <div class="overlay d-flex align-items-center justify-content-center">
          <div class="spinner-border" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>

      <div v-else class="text-center text-muted">
        <p>No datasets available yet for {{ user.city_name }}.</p>
      </div>
    </div>

    <div class="toast-container position-fixed bottom-0 end-0 p-3">
      <div id="copyToast" class="toast align-items-center text-bg-success border-0" role="alert">
        <div class="d-flex">
          <div class="toast-body">
            Copied to clipboard!
          </div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    </div>

  </main>
</template>

<script setup>
import { Toast } from 'bootstrap';
import { ref, onMounted, reactive } from 'vue';

import { useRouter } from 'vue-router';
const router = useRouter();

import { api, authHeaders } from '@/utils/api';
import { formatNumber, formatDate } from '@/utils/format';

import CopyBox from '@/components/CopyBox.vue';

import { useUserStore } from '@/stores/user';
const userStore = useUserStore();
const user = ref(userStore.user);

const datasets = ref([]);
const cities = ref([]);

const savedCity = localStorage.getItem('selected_city_id');
const selectedCity = ref(savedCity || user.value.city_id);

const loading = ref(true);
const refreshingDatasets = ref({});

// const DARK_PREVIEW_COLOR = 'aqua';
// const LIGHT_PREVIEW_COLOR = 'black';

// New state to track which JSON blobs have been requested by the user
const loadedJsonViews = reactive(new Set());

// Method to trigger the render
const triggerJsonRender = (id) => {
  loadedJsonViews.add(id);
};

const docsHash = (id) => {
  if (!id) return '';
  return '#' + id
    .replace(/^[^-]+-/, '')        // remove first segment (city)
    .replace(/-neighborhood$/, '') // remove trailing -neighborhood
    .replace(/-community$/, '');   // remove trailing -community
};

const docsSlug = (id) => {
  if (!id) return '';
  const city = id.split('-')[0];
  return `${city}-datasets`;
};

const showToast = (message, isError = false) => {
  const toastEl = document.getElementById('statusToast');
  const toastBody = toastEl.querySelector('.toast-body');
  toastBody.textContent = message;

  if (isError) {
    toastEl.classList.remove('text-bg-success');
    toastEl.classList.add('text-bg-danger');
  } else {
    toastEl.classList.remove('text-bg-danger');
    toastEl.classList.add('text-bg-success');
  }

  const toast = new Toast(toastEl);
  toast.show();
};

function tablesNeedingUpdate(dataset) {
  return dataset.tables.filter(t => t.status?.needs_update).length;
}

function tablesNeedingIndex(dataset) {
  return dataset.tables.filter(t => t.status?.needs_index).length;
}

function tablesNeedingAttention(dataset) {
  return tablesNeedingUpdate(dataset) + tablesNeedingIndex(dataset);
}

function tablesOk(dataset) {
  return dataset.tables.length - tablesNeedingAttention(dataset);
}

function tableStatusTooltip(dataset) {
  const ok = tablesOk(dataset);
  const update = tablesNeedingUpdate(dataset);
  const index = tablesNeedingIndex(dataset);
  const total = dataset.tables.length;

  const parts = [];
  if (ok > 0) parts.push(`${ok} OK`);
  if (update > 0) parts.push(`${update} need update`);
  if (index > 0) parts.push(`${index} need indexing`);

  return `${parts.join(', ')} (total ${total}) last checked: ${formatDate(dataset.log_time)}`;
}

const isRefreshing = (id) => {
  return refreshingDatasets.value[id];
};

const refreshDataset = async (datasetId) => {
  if (refreshingDatasets.value[datasetId]) {
    return;
  }
  refreshingDatasets.value = { ...refreshingDatasets.value, [datasetId]: true };

  try {
    const response = await api.get(`datasets/${datasetId}`, {
      ...authHeaders(),
      params: { city_id: selectedCity.value }
    });
    const updatedDataset = response.data;
    updatedDataset.needs_update = updatedDataset.tables.some(t => t.status?.needs_update);
    updatedDataset.needs_index = updatedDataset.tables.some(t => t.status?.needs_index);
    updatedDataset.has_index = updatedDataset.tables.some(t => t.status?.has_index);
    updatedDataset.has_update = updatedDataset.tables.some(t => t.status?.has_update);

    const index = datasets.value.findIndex(d => d.id === datasetId);
    if (index !== -1) {
      datasets.value.splice(index, 1, updatedDataset);
    }
    showToast(`Dataset "${updatedDataset.name}" refreshed successfully!`);
  } catch (error) {
    showToast(`Failed to refresh dataset. Please try again.`, true);
    console.error('Refresh failed:', error);
  } finally {
    refreshingDatasets.value = { ...refreshingDatasets.value, [datasetId]: false };
  }
};

// Load list of cities
async function loadCities() {
  try {
    const response = await api.get('datasets/cities', authHeaders());
    cities.value = response.data;
  } catch (err) {
    console.error('Failed to load cities:', err);
  }
}

// Load datasets based on selected city
async function loadDatasets() {
  if (!selectedCity.value) return;

  localStorage.setItem('selected_city_id', selectedCity.value);

  loading.value = true;
  datasets.value = [];
  try {
    const response = await api.get(`datasets?city_id=${selectedCity.value}`, authHeaders());
    datasets.value = response.data;
  } catch (err) {
    console.error('Failed to load datasets:', err);
  } finally {
    loading.value = false;
  }

  datasets.value.forEach(dataset => {
    dataset.needs_update = false;
    dataset.needs_index = false;
    dataset.has_index = false;
    dataset.has_update = false;
    dataset.log_time = null;

    dataset.tables.forEach(table => {
      if (table.status?.needs_update) dataset.needs_update = true;
      if (table.status?.needs_index) dataset.needs_index = true;
      if (table.status?.has_index) dataset.has_index = true;
      if (table.status?.has_update) dataset.has_update = true;
      if (table.status?.log_time) dataset.log_time = table.status.log_time;
    });
  });
}

onMounted(async () => {
  await loadCities();
  await loadDatasets();
});

</script>

<style scoped>
/* Custom list-unstyled for deeper nesting without default bullet points */
ul.list-unstyled li {
  list-style-type: none;
}

.dataset-column,
.category-column,
.stat-column,
.aggregation-column,
.date-column,
.display-column,
.settings-city-column,
.settings-partition-column,
.settings-image-column,
.settings-size-column,
.json-scroll {
  max-height: 550px;
  overflow-y: auto;
}

.inline-copybox {
  display: inline-flex;
  align-items: center;
  margin-left: 0.5rem;
  vertical-align: middle;
}

/* Only apply to top-level dataset summaries */
.Datasets>div>details>summary::before {
  content: "▶";
  font-weight: bold;
  display: inline-block;
  margin-right: 6px;
  transform: rotate(0deg);
  transition: transform 0.2s ease;
}

/* Rotate arrow when the dataset is open */
.Datasets>div>details[open]>summary::before {
  transform: rotate(90deg);
}

.btn-outline-primary {
  white-space: nowrap;
}
</style>