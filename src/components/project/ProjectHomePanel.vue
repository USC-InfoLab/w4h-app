<script setup>
import { computed } from 'vue';

const props = defineProps({
  form: { type: Object, required: true },
  teamLabel: { type: String, default: '' },
  createdByLabel: { type: String, default: '' },
  createdAtLabel: { type: String, default: '' },
  memberRows: { type: Array, default: () => [] },
  datasets: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
  isParticipant: { type: Boolean, default: true },
});

const emit = defineEmits(['go-section']);

function isLoaded(row) {
  return Number(row?.physical_table_count ?? row?.table_count ?? 0) > 0;
}

const datasetCount = computed(() => props.datasets.length);
const loadedCount = computed(() => props.datasets.filter(isLoaded).length);
const needsIngest = computed(() => props.datasets.filter((d) => !isLoaded(d)));
const tableCount = computed(() =>
  props.datasets.reduce((n, d) => n + Number(d.table_count || 0), 0)
);
const memberCount = computed(() => props.memberRows.length);

const indicators = computed(() => [
  {
    value: String(datasetCount.value),
    label: datasetCount.value === 1 ? 'dataset' : 'datasets',
  },
  {
    value: String(loadedCount.value),
    label: 'loaded',
  },
  {
    value: String(tableCount.value),
    label: tableCount.value === 1 ? 'table' : 'tables',
  },
  {
    value: String(memberCount.value),
    label: memberCount.value === 1 ? 'person' : 'people',
  },
]);

const nextSteps = computed(() => {
  const steps = [];
  if (!datasetCount.value) {
    steps.push({
      title: 'Add a dataset',
      text: props.canManage
        ? 'Link a dataset you own or that was shared with you, or create an empty row and load tables.'
        : 'A project Admin adds datasets. You will see them here once they are linked.',
      section: 'overview',
      label: 'Open Datasets',
    });
  } else if (needsIngest.value.length) {
    steps.push({
      title: 'Load tables',
      text: props.canManage
        ? `${needsIngest.value.length === 1 ? 'One dataset still needs ingest' : `${needsIngest.value.length} datasets still need ingest`}. Open it and choose Select importer…`
        : 'Some linked datasets have no tables yet. Ask an Admin to load them.',
      section: 'overview',
      label: 'Open Datasets',
    });
  } else {
    steps.push({
      title: 'Review datasets',
      text: 'Tables are loaded. Open a dataset for coverage and import, or unlink from Settings.',
      section: 'overview',
      label: 'Open Datasets',
    });
  }

  if (props.isParticipant) {
    steps.push({
      title: 'Analytics',
      text: loadedCount.value
        ? 'Explore signals and cohort summaries on loaded tables.'
        : 'Analytics fills in after tables are loaded.',
      section: 'analytics',
      label: 'Open Analytics',
    });
    steps.push({
      title: 'Documentation',
      text: 'Project-private pages for protocol, notes, and working docs.',
      section: 'docs',
      label: 'Open Documentation',
    });
  }

  steps.push({
    title: 'People',
    text: props.canManage
      ? 'Invite members. Dataset data follows project membership, not team membership alone.'
      : 'Who is on this project.',
    section: 'people',
    label: 'Open People',
  });

  return steps;
});
</script>

<template>
  <div>
    <div class="card p-3 mb-3">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div class="min-w-0">
          <div class="small text-muted text-uppercase">Project</div>
          <h5 class="mb-1">{{ form.name || 'Untitled project' }}</h5>
          <p v-if="form.description" class="mb-2">{{ form.description }}</p>
          <p class="small text-muted mb-0">
            <span v-if="teamLabel">Team {{ teamLabel }}</span>
            <span v-if="createdByLabel">
              <template v-if="teamLabel"> · </template>
              Created by {{ createdByLabel }}
              <template v-if="createdAtLabel"> · {{ createdAtLabel }}</template>
            </span>
          </p>
        </div>
      </div>
      <div class="project-home-indicators mt-3">
        <span v-for="item in indicators" :key="item.label" class="project-home-indicator">
          <span class="project-home-indicator__value">{{ item.value }}</span>
          <span class="project-home-indicator__label">{{ item.label }}</span>
        </span>
      </div>
    </div>

    <h6 class="mb-2">What to do</h6>
    <div class="row g-2">
      <div v-for="step in nextSteps" :key="step.title" class="col-12 col-md-6 col-xl-3">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h6 class="card-title">{{ step.title }}</h6>
            <p class="card-text small text-muted flex-grow-1 mb-2">{{ step.text }}</p>
            <button
              type="button"
              class="btn btn-sm btn-primary align-self-start"
              @click="emit('go-section', step.section)"
            >
              {{ step.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <p class="small text-muted mt-3 mb-0">
      Discover datasets other teams marked Discoverable in
      <router-link :to="{ name: 'adminDatasets' }">Datasets</router-link>
      (nav). Those are metadata only until they share.
    </p>
  </div>
</template>

<style scoped>
.project-home-indicators {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 1rem;
}

.project-home-indicator {
  font-size: 0.8rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;
}

.project-home-indicator__value {
  font-weight: 600;
  color: var(--bs-body-color);
}

.project-home-indicator__label {
  margin-left: 0.2rem;
}
</style>
