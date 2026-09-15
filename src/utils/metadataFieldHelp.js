/**
 * Researcher-facing labels and definitions for Metadata Summary fields.
 * Keys match metadata_summary paths / UI field ids.
 */

export const METADATA_SUMMARY_INTRO =
  'Catalog and signal registry metadata from import. Fields not populated from the import show as Unavailable. Info icons explain each field.';

export const CATEGORY_INTROS = {
  scope: 'How much data is in this dataset and over what calendar span?',
  subjects: 'Who is enrolled in this study and what cohort demographics are known?',
  device: 'What hardware and signals produced this data?',
  cadence: 'At what interval was each signal captured or reported?',
  provenance: 'How did this dataset enter W4H?',
  compliance: 'How well did participants follow the protocol for wearing the device?',
  semantic: 'What do the variables mean (units, ontology)?',
};

export const UNAVAILABLE_NOTE =
  'Not provided by the importer or not computed yet.';

/** @type {Record<string, { label: string, definition: string }>} */
export const METADATA_FIELD_HELP = {
  'scope.table_count': {
    label: 'Registered tables',
    definition:
      'Number of signal registry tables linked to this dataset (includes enrollment and measurement tables).',
  },
  'scope.observations': {
    label: 'Observations',
    definition:
      'Estimated row count across physical signal tables (from cached summary; may be approximate at scale).',
  },
  'scope.collection_start': {
    label: 'Collection start',
    definition:
      'Calendar start of data in this catalog dataset, shown as month and year (not day-level).',
  },
  'scope.collection_end': {
    label: 'Collection end',
    definition:
      'Calendar end of data in this catalog dataset, shown as month and year (not day-level).',
  },
  'scope.study_length': {
    label: 'Study length',
    definition:
      'Number of days from collection start to end (inclusive), computed from full catalog dates.',
  },

  'device.vendor': {
    label: 'Vendor',
    definition: 'Manufacturer or data provider for this dataset (e.g. Fitbit).',
  },
  'device.signal_types': {
    label: 'Signal types',
    definition:
      'Kinds of physiological or behavioral measures in the export (heart rate, steps, weight, etc.).',
  },
  'device.model': {
    label: 'Model',
    definition:
      'Specific hardware model (e.g. Charge 6). Needed to interpret sensor limits and firmware behavior.',
  },
  'device.sensor_specifications': {
    label: 'Sensor specifications',
    definition: 'Physical sensors used (e.g. PPG optical HR, tri-axial accelerometer).',
  },
  'device.firmware_os': {
    label: 'Firmware / OS',
    definition:
      'Device software version at collection time; algorithm changes can affect values across updates.',
  },
  'device.anatomical_placement': {
    label: 'Anatomical placement',
    definition:
      'Where the device was worn (e.g. non-dominant wrist); affects motion and Heart Rate interpretation.',
  },

  'cadence.signal_description': {
    label: 'Signal description',
    definition: 'Registry text explaining what this signal table represents (from import manifest).',
  },
  'cadence.native_sensor_rate': {
    label: 'Native sensor rate',
    definition:
      'Hardware sampling frequency before vendor aggregation (e.g. 25 Hz PPG). Shown when the importer persists it; otherwise Unavailable.',
  },
  'cadence.declared_interval': {
    label: 'Declared interval',
    definition:
      'Interval the vendor or manifest claims each row represents (from signal registry sampling_interval).',
  },
  'cadence.observed_cadence': {
    label: 'Observed cadence (mode)',
    definition:
      'Most common time gap between consecutive records while worn; reflects typical reporting interval. Long gaps are excluded from “typical” because they usually mean non-wear.',
  },
  'cadence.largest_gap': {
    label: 'Largest gap',
    definition:
      'Maximum time between consecutive records; often indicates device off-body, charging, or sync delay—not normal cadence.',
  },
  'cadence.timezone': {
    label: 'Timezone',
    definition: 'Local offset for timestamps; needed to align sleep and circadian analysis.',
  },
  'cadence.signal': {
    label: 'Signal',
    definition: 'Registered signal table name in this dataset.',
  },

  'provenance.origin': {
    label: 'Catalog origin',
    definition: 'How this dataset entered your team catalog (e.g. W4H Samples, local ingest).',
  },
  'provenance.description': {
    label: 'Description',
    definition: 'Human-readable summary from the dataset catalog.',
  },
  'provenance.ingestion_source': {
    label: 'Ingestion source',
    definition: 'W4H contribution or importer that loaded the files (notebook, CLI, or API).',
  },
  'provenance.vendor_api_url': {
    label: 'Vendor API URL',
    definition: 'Upstream API documentation for this signal’s export format.',
  },
  'provenance.package_vendor': {
    label: 'Package vendor',
    definition: 'Identity of the source data package (vendor id).',
  },
  'provenance.package_format': {
    label: 'Package format',
    definition: 'File format of the source data package.',
  },
  'provenance.package_version': {
    label: 'Package version',
    definition: 'Manifest or package version of the source data.',
  },
  'provenance.api_payload_scheme': {
    label: 'API payload scheme',
    definition:
      'Standard or vendor schema (e.g. FHIR profile, Open mHealth) used at import.',
  },
  'provenance.api_payload_version': {
    label: 'API payload version',
    definition: 'Version of the API payload scheme used at import.',
  },
  'provenance.data_state': {
    label: 'Data state modifier',
    definition:
      'Processing level before W4H: raw sensor stream, vendor-filtered aggregate, or imputed values.',
  },

  'compliance.irb_reference': {
    label: 'IRB reference',
    definition: 'Institutional review board or ethics approval id for using this data in research.',
  },
  'subjects.enrolled_participants': {
    label: 'Enrolled participants',
    definition:
      'Distinct subject ids in the enrolled subjects table (falls back to catalog count when the table is missing).',
  },
  'subjects.participant_age': {
    label: 'Participant age',
    definition:
      'Age or age band for cohort context; requires demographics data not in wearable exports alone.',
  },

  'compliance.wear_subjects': {
    label: 'Wear-compliant subjects',
    definition:
      'Number of participants meeting the wear protocol threshold (from cached analytics).',
  },
  'compliance.wear_rate': {
    label: 'Cohort compliance rate',
    definition:
      'Percentage of enrolled subjects who met the wear protocol (compliant ÷ total).',
  },
  'compliance.median_daily_wear': {
    label: 'Median daily wear',
    definition:
      'Median percentage of a day that the device was worn.',
  },
  'compliance.median_days_worn': {
    label: 'Median days wear',
    definition:
      'Median number of days the device was worn.',
  },
  'semantic.signal': {
    label: 'Signal',
    definition: 'Registered signal that owns this variable.',
  },
  'semantic.signal_description': {
    label: 'Signal description',
    definition: 'Registry text explaining what this signal table represents (from import manifest).',
  },
  'semantic.unit': {
    label: 'Unit',
    definition: 'Measurement unit (e.g. bpm, kg, kcal per interval).',
  },
  'semantic.type': {
    label: 'Data type',
    definition: 'Storage type (integer, double, text, date).',
  },
  'semantic.description': {
    label: 'Description',
    definition: 'Importer or registry text explaining what the variable represents.',
  },
  'semantic.ontology': {
    label: 'Ontology code',
    definition:
      'Standard medical code (LOINC, SNOMED-CT) mapping this variable to a global concept.',
  },
};

export function fieldHelp(key) {
  return METADATA_FIELD_HELP[key] || { label: key, definition: UNAVAILABLE_NOTE };
}
