<template>
  <main class="DatasetsView">
    <h3 class="mb-3">{{ user.city_name }} Data</h3>

    <div class="toast-container position-fixed top-0 end-0 p-3">
      <div id="previewToast" class="toast align-items-center text-bg-success border-0" role="alert"
        aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">
            Generating {{ generatingCount }} of {{ mixinsIdsToUpdate.length }} mixin preview(s)...
          </div>
          <button type="button" class="btn-close me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    </div>

    <div v-if="datasets.length > 0">
      <details v-for="dataset in visibleDatasets" :key="dataset.id" class="mb-3 border rounded">

        <summary class="px-2 py-1 h5 m-0 d-flex align-items-center gap-2" style="cursor: pointer;">

          <!-- Dataset name -->
          <span class="fw-semibold text-truncate" style="max-width: 300px;"
            v-tooltip="dataset.description || 'No description available'">
            {{ dataset.name }}
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

            <!-- MIXINS PILL -->
            <span class="badge rounded-pill bg-body-secondary text-body
         d-flex align-items-center gap-1 px-2"
              v-tooltip="`${dataset.mixins.length} mixin${dataset.mixins.length === 1 ? '' : 's'}`">
              <i class="bi bi-puzzle"></i>
              {{ dataset.mixins.length }}
            </span>

          </span>

          <!-- Push utilities to the far right -->
          <span class="ms-auto d-flex align-items-center gap-2">
          </span>

        </summary>
        <div class="ps-3">

          <p class="mb-1">
            {{ dataset.description }} <a :href="router.resolve({
              name: 'docs',
              params: { slug: docsSlug(dataset.id) },
              hash: docsHash(dataset.id),
            }).href" target="_blank" rel="noopener" class="text-decoration-none"> 📚 Docs <i
                class="bi bi-box-arrow-in-up-right"></i> </a>
          </p>


          <div v-if="dataset.tables?.length" class="mt-3">

            <div class="accordion me-2" :id="`tablesAccordion-${dataset.id}`">
              <div class="accordion-item">

                <!-- HEADER -->
                <h2 class="accordion-header" :id="`headingTables-${dataset.id}`">
                  <button class="accordion-button py-2" type="button" data-bs-toggle="collapse"
                    :data-bs-target="`#collapseTables-${dataset.id}`" aria-expanded="false"
                    :aria-controls="`collapseTables-${dataset.id}`">
                    <i class="bi bi-grid-3x3-gap-fill me-2"></i>
                    <strong>Tables</strong>
                    <span class="badge bg-body-secondary text-body ms-2">
                      {{ dataset.tables.length }}
                    </span>
                  </button>
                </h2>

                <!-- BODY (OPEN BY DEFAULT) -->
                <div :id="`collapseTables-${dataset.id}`" class="accordion-collapse collapse"
                  :aria-labelledby="`headingTables-${dataset.id}`" :data-bs-parent="`#tablesAccordion-${dataset.id}`">
                  <div class="accordion-body p-2">

                    <ul class="ps-2 list-unstyled mb-0">

                      <li v-for="tableInfo in dataset.tables" :key="tableInfo.name" class="mb-2">
                        <details class="mb-1 me-2 border rounded" :class="!tableInfo.status?.needs_update && !tableInfo.status?.needs_index
                          ? 'bg-success-subtle'
                          : 'bg-warning-subtle'">
                          <summary class="px-2 py-0 m-0 h6 d-flex align-items-center justify-content-between"
                            style="cursor: pointer;">
                            <span class="d-flex align-items-center gap-1">

                              {{ tableInfo.name }}

                              <span
                                v-if="tableInfo.status?.table_name && tableInfo.status.table_name !== tableInfo.name"
                                class="text-bg-danger px-1 py-0 rounded">
                                {{ tableInfo.status.table_name }}
                              </span>

                            </span>

                            <span v-if="tableInfo.metabase_url" class="d-flex align-items-center">
                              <a target="_blank" :href="tableInfo.metabase_url" class="me-2">
                                Metabase <i class="bi bi-box-arrow-in-up-right"></i>
                              </a>
                            </span>
                          </summary>

                          <div class="px-3 pb-2" v-if="tableInfo.status">
                            <!-- EXISTING TABLE DETAILS (UNCHANGED) -->

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

          <div v-if="dataset.mixins?.length" class="my-3">

            <div class="accordion me-2" :id="`mixinsAccordion-${dataset.id}`">
              <div class="accordion-item">

                <!-- HEADER -->
                <h2 class="accordion-header" :id="`headingMixins-${dataset.id}`">
                  <button class="accordion-button collapsed py-2" type="button" data-bs-toggle="collapse"
                    :data-bs-target="`#collapseMixins-${dataset.id}`" aria-expanded="false"
                    :aria-controls="`collapseMixins-${dataset.id}`">
                    <i class="bi bi-puzzle me-2"></i>
                    <strong>Mixins</strong>
                    <span class="badge bg-body-secondary text-body ms-2">
                      {{ dataset.mixins.length }}
                    </span>
                  </button>
                </h2>

                <!-- BODY -->
                <div :id="`collapseMixins-${dataset.id}`" class="accordion-collapse collapse show"
                  :aria-labelledby="`headingMixins-${dataset.id}`" :data-bs-parent="`#mixinsAccordion-${dataset.id}`">
                  <div class="accordion-body">

                    <!-- EXISTING MIXIN CONTENT (UNCHANGED) -->
                    <div v-for="(mixin, index) in dataset.mixins" :key="index"
                      class="mb-2 p-2 border rounded shadow-sm">
                      <div class="ps-1">
                        <div class="row g-2 mb-2 small text-muted">

                          <div class="col-lg-4 col-sm-4">
                            <strong>
                              <a class="fs-6 text-decoration-none" :href="mixinBrowserUrl(mixin)" target="_blank"
                                rel="noopener">
                                {{ mixin.description }}
                                <i class="bi bi-box-arrow-up-right ms-1"></i>
                              </a>
                            </strong>
                            <div>
                              <em>Slug:</em> <b>{{ mixin.id }}</b>
                            </div>
                          </div>

                          <div class="col-lg-3 col-sm-4">
                            <span v-if="mixin.preview && mixin.preview.html_content" class="preview-container ms-3"
                              v-tooltip="`Trend for ${mixin.preview?.spec?.periods[0][0] || 'N/A'} → ${mixin.preview?.spec?.periods[0][1] || 'N/A'}`"
                              v-html="applyTheme(mixin.preview.html_content)"></span>
                            <span v-else class="text-muted small ms-3">
                              (Preview not available)
                            </span>
                          </div>

                          <span class="col-auto" v-if="mixin.value_column">
                            <em class="fw-semibold">Value Col:</em>
                            <code>{{ mixin.value_column }}</code>
                          </span>

                          <span class="col-auto" v-if="mixin.partition_column">
                            <em class="fw-semibold">Partition Col:</em>
                            <code>{{ mixin.partition_column }}</code>
                          </span>

                          <div class="col-auto small" v-if="mixin.filter">
                            <span class="fw-semibold">Filter</span>

                            <div v-if="mixin.filter.date_column">
                              date = <code>{{ mixin.filter.date_column }}</code>
                            </div>

                            <div v-else-if="mixin.filter.year_column">
                              year = <code>{{ mixin.filter.year_column }}</code>,
                              month = <code>{{ mixin.filter.month_column }}</code>
                            </div>

                            <span v-for="(columnFilter, colIndex) in mixin.filter.columns" :key="columnFilter.name">
                              column = <code>{{ columnFilter.name }}</code>

                              <span v-if="columnFilter.op">
                                <strong class="text-primary text-uppercase ms-2">
                                  {{ columnFilter.op }}
                                </strong>
                                <code v-if="Array.isArray(columnFilter.values)">
                        ({{columnFilter.values.map(v => `'${v}'`).join(', ')}})
                      </code>
                                <code v-else-if="columnFilter.value">
                        {{ columnFilter.value }}
                      </code>
                              </span>

                              <span v-else-if="columnFilter.values">
                                <strong class="text-primary"> IN </strong>
                                <code v-if="Array.isArray(columnFilter.values)">
                        ({{columnFilter.values.map(v => `'${v}'`).join(', ')}})
                      </code>
                                <code v-else>
                        '{{ columnFilter.values }}'
                      </code>
                              </span>

                              <span v-else-if="columnFilter.value">
                                <strong class="text-primary"> = </strong>
                                <code>'{{ columnFilter.value }}'</code>
                              </span>

                              <span v-if="colIndex < mixin.filter.columns.length - 1" class="text-primary">
                                <strong class="text-uppercase"> and </strong>
                              </span>
                            </span>
                          </div>

                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </details>
    </div>

    <div v-else>
      <div class="overlay d-flex align-items-center justify-content-center">
        <div class="spinner-border" role="status">
        </div>
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

<script setup name="DatasetsView">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();

import { api, authHeaders } from '@/utils/api';
import { formatNumber, formatDate } from '@/utils/format';

import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

import { useUIStore } from '@/stores/ui';
const uiStore = useUIStore();

const datasets = ref([]);
const generatingCount = ref(0);

const darkPreviewColor = 'aqua';
const lightPreviewColor = 'black';

const isAdminUI = computed(() => user.value.role === 'admin' && uiStore.isAdminUI);

// Filter datasets for display
const visibleDatasets = computed(() => {
  return datasets.value.filter(d => !d.hidden || isAdminUI.value);
});

const applyTheme = (html) => {
  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
  return prefersDarkTheme.matches ? html : html?.replaceAll(darkPreviewColor, lightPreviewColor);
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

onMounted(async () => {
  document.title = 'Foundry Data';

  const response = await api.get(`datasets/`, authHeaders());
  datasets.value = response.data;

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

code {
  white-space: nowrap;
}
</style>