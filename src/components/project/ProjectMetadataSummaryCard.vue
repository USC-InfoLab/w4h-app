<script setup>
import { computed } from 'vue';
import MetadataFieldLabel from '@/components/project/MetadataFieldLabel.vue';
import MetadataTile from '@/components/project/MetadataTile.vue';
import { formatApproxNumber, formatMonthYear } from '@/utils/datasetFormat.js';
import { CATEGORY_INTROS, METADATA_SUMMARY_INTRO } from '@/utils/metadataFieldHelp.js';

const props = defineProps({
  metadata: { type: Object, default: null },
  /** When false, hide the title and intro (e.g. embedded in a parent that supplies its own). */
  showHeader: { type: Boolean, default: true },
});

const scope = computed(() => props.metadata?.scope || {});
const subjects = computed(() => {
  const s = props.metadata?.subjects || {};
  const legacy = props.metadata?.compliance || {};
  return {
    enrolled_participants: s.enrolled_participants ?? legacy.enrolled_participants ?? null,
    participant_age: s.participant_age ?? legacy.participant_age ?? null,
  };
});
const device = computed(() => props.metadata?.device || {});
const cadence = computed(() => props.metadata?.cadence || props.metadata?.temporal || {});
const provenance = computed(() => props.metadata?.provenance || {});
const compliance = computed(() => props.metadata?.compliance || {});
const semantic = computed(() => props.metadata?.semantic || {});

const cadenceSignals = computed(() => cadence.value.signals || []);
const semanticSignals = computed(() => semantic.value.signals || []);
const wearCohort = computed(() => compliance.value.wear_cohort || null);
const sources = computed(() => provenance.value.sources || []);

const tableCountLabel = computed(() => {
  const n = scope.value.table_count;
  if (n == null) return null;
  return `${n} ${Number(n) === 1 ? 'table' : 'tables'}`;
});

const studyLength = computed(() => {
  const days = scope.value.study_length_days;
  return days == null ? null : `${days} days`;
});

const observationsLabel = computed(() => {
  if (scope.value.observations == null) return null;
  return formatApproxNumber(
    scope.value.observations,
    scope.value.observations_approx !== false
  );
});

const wearSubjectsLabel = computed(() => {
  const cohort = wearCohort.value;
  if (!cohort || cohort.subjects_total == null) return null;
  return `${cohort.subjects_compliant} of ${cohort.subjects_total}`;
});

const wearRateLabel = computed(() => {
  const pct = wearCohort.value?.compliance_pct;
  return pct == null ? null : `${pct}%`;
});

const medianDailyWearLabel = computed(() => {
  const pct = wearCohort.value?.median_daily_wear_pct;
  return pct == null ? null : `${pct}%`;
});

const medianDaysWornLabel = computed(() => {
  const days = wearCohort.value?.median_days_worn;
  if (days == null) return null;
  return `${days} ${Number(days) === 1 ? 'day' : 'days'}`;
});

function formatObservedCadence(observed) {
  if (!observed || observed.mode_minutes == null) return null;
  const pct = observed.mode_pct != null ? ` (${observed.mode_pct}% of gaps)` : '';
  const approx = observed.approx ? ' · approx' : '';
  return `${observed.mode_minutes} min${pct}${approx}`;
}

function formatLargestGap(observed) {
  if (!observed || observed.max_gap_minutes == null) return null;
  return `${observed.max_gap_minutes} min`;
}

function variableLabel(variable) {
  return variable.name || variable.source || 'Variable';
}

</script>

<template>
  <div v-if="metadata" class="metadata-summary">
    <template v-if="showHeader">
      <div class="small fw-semibold mb-2">Metadata summary</div>
      <p class="small text-muted mb-3">{{ METADATA_SUMMARY_INTRO }}</p>
    </template>

    <!-- Scope -->
    <section class="mb-4">
      <div class="small text-uppercase text-muted">Scope</div>
      <p class="small text-muted mb-2">{{ CATEGORY_INTROS.scope }}</p>
      <div class="row g-2">
        <div class="col-6 col-md-4 col-lg-2">
          <MetadataTile field-key="scope.table_count" :value="tableCountLabel" />
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <MetadataTile field-key="scope.observations" :value="observationsLabel" />
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <MetadataTile
            field-key="scope.collection_start"
            :value="formatMonthYear(scope.date_start)"
          />
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <MetadataTile
            field-key="scope.collection_end"
            :value="formatMonthYear(scope.date_end)"
          />
        </div>
        <div class="col-6 col-md-4 col-lg-2">
          <MetadataTile field-key="scope.study_length" :value="studyLength" />
        </div>
      </div>
    </section>

    <!-- Subjects -->
    <section class="mb-4">
      <div class="small text-uppercase text-muted">Subjects</div>
      <p class="small text-muted mb-2">{{ CATEGORY_INTROS.subjects }}</p>
      <div class="row g-2">
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile
            field-key="subjects.enrolled_participants"
            :value="subjects.enrolled_participants"
          />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile
            field-key="subjects.participant_age"
            :value="subjects.participant_age"
            always-note
          />
        </div>
      </div>
    </section>

    <!-- Device -->
    <section class="mb-4">
      <div class="small text-uppercase text-muted">Device</div>
      <p class="small text-muted mb-2">{{ CATEGORY_INTROS.device }}</p>
      <div class="row g-2">
        <div class="col-6 col-md-4">
          <MetadataTile field-key="device.vendor" :value="device.vendor" />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile
            field-key="device.signal_types"
            :value="device.signal_types"
            small
          />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile field-key="device.model" :value="device.model" always-note />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile
            field-key="device.sensor_specifications"
            :value="device.sensor_specifications"
            always-note
          />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile field-key="device.firmware_os" :value="device.firmware_os" always-note />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile
            field-key="device.anatomical_placement"
            :value="device.anatomical_placement"
            always-note
          />
        </div>
      </div>
    </section>

    <!-- Cadence -->
    <section class="mb-4">
      <div class="small text-uppercase text-muted">Cadence</div>
      <p class="small text-muted mb-2">{{ CATEGORY_INTROS.cadence }}</p>
      <template v-if="cadenceSignals.length">
        <div v-for="row in cadenceSignals" :key="row.signal" class="metadata-signal-group mb-3">
          <div class="metadata-group-title">{{ row.signal }}</div>
          <div class="row g-2">
            <div class="col-6 col-md-4 col-lg-3">
              <MetadataTile
                field-key="cadence.native_sensor_rate"
                :value="row.native_sensor_rate"
              />
            </div>
            <div class="col-6 col-md-4 col-lg-3">
              <MetadataTile
                field-key="cadence.declared_interval"
                :value="row.declared_interval"
              />
            </div>
            <div class="col-6 col-md-4 col-lg-3">
              <MetadataTile
                field-key="cadence.observed_cadence"
                :value="formatObservedCadence(row.observed_cadence)"
                small
                expanded
              />
            </div>
            <div class="col-6 col-md-4 col-lg-3">
              <MetadataTile
                field-key="cadence.largest_gap"
                :value="formatLargestGap(row.observed_cadence)"
              />
            </div>
            <div class="col-6 col-md-4 col-lg-3">
              <MetadataTile field-key="cadence.timezone" :value="row.timezone" always-note />
            </div>
          </div>
        </div>
        <p class="small text-muted mb-0">
          Large gaps often indicate non-wear, charging, or sync delay—not normal cadence.
        </p>
      </template>
      <p v-else class="small text-muted mb-0">No signal tables registered yet.</p>
    </section>

    <!-- Provenance -->
    <section class="mb-4">
      <div class="small text-uppercase text-muted">Provenance</div>
      <p class="small text-muted mb-2">{{ CATEGORY_INTROS.provenance }}</p>
      <div class="row g-2 mb-3">
        <div class="col-6 col-md-4">
          <MetadataTile field-key="provenance.origin" :value="provenance.origin" small />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile
            field-key="provenance.ingestion_source"
            :value="provenance.ingestion_source"
            always-note
          />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile
            field-key="provenance.package_vendor"
            :value="provenance.package_vendor"
            always-note
          />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile
            field-key="provenance.package_format"
            :value="provenance.package_format"
            always-note
          />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile
            field-key="provenance.package_version"
            :value="provenance.package_version"
            always-note
          />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile
            field-key="provenance.api_payload_scheme"
            :value="provenance.api_payload_scheme"
            always-note
          />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile
            field-key="provenance.api_payload_version"
            :value="provenance.api_payload_version"
            always-note
          />
        </div>
        <div class="col-6 col-md-4">
          <MetadataTile
            field-key="provenance.data_state"
            :value="provenance.data_state"
            always-note
          />
        </div>
      </div>

      <div v-if="sources.length" class="metadata-group">
        <div class="metadata-group-title">
          <MetadataFieldLabel field-key="provenance.vendor_api_url" />
        </div>
        <div class="row g-2">
          <div v-for="src in sources" :key="src.signal" class="col-12 col-md-6">
            <MetadataTile
              field-key="provenance.vendor_api_url"
              :label="src.signal"
              :value="src.source_name || src.source_url"
              small
            >
              <div>{{ src.source_name || 'Unavailable' }}</div>
              <a
                v-if="src.source_url"
                :href="src.source_url"
                class="small fw-normal text-break"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ src.source_url }}
              </a>
            </MetadataTile>
          </div>
        </div>
      </div>
    </section>

    <!-- Wear Compliance -->
    <section class="mb-4">
      <div class="small text-uppercase text-muted">Wear Compliance</div>
      <p class="small text-muted mb-2">{{ CATEGORY_INTROS.compliance }}</p>
      <div class="metadata-group">
        <div class="row g-2">
          <div class="col-6 col-lg-3">
            <MetadataTile field-key="compliance.wear_subjects" :value="wearSubjectsLabel" />
          </div>
          <div class="col-6 col-lg-3">
            <MetadataTile field-key="compliance.wear_rate" :value="wearRateLabel" />
          </div>
          <div class="col-6 col-lg-3">
            <MetadataTile field-key="compliance.median_daily_wear" :value="medianDailyWearLabel" />
          </div>
          <div class="col-6 col-lg-3">
            <MetadataTile field-key="compliance.median_days_worn" :value="medianDaysWornLabel" />
          </div>
        </div>
        <p v-if="!wearCohort" class="small text-muted mb-0 mt-2">
          No cached per-subject wear results yet. Run
          <code>w4h-fitbit-wear-compliance</code>
          contribution on the Analytics tab.
        </p>
      </div>
    </section>

    <!-- Semantic -->
    <section class="mb-0">
      <div class="small text-uppercase text-muted">Semantic</div>
      <p class="small text-muted mb-2">{{ CATEGORY_INTROS.semantic }}</p>
      <template v-if="semanticSignals.length">
        <div v-for="signal in semanticSignals" :key="signal.signal" class="metadata-signal-group mb-3">
          <div class="metadata-signal-heading mb-2">
            <strong>{{ signal.signal }}</strong>
            <p v-if="signal.description" class="metadata-signal-desc mb-0">
              {{ signal.description }}
            </p>
          </div>
          <div v-if="signal.variables?.length" class="row g-2">
            <div
              v-for="(variable, idx) in signal.variables"
              :key="`${signal.signal}-${idx}-${variableLabel(variable)}`"
              class="col-12"
            >
              <div class="metadata-variable-tile">
                <div class="metadata-variable-name">{{ variableLabel(variable) }}</div>
                <dl class="metadata-variable-list mb-0">
                  <dt><MetadataFieldLabel field-key="semantic.unit" /></dt>
                  <dd :class="{ 'text-muted': !variable.unit }">
                    {{ variable.unit || 'Unavailable' }}
                  </dd>
                  <dt><MetadataFieldLabel field-key="semantic.type" /></dt>
                  <dd :class="{ 'text-muted': !variable.type }">
                    {{ variable.type || 'Unavailable' }}
                  </dd>
                  <dt><MetadataFieldLabel field-key="semantic.description" /></dt>
                  <dd :class="{ 'text-muted': !variable.description }">
                    {{ variable.description || 'Unavailable' }}
                  </dd>
                  <dt>
                    <MetadataFieldLabel field-key="semantic.ontology" :unavailable="true" />
                  </dt>
                  <dd :class="{ 'text-muted': !variable.ontology_code }">
                    {{ variable.ontology_code || 'Unavailable' }}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <p v-else class="small text-muted mb-0">No mapped variables for this signal.</p>
        </div>
      </template>
      <p v-else class="small text-muted mb-0">No mapped variables registered yet.</p>
    </section>
  </div>
</template>

<style scoped>
.metadata-group,
.metadata-signal-group {
  border-left: 2px solid var(--bs-border-color);
  padding-left: 0.75rem;
}

.metadata-signal-group {
  padding-top: 0.15rem;
  padding-bottom: 0.15rem;
}

.metadata-group-title {
  font-size: 0.8rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.metadata-signal-heading {
  font-size: 0.875rem;
  line-height: 1.35;
}

.metadata-signal-heading strong {
  font-weight: 600;
}

.metadata-signal-desc {
  margin-top: 0.25rem;
  font-weight: 400;
  font-size: 0.8125rem;
  color: var(--bs-secondary-color);
  white-space: pre-wrap;
  word-break: break-word;
}

.metadata-variable-tile {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  padding: 0.65rem 0.75rem;
  height: 100%;
}

.metadata-variable-name {
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.2;
  word-break: break-word;
}

.metadata-variable-list {
  display: grid;
  grid-template-columns: auto 1fr;
  column-gap: 0.5rem;
  row-gap: 0.15rem;
  font-size: 0.8rem;
}

.metadata-variable-list dt {
  font-weight: 500;
  color: var(--bs-secondary-color);
}

.metadata-variable-list dd {
  margin: 0;
  word-break: break-word;
  white-space: pre-wrap;
}
</style>
