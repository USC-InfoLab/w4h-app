<script setup>
import MetadataTile from '@/components/project/MetadataTile.vue';

defineProps({
  table: { type: Object, required: true },
});

defineEmits(['back']);

function statusBadgeClass(tone) {
  if (tone === 'success') return 'text-bg-success';
  if (tone === 'warning') return 'text-bg-warning';
  if (tone === 'danger') return 'text-bg-danger';
  return 'text-bg-secondary';
}

function certaintyClass(certainty) {
  if (certainty === 'confirmed') return 'text-success';
  if (certainty === 'inferred') return 'text-warning-emphasis';
  return 'text-muted';
}
</script>

<template>
  <div class="signal-table-detail">
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div>
        <button type="button" class="btn btn-link btn-sm px-0 mb-1 text-decoration-none" @click="$emit('back')">
          <i class="bi bi-arrow-left" aria-hidden="true"></i> All signal tables
        </button>
        <h5 class="mb-1">{{ table.displayName || table.name }}</h5>
        <p v-if="table.sourceFile" class="small text-muted mb-1">
          Source CSV: <code>{{ table.sourceFile }}</code>
          · {{ table.signals.length }} signal{{ table.signals.length === 1 ? '' : 's' }} in this table
        </p>
        <p class="small text-muted mb-0">{{ table.description }}</p>
      </div>
      <div class="d-flex flex-wrap gap-2">
        <span class="badge text-bg-light border">{{ table.grain }}</span>
        <span class="badge" :class="statusBadgeClass(table.qualityStatus?.tone)">
          Quality: {{ table.qualityStatus?.label }}
        </span>
        <span
          v-if="table.wearEligible && table.wearStatus"
          class="badge"
          :class="statusBadgeClass(table.wearStatus.tone)"
        >
          Wear: {{ table.wearStatus.label }}
        </span>
      </div>
    </div>

    <!-- §2 Signals in table -->
    <section class="metadata-section mb-4">
      <h6 class="metadata-section-title">Signals in this table</h6>
      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead class="small text-muted">
            <tr>
              <th>Signal</th>
              <th>Role</th>
              <th>Origin</th>
              <th>Value field</th>
              <th>Unit</th>
              <th>Definition</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(sig, idx) in table.detail.signalsInTable" :key="idx">
              <td class="fw-semibold">{{ sig.name }}</td>
              <td>{{ sig.role }}</td>
              <td>{{ sig.origin }}</td>
              <td><code>{{ sig.valueField }}</code></td>
              <td>{{ sig.unit }}</td>
              <td class="small text-muted">{{ sig.definition }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- §3 Source-provided relationships -->
    <section class="metadata-section mb-4">
      <h6 class="metadata-section-title">Source-provided relationships</h6>
      <div v-if="!table.detail.relationships?.length" class="small text-muted">
        No declared derivations for this table.
      </div>
      <div v-for="(rel, idx) in table.detail.relationships" :key="idx" class="border rounded p-3 mb-2 small">
        <div class="fw-semibold mb-1">{{ rel.outputSignal }} ← {{ rel.inputSignal }}</div>
        <p class="mb-2">{{ rel.description }}</p>
        <div class="row g-2">
          <div class="col-md-4"><span class="text-muted">Owner:</span> {{ rel.derivationOwner }}</div>
          <div class="col-md-4"><span class="text-muted">Method:</span> {{ rel.methodDisclosure }}</div>
          <div class="col-md-4">
            <span class="text-muted">Certainty:</span>
            <span :class="certaintyClass(rel.certainty)">{{ rel.certainty }}</span>
          </div>
          <div v-if="rel.limitations" class="col-12 text-muted">{{ rel.limitations }}</div>
        </div>
      </div>
    </section>

    <!-- §4 Fields -->
    <section class="metadata-section mb-4">
      <h6 class="metadata-section-title">Fields</h6>
      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead class="small text-muted">
            <tr>
              <th>Field</th>
              <th>Role</th>
              <th>Associated signal</th>
              <th>Data type</th>
              <th>Unit</th>
              <th>Nullable</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in table.detail.fields" :key="idx">
              <td><code>{{ row.field }}</code></td>
              <td>{{ row.role }}</td>
              <td>{{ row.signal }}</td>
              <td>{{ row.dataType }}</td>
              <td>{{ row.unit }}</td>
              <td>{{ row.nullable }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- §5 Device and sensor provenance -->
    <section class="metadata-section mb-4">
      <h6 class="metadata-section-title">Device and sensor provenance</h6>
      <div v-if="!table.detail.deviceProvenance?.length" class="small text-muted">
        Device and sensor details were not declared in the manifest for this table.
      </div>
      <div v-for="(dev, idx) in table.detail.deviceProvenance" :key="idx" class="border rounded p-3 mb-2">
        <div class="fw-semibold mb-2">{{ dev.signal }}</div>
        <div class="row g-2 small">
          <div class="col-md-4"><MetadataTile field-key="device.vendor" label="Provider" :value="dev.provider" /></div>
          <div class="col-md-4"><MetadataTile field-key="device.model" label="Device model" :value="dev.deviceModel" /></div>
          <div class="col-md-4"><MetadataTile field-key="device.sensor" label="Sensor type" :value="dev.sensorType" /></div>
          <div class="col-md-4"><MetadataTile field-key="device.relationship" label="Relationship" :value="dev.relationship" small /></div>
          <div class="col-md-4"><MetadataTile field-key="device.firmware" label="Firmware" :value="dev.firmware" /></div>
          <div class="col-md-4"><MetadataTile field-key="cadence.signals" label="Sampling" :value="dev.samplingConfig" small /></div>
          <div class="col-md-4">
            <div class="metadata-tile">
              <div class="metadata-tile-value metadata-tile-value--sm" :class="certaintyClass(dev.certainty)">
                {{ dev.certainty }}
              </div>
              <span class="metadata-tile-label">Provenance certainty</span>
            </div>
          </div>
          <div class="col-md-8"><MetadataTile field-key="provenance.sources" label="Documentation" :value="dev.documentation" small /></div>
        </div>
      </div>
    </section>

    <!-- §6 Quality -->
    <section class="metadata-section mb-4">
      <h6 class="metadata-section-title">Quality (observed)</h6>
      <div class="row g-2 mb-3">
        <div class="col-6 col-md-3">
          <div class="metadata-tile">
            <div class="metadata-tile-value metadata-tile-value--sm">
              <span class="badge" :class="statusBadgeClass(table.detail.quality.status?.tone)">
                {{ table.detail.quality.status?.label }}
              </span>
            </div>
            <span class="metadata-tile-label">Quality status</span>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <MetadataTile field-key="scope.collection_start" label="Coverage start" :value="table.detail.quality.coverageStart" />
        </div>
        <div class="col-6 col-md-3">
          <MetadataTile field-key="scope.collection_end" label="Coverage end" :value="table.detail.quality.coverageEnd" />
        </div>
        <div class="col-6 col-md-3">
          <MetadataTile field-key="scope.participant_coverage" label="Participant coverage" :value="table.detail.quality.participantCoverage" small />
        </div>
        <div class="col-6 col-md-3">
          <MetadataTile field-key="quality.missing_ids" label="Missing identifiers" :value="table.detail.quality.missingIdentifiers" />
        </div>
        <div class="col-6 col-md-3">
          <MetadataTile field-key="quality.missing_time" label="Missing timestamps" :value="table.detail.quality.missingTimestamps" />
        </div>
        <div class="col-6 col-md-3">
          <MetadataTile field-key="quality.duplicates" label="Duplicate records" :value="table.detail.quality.duplicateRecords" />
        </div>
        <div class="col-12 col-md-6">
          <MetadataTile field-key="quality.gaps" label="Temporal gaps" :value="table.detail.quality.temporalGaps" small />
        </div>
      </div>
      <div class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead class="small text-muted">
            <tr>
              <th>Signal</th>
              <th>Non-null count</th>
              <th>Null rate</th>
              <th>Invalid values</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(m, idx) in table.detail.quality.signalMetrics" :key="idx">
              <td>{{ m.signal }}</td>
              <td>{{ m.nonNull }}</td>
              <td>{{ m.nullRate }}</td>
              <td>{{ m.invalid }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- §7 Wear compliance -->
    <section v-if="table.wearEligible" class="metadata-section mb-2">
      <h6 class="metadata-section-title">Wear compliance</h6>
      <div v-if="!table.detail.wearCompliance" class="small text-muted">Wear metrics unavailable for this table.</div>
      <div v-else class="row g-2">
        <div class="col-6 col-md-3">
          <div class="metadata-tile">
            <div class="metadata-tile-value metadata-tile-value--sm">
              <span class="badge" :class="statusBadgeClass(table.detail.wearCompliance.status?.tone)">
                {{ table.detail.wearCompliance.status?.label }}
              </span>
            </div>
            <span class="metadata-tile-label">Wear status</span>
          </div>
        </div>
        <div class="col-6 col-md-3">
          <MetadataTile
            field-key="compliance.wear_subjects"
            label="Compliant subjects"
            :value="`${table.detail.wearCompliance.compliantSubjects} of ${table.detail.wearCompliance.subjectsTotal}`"
          />
        </div>
        <div class="col-6 col-md-3">
          <MetadataTile field-key="compliance.wear_rate" label="Cohort compliance" :value="`${table.detail.wearCompliance.cohortPct}%`" />
        </div>
        <div class="col-6 col-md-3">
          <MetadataTile field-key="compliance.median_daily_wear" label="Median daily wear" :value="`${table.detail.wearCompliance.medianDailyWearPct}%`" />
        </div>
        <div class="col-6 col-md-3">
          <MetadataTile field-key="compliance.median_days_worn" label="Median days worn" :value="table.detail.wearCompliance.medianDaysWorn" />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.metadata-section-title {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--bs-secondary-color);
  margin-bottom: 0.75rem;
}

.metadata-tile {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  padding: 0.65rem 0.75rem;
  height: 100%;
}

.metadata-tile-value {
  font-weight: 700;
  font-size: 1.1rem;
  line-height: 1.2;
}

.metadata-tile-value--sm {
  font-size: 0.9rem;
  font-weight: 600;
}

.metadata-tile-label {
  display: block;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
  margin-top: 0.15rem;
}
</style>
