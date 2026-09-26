/**
 * Static demo payload for the researcher metadata UI (overview → signal-table list → detail).
 * Shaped after w4h-sample-fitbit-csv (manifest.yaml + CSV columns). No backend API yet.
 */

/** Fitbit sample: one w4h.tables row / physical table per manifest signal slug (measurement only). */
const DEMO_SIGNAL_TABLES = [
  {
    id: 'heart_rate',
    name: 'heart_rate',
    displayName: 'Heart rate',
    sourceFile: 'data/fitbit_heart_rate.csv',
    description:
      'Intraday heart rate (wear proxy for WP2). Non-zero BPM implies the band is worn.',
    signals: ['Heart rate (bpm)'],
    primarySignal: 'Heart rate (bpm)',
    keyFields: { subject: 'id', time: 'date + timestamp' },
    provider: 'Fitbit',
    sourceUrl:
      'https://dev.fitbit.com/build/reference/web-api/intraday/get-heartrate-intraday-by-date/',
    deviceModel: null,
    grain: 'Participant-minute',
    coverage: { start: '2018-06-01', end: '2018-11-30' },
    wearEligible: true,
    wearStatus: {
      label: 'Passed',
      tone: 'success',
      compliantSubjects: 28,
      subjectsTotal: 30,
      cohortPct: 93,
      medianDailyWearPct: 72,
      medianDaysWorn: 84,
    },
    qualityStatus: { label: 'Passed', tone: 'success' },
    detail: {
      signalsInTable: [
        {
          name: 'Heart rate (bpm)',
          role: 'Primary',
          origin: 'Source-measured',
          valueField: 'value',
          unit: 'bpm',
          definition: 'Heart rate in beats per minute from intraday export.',
        },
      ],
      relationships: [],
      fields: [
        { field: 'id', role: 'Participant identifier', signal: '—', dataType: 'text', unit: '—', nullable: 'No' },
        { field: 'date', role: 'Observation time (part)', signal: 'All signals', dataType: 'date', unit: '—', nullable: 'No' },
        { field: 'timestamp', role: 'Observation time (part)', signal: 'All signals', dataType: 'text', unit: '—', nullable: 'No' },
        { field: 'value', role: 'Signal value', signal: 'Heart rate (bpm)', dataType: 'integer', unit: 'bpm', nullable: 'Yes' },
      ],
      deviceProvenance: [
        {
          signal: 'Heart rate (bpm)',
          provider: 'Fitbit',
          deviceModel: 'Unavailable',
          sensorType: 'PPG',
          relationship: 'Direct sensor output',
          firmware: 'Unavailable',
          samplingConfig: '1 min intraday',
          certainty: 'confirmed',
          documentation: 'Fitbit Web API',
        },
      ],
      quality: {
        status: { label: 'Passed', tone: 'success' },
        missingIdentifiers: 0,
        missingTimestamps: 0,
        duplicateRecords: 12,
        temporalGaps: 'Minor gaps (< 5 min) on 3 participants',
        participantCoverage: '30 of 30 enrolled',
        signalMetrics: [{ signal: 'Heart rate (bpm)', nonNull: '142,880', nullRate: '13.7%', invalid: 0 }],
        coverageStart: '2018-06-01',
        coverageEnd: '2018-11-30',
      },
      wearCompliance: {
        status: { label: 'Passed', tone: 'success' },
        compliantSubjects: 28,
        subjectsTotal: 30,
        cohortPct: 93,
        medianDailyWearPct: 72,
        medianDaysWorn: 84,
      },
    },
  },
  {
    id: 'calories',
    name: 'calories',
    displayName: 'Calories',
    sourceFile: 'data/fitbit_calories.csv',
    description:
      'Intraday calories burned. Optional mets column on rows for WP3 validation.',
    signals: ['Calories', 'METs'],
    primarySignal: 'Calories',
    keyFields: { subject: 'id', time: 'date + time' },
    provider: 'Fitbit',
    sourceUrl:
      'https://dev.fitbit.com/build/reference/web-api/intraday/get-activity-intraday-by-date/',
    deviceModel: null,
    grain: 'Participant-minute',
    coverage: { start: '2018-06-01', end: '2018-11-30' },
    wearEligible: false,
    wearStatus: null,
    qualityStatus: { label: 'Warning', tone: 'warning' },
    detail: {
      signalsInTable: [
        {
          name: 'Calories',
          role: 'Primary',
          origin: 'Source-derived',
          valueField: 'value',
          unit: 'kcal',
          definition: 'Calories burned in this interval (mapped from CSV column value).',
        },
        {
          name: 'METs',
          role: 'Additional',
          origin: 'Source-reported',
          valueField: 'mets',
          unit: 'MET',
          definition: 'Vendor MET value when present — sparse subset of rows for WP3 validation.',
        },
      ],
      relationships: [
        {
          outputSignal: 'METs',
          inputSignal: 'Activity (undisclosed)',
          derivationOwner: 'Fitbit',
          description:
            'METs appear on a subset of calories rows. Fitbit does not disclose the full derivation graph in the CSV export.',
          methodDisclosure: 'proprietary',
          algorithm: 'Unavailable',
          algorithmVersion: 'Unavailable',
          otherInputs: ['Activity signal (inferred)'],
          certainty: 'inferred',
          documentation: 'Fitbit Web API (partial)',
          limitations: 'mets is not populated on every row; exact inputs are unknown.',
        },
      ],
      fields: [
        { field: 'id', role: 'Participant identifier', signal: '—', dataType: 'text', unit: '—', nullable: 'No' },
        { field: 'date', role: 'Observation time (part)', signal: 'All signals', dataType: 'date', unit: '—', nullable: 'No' },
        { field: 'time', role: 'Observation time (part)', signal: 'All signals', dataType: 'text', unit: '—', nullable: 'No' },
        { field: 'value', role: 'Signal value', signal: 'Calories', dataType: 'double precision', unit: 'kcal', nullable: 'Yes' },
        { field: 'mets', role: 'Signal value', signal: 'METs', dataType: 'integer', unit: 'MET', nullable: 'Yes' },
      ],
      deviceProvenance: [
        {
          signal: 'Calories',
          provider: 'Fitbit',
          deviceModel: 'Unavailable',
          sensorType: 'Accelerometer',
          relationship: 'Provider-derived from sensor data',
          firmware: 'Unavailable',
          samplingConfig: '1 min intraday',
          certainty: 'partial',
          documentation: 'Fitbit Web API',
        },
      ],
      quality: {
        status: { label: 'Warning', tone: 'warning' },
        missingIdentifiers: 0,
        missingTimestamps: 4,
        duplicateRecords: 0,
        temporalGaps: 'Weekend gaps on 5 participants',
        participantCoverage: '28 of 30 enrolled',
        signalMetrics: [
          { signal: 'Calories', nonNull: '1,218,237', nullRate: '0.1%', invalid: 0 },
          { signal: 'METs', nonNull: '412,000', nullRate: '66.2%', invalid: 14 },
        ],
        coverageStart: '2018-06-01',
        coverageEnd: '2018-11-30',
      },
      wearCompliance: null,
    },
  },
  {
    id: 'weight',
    name: 'weight',
    displayName: 'Weight',
    sourceFile: 'data/fitbit_weight.csv',
    description: 'Body weight log from Fitbit Web API Get Weight Log.',
    signals: ['Weight (kg)', 'BMI', 'Body fat %'],
    primarySignal: 'Weight (kg)',
    keyFields: { subject: 'id', time: 'date + time' },
    provider: 'Fitbit',
    sourceUrl: 'https://dev.fitbit.com/build/reference/web-api/body/get-weight-log/',
    deviceModel: null,
    grain: 'Participant-event',
    coverage: { start: '2018-06-01', end: '2018-11-30' },
    wearEligible: false,
    wearStatus: null,
    qualityStatus: { label: 'Passed', tone: 'success' },
    detail: {
      signalsInTable: [
        {
          name: 'Weight (kg)',
          role: 'Primary',
          origin: 'Source-measured',
          valueField: 'weight',
          unit: 'kg',
          definition: 'Weight in kilograms.',
        },
        {
          name: 'BMI',
          role: 'Additional',
          origin: 'Source-derived',
          valueField: 'bmi',
          unit: 'kg/m²',
          definition: 'Body mass index reported with the weight log entry.',
        },
        {
          name: 'Body fat %',
          role: 'Additional',
          origin: 'Source-reported',
          valueField: 'fat_percent',
          unit: '%',
          definition: 'Body fat percentage when present in export (optional column).',
        },
      ],
      relationships: [
        {
          outputSignal: 'BMI',
          inputSignal: 'Weight (kg)',
          derivationOwner: 'Fitbit',
          description: 'BMI is computed from weight and profile height; both arrive in the same CSV row.',
          methodDisclosure: 'partial',
          algorithm: 'Unavailable',
          algorithmVersion: 'Unavailable',
          otherInputs: ['Height (profile, not in CSV)'],
          certainty: 'confirmed',
          documentation: 'Fitbit Web API',
          limitations: 'Height is not exported in this CSV.',
        },
      ],
      fields: [
        { field: 'id', role: 'Participant identifier', signal: '—', dataType: 'text', unit: '—', nullable: 'No' },
        { field: 'date', role: 'Observation time (part)', signal: 'All signals', dataType: 'date', unit: '—', nullable: 'No' },
        { field: 'time', role: 'Observation time (part)', signal: 'All signals', dataType: 'text', unit: '—', nullable: 'No' },
        { field: 'weight', role: 'Signal value', signal: 'Weight (kg)', dataType: 'double precision', unit: 'kg', nullable: 'Yes' },
        { field: 'bmi', role: 'Signal value', signal: 'BMI', dataType: 'double precision', unit: 'kg/m²', nullable: 'Yes' },
        { field: 'fat_percent', role: 'Signal value', signal: 'Body fat %', dataType: 'double precision', unit: '%', nullable: 'Yes' },
        { field: 'source', role: 'Source identifier', signal: 'All signals', dataType: 'text', unit: '—', nullable: 'Yes' },
      ],
      deviceProvenance: [
        {
          signal: 'Weight (kg)',
          provider: 'Fitbit',
          deviceModel: 'Unavailable',
          sensorType: 'Scale / body composition',
          relationship: 'Direct sensor output',
          firmware: 'Unavailable',
          samplingConfig: 'Event-based (weigh-in)',
          certainty: 'partial',
          documentation: 'Fitbit Web API',
        },
      ],
      quality: {
        status: { label: 'Passed', tone: 'success' },
        missingIdentifiers: 0,
        missingTimestamps: 0,
        duplicateRecords: 0,
        temporalGaps: 'Sparse event log — expected for weight',
        participantCoverage: '30 of 30 enrolled',
        signalMetrics: [
          { signal: 'Weight (kg)', nonNull: '70', nullRate: '0%', invalid: 0 },
          { signal: 'BMI', nonNull: '70', nullRate: '0%', invalid: 0 },
          { signal: 'Body fat %', nonNull: '42', nullRate: '40%', invalid: 0 },
        ],
        coverageStart: '2018-06-01',
        coverageEnd: '2018-11-30',
      },
      wearCompliance: null,
    },
  },
];

/**
 * @param {{ name?: string, description?: string, id?: string }} [datasetRow]
 */
export function buildDemoDatasetMetadata(datasetRow = {}) {
  const signalTables = DEMO_SIGNAL_TABLES;
  const wearEligible = signalTables.filter((t) => t.wearEligible);
  const wearPassed = wearEligible.filter((t) => t.wearStatus?.tone === 'success');
  const signalCount = signalTables.reduce((n, t) => n + t.signals.length, 0);

  return {
    demo: true,
    overview: {
      name: datasetRow.name || 'Fitbit CSV sample package',
      description:
        datasetRow.description ||
        'Synthetic Fitbit-style CSV exports for W4H demos and importer tests (subjects, weight, heart_rate, calories).',
      packageVersion: '1.1.0',
      status: 'active',
      packageVendor: 'fitbit',
      packageFormat: 'csv',
      owner: 'Demo team',
      contact: 'researcher@example.edu',
      accessClassification: 'Team members with project access',
      observationPeriod: 'Jun 2018 – Nov 2018',
      participantCount: 30,
      providerCount: 1,
      signalTableCount: signalTables.length,
      signalCount,
      overallQualityStatus: { label: 'Warning', tone: 'warning' },
    },
    quality: {
      wearCompliantTables: wearEligible.length ? `${wearPassed.length} of ${wearEligible.length}` : '—',
      wearEligibleTables: wearEligible.length,
      protocolReference: 'Daily band wear ≥ 60% · 08:00–20:00 window',
      overallWearStatus: wearEligible.length
        ? { label: wearPassed.length === wearEligible.length ? 'Passed' : 'Warning', tone: wearPassed.length === wearEligible.length ? 'success' : 'warning' }
        : { label: 'Unavailable', tone: 'secondary' },
    },
    researchContext: {
      studyProtocol: 'W4H Fitbit wear compliance demo',
      studyPhase: 'Pilot',
      cohortArm: 'All enrolled participants',
      plannedCollectionPeriod: 'Jun 2018 – Nov 2018',
      expectedSignals: 'Heart rate, calories (+ METs), weight (+ BMI, body fat %)',
      expectedFrequency: 'Minute-level intraday (HR, calories); event-based weight log',
      deviceAssignment: 'Fitbit band + scale (unspecified models in export)',
      wearSchedule: '08:00 – 20:00 daily window',
      complianceThreshold: '60% daily band wear (HR wear proxy)',
    },
    signalTables,
  };
}

export function findDemoSignalTable(metadata, tableId) {
  return metadata?.signalTables?.find((t) => t.id === tableId) || null;
}
