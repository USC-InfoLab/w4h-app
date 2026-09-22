<script setup>
defineProps({
  signalTables: { type: Array, default: () => [] },
  selectedTableId: { type: String, default: '' },
});

defineEmits(['select']);

function statusBadgeClass(tone) {
  if (tone === 'success') return 'text-bg-success';
  if (tone === 'warning') return 'text-bg-warning';
  if (tone === 'danger') return 'text-bg-danger';
  return 'text-bg-secondary';
}

function wearSummary(table) {
  if (!table.wearEligible || !table.wearStatus) return '—';
  const w = table.wearStatus;
  return `${w.compliantSubjects}/${w.subjectsTotal} · ${w.label}`;
}

function coverageLabel(table) {
  if (!table.coverage?.start || !table.coverage?.end) return 'Unavailable';
  return `${table.coverage.start} – ${table.coverage.end}`;
}
</script>

<template>
  <section class="signal-table-list">
    <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
      <h6 class="metadata-section-title mb-0">Signal tables</h6>
      <span class="small text-muted">{{ signalTables.length }} tables</span>
    </div>
    <p class="small text-muted mb-3">
      Measurement tables only. Enrollment (<code>subjects</code>) is used for participant count and wear windows but is not listed here.
    </p>

    <div class="table-responsive">
      <table class="table table-sm table-hover align-middle signal-table-list-table mb-0">
        <thead>
          <tr class="small text-muted">
            <th scope="col">Table</th>
            <th scope="col">Signals</th>
            <th scope="col">Key fields</th>
            <th scope="col">Provider</th>
            <th scope="col">Grain</th>
            <th scope="col">Coverage</th>
            <th scope="col">Wear</th>
            <th scope="col">Quality</th>
            <th scope="col" class="text-end" aria-label="Open"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="table in signalTables"
            :key="table.id"
            class="signal-table-row"
            :class="{ 'signal-table-row--selected': table.id === selectedTableId }"
            role="button"
            tabindex="0"
            @click="$emit('select', table.id)"
            @keyup.enter="$emit('select', table.id)"
          >
            <td>
              <div class="fw-semibold">{{ table.displayName || table.name }}</div>
              <div v-if="table.sourceFile" class="small text-muted">
                <code>{{ table.sourceFile }}</code>
              </div>
              <div class="small text-muted text-truncate signal-table-desc">{{ table.description }}</div>
            </td>
            <td>
              <div class="d-flex flex-wrap gap-1 mb-1">
                <span
                  v-for="sig in table.signals"
                  :key="sig"
                  class="badge rounded-pill"
                  :class="sig === table.primarySignal ? 'text-bg-primary' : 'text-bg-light border'"
                >
                  {{ sig }}
                </span>
              </div>
              <div class="small text-muted">{{ table.signals.length }} signal{{ table.signals.length === 1 ? '' : 's' }} in one table</div>
            </td>
            <td class="small">
              <div><code>{{ table.keyFields.subject }}</code> · subject</div>
              <div><code>{{ table.keyFields.time }}</code> · time</div>
            </td>
            <td class="small">
              <div>{{ table.provider }}</div>
              <a
                v-if="table.sourceUrl"
                :href="table.sourceUrl"
                class="text-decoration-none"
                target="_blank"
                rel="noopener noreferrer"
                @click.stop
              >
                API doc
              </a>
            </td>
            <td class="small">{{ table.grain }}</td>
            <td class="small">{{ coverageLabel(table) }}</td>
            <td class="small">
              <template v-if="table.wearEligible && table.wearStatus">
                <span class="badge me-1" :class="statusBadgeClass(table.wearStatus.tone)">
                  {{ table.wearStatus.label }}
                </span>
                <span class="text-muted">{{ wearSummary(table) }}</span>
              </template>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="small">
              <span class="badge" :class="statusBadgeClass(table.qualityStatus?.tone)">
                {{ table.qualityStatus?.label }}
              </span>
            </td>
            <td class="text-end text-muted">
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<style scoped>
.metadata-section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--bs-secondary-color);
}

.signal-table-list-table {
  --bs-table-hover-bg: rgba(13, 110, 253, 0.04);
}

.signal-table-row {
  cursor: pointer;
}

.signal-table-row--selected {
  --bs-table-bg: rgba(13, 110, 253, 0.06);
}

.signal-table-desc {
  max-width: 14rem;
}
</style>
