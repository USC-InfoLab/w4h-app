<script setup>
import MetadataTile from '@/components/project/MetadataTile.vue';

defineProps({
  overview: { type: Object, required: true },
  quality: { type: Object, required: true },
  researchContext: { type: Object, required: true },
});

function statusBadgeClass(tone) {
  if (tone === 'success') return 'text-bg-success';
  if (tone === 'warning') return 'text-bg-warning';
  if (tone === 'danger') return 'text-bg-danger';
  return 'text-bg-secondary';
}
</script>

<template>
  <div class="dataset-metadata-overview">
    <section class="metadata-section mb-4">
      <h6 class="metadata-section-title">Dataset overview</h6>
      <div class="row g-2">
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="scope.package_version" label="Version" :value="overview.packageVersion" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="provenance.package_vendor" label="Package vendor" :value="overview.packageVendor" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="provenance.package_format" label="Package format" :value="overview.packageFormat" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="scope.status" label="Status" :value="overview.status" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="provenance.owner" label="Owner" :value="overview.owner" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="provenance.contact" label="Contact" :value="overview.contact" small />
        </div>
        <div class="col-12 col-md-6 col-lg-4">
          <MetadataTile field-key="compliance.access" label="Access & privacy" :value="overview.accessClassification" small />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="scope.collection_start" label="Observation period" :value="overview.observationPeriod" small />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="subjects.enrolled_participants" label="Participants" :value="overview.participantCount" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="device.vendor" label="Providers" :value="overview.providerCount" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="scope.table_count" label="Signal tables" :value="overview.signalTableCount" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="semantic.signals" label="Signals" :value="overview.signalCount" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <div class="metadata-tile metadata-tile--status">
            <div class="metadata-tile-value metadata-tile-value--sm">
              <span class="badge" :class="statusBadgeClass(overview.overallQualityStatus?.tone)">
                {{ overview.overallQualityStatus?.label }}
              </span>
            </div>
            <span class="metadata-tile-label">Overall quality</span>
          </div>
        </div>
      </div>
    </section>

    <section class="metadata-section mb-4">
      <h6 class="metadata-section-title">Dataset quality</h6>
      <div class="row g-2">
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="compliance.wear_cohort" label="Wear-compliant tables" :value="quality.wearCompliantTables" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="compliance.wear_eligible" label="Wear-eligible tables" :value="quality.wearEligibleTables" />
        </div>
        <div class="col-12 col-md-6">
          <MetadataTile field-key="compliance.protocol" label="Protocol reference" :value="quality.protocolReference" small />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <div class="metadata-tile metadata-tile--status">
            <div class="metadata-tile-value metadata-tile-value--sm">
              <span class="badge" :class="statusBadgeClass(quality.overallWearStatus?.tone)">
                {{ quality.overallWearStatus?.label }}
              </span>
            </div>
            <span class="metadata-tile-label">Overall wear status</span>
          </div>
        </div>
      </div>
    </section>

    <section class="metadata-section mb-4">
      <h6 class="metadata-section-title">Research context</h6>
      <div class="row g-2">
        <div class="col-12 col-md-6">
          <MetadataTile field-key="compliance.irb_reference" label="Study & protocol" :value="researchContext.studyProtocol" small />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="scope.study_phase" label="Study phase" :value="researchContext.studyPhase" />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="scope.cohort" label="Cohort / arm" :value="researchContext.cohortArm" small />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="scope.collection_start" label="Planned collection" :value="researchContext.plannedCollectionPeriod" small />
        </div>
        <div class="col-12 col-md-6">
          <MetadataTile field-key="semantic.signals" label="Expected signals" :value="researchContext.expectedSignals" small />
        </div>
        <div class="col-12 col-md-6">
          <MetadataTile field-key="cadence.signals" label="Expected frequency" :value="researchContext.expectedFrequency" small />
        </div>
        <div class="col-12 col-md-6">
          <MetadataTile field-key="device.model" label="Device assignment" :value="researchContext.deviceAssignment" small />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="compliance.wear_schedule" label="Wear schedule" :value="researchContext.wearSchedule" small />
        </div>
        <div class="col-6 col-md-4 col-lg-3">
          <MetadataTile field-key="compliance.threshold" label="Compliance threshold" :value="researchContext.complianceThreshold" />
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
  word-break: break-word;
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
