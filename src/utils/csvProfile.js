// Client-side CSV profiling and deterministic vendor detection for the
// module file-upload gate: buildFileProfile() reads a File for a preview and
// local type inference, classifyVendor() scores whether a submission looks
// Fitbit-sourced, checkFileLimits() enforces size/count caps. No network calls.

const DELIMITERS = [',', '\t', ';'];
const PREVIEW_ROWS = 20;

// Local UX/performance guards, not a storage-cost or PHI control -- nothing
// is uploaded at this stage. Protects the tab from freezing on a
// full in-memory read, or from an accidental selection far larger than a per-metric CSV export. Mirrors the
// caps in w4h-api/lib/contribution-uploads.js.
export const MAX_FILES = 200;
export const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB/file
export const MAX_TOTAL_SIZE_BYTES = 1024 ** 3; // 1GB combined

/** Checks a candidate file list against MAX_FILES/MAX_FILE_SIZE_BYTES/
 * MAX_TOTAL_SIZE_BYTES before any profiling happens -- used identically by
 * the multi-select `<input>`. Returns an error
 * string, or null if the list is within limits. */
export function checkFileLimits(files) {
  if (files.length > MAX_FILES) {
    return `Too many files (${files.length}) -- W4H can profile up to ${MAX_FILES} at once. Pick a narrower folder/selection.`;
  }
  const oversized = files.find((f) => f.size > MAX_FILE_SIZE_BYTES);
  if (oversized) {
    return `"${oversized.name}" is too large (${Math.round(oversized.size / 1024 / 1024)}MB) -- the per-file limit is ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB.`;
  }
  const totalSize = files.reduce((sum, f) => sum + f.size, 0);
  if (totalSize > MAX_TOTAL_SIZE_BYTES) {
    return `These files total ${Math.round(totalSize / 1024 / 1024)}MB -- the combined limit is ${MAX_TOTAL_SIZE_BYTES / 1024 / 1024}MB. Pick a narrower folder/selection.`;
  }
  return null;
}

function detectDelimiter(headerLine) {
  let best = ',';
  let bestCount = -1;
  for (const d of DELIMITERS) {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  }
  return best;
}

// Minimal quoted-field-aware CSV line split — good enough for well-formed
// vendor exports; not a full RFC4180 parser.
function splitLine(line, delimiter) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// ADR-030: trial-cast type ranking, tolerant of a handful of blanks/typos in
// real-world CSVs -- replaces the old all-or-nothing "every value must
// match" check with "at least TYPE_MATCH_THRESHOLD of them do", still fully
// deterministic and computed only over the already-sampled preview rows (no
// new file reads). Candidates are tried most-specific-first, same order and
// same output type names as before.
const TYPE_MATCH_THRESHOLD = 0.95;
// Real-world vendor exports routinely use US-style dates (e.g. Fitabase/
// Kaggle Fitbit CSVs: "3/25/2016", "3/12/2016 12:00:00 AM"), not just ISO-8601
// -- confirmed live against real Fitabase sample files, where every date/
// timestamp column silently fell through to 'text' without this. That
// mistyping isn't cosmetic: a 'text'-mistyped date column is not recognised as
// a time axis, which then drops out of dedupe_columns too -- a real multi-row-per-subject file
// silently collapses to ~1 row/subject on import under ON CONFLICT DO
// NOTHING, with no error surfaced anywhere. Postgres itself parses M/D/YYYY
// values fine on insert (default DateStyle is MDY-tolerant); this was purely
// a gap in this app's own local type inference.
const US_DATE_RE = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const US_DATETIME_RE = /^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}(:\d{2})?\s*(AM|PM)?$/i;
const TYPE_CANDIDATES = [
  ['integer', (v) => /^-?\d+$/.test(v)],
  ['double precision', (v) => /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(v)],
  ['boolean', (v) => ['true', 'false', 't', 'f'].includes(v.toLowerCase())],
  ['date', (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) || US_DATE_RE.test(v)],
  ['timestamp with time zone', (v) => /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?/.test(v) || US_DATETIME_RE.test(v)],
  ['time', (v) => /^\d{2}:\d{2}(:\d{2})?$/.test(v)],
];

// Ported from the Python-side registry's infer_type(), which already
// guarded against this: any all-digit value matches the 'integer' candidate
// regardless of magnitude, but a real Fitbit user id (10 digits) or logId
// (13-digit epoch-ms, e.g. Fitabase's weightLogInfo/minuteSleep LogId column)
// overflows Postgres's 4-byte int4 range -- confirmed live, this caused a
// real "integer out of range" insert failure against actual Fitabase data.
// Widen to bigint instead of letting the INSERT crash.
const INT4_MAX = 2147483647;

function inferType(values) {
  const nonEmpty = values.filter((v) => v !== '' && v != null).map((v) => String(v).trim());
  if (!nonEmpty.length) return 'text';
  for (const [type, test] of TYPE_CANDIDATES) {
    const matches = nonEmpty.filter(test).length;
    if (matches / nonEmpty.length >= TYPE_MATCH_THRESHOLD) {
      if (type === 'integer' && nonEmpty.some((v) => /^-?\d+$/.test(v) && Math.abs(parseInt(v, 10)) > INT4_MAX)) {
        return 'bigint';
      }
      return type;
    }
  }
  return 'text';
}

// ADR-030: cheap aggregate value-format stats, computed only over the same
// preview sample as inferType(), never persisted, never sent anywhere --
// only ever consumed locally by classifyVendor()'s scoring below. Never a
// literal value: min/max are aggregate numbers, distinct_count is capped at
// 50 (bounds cost and guarantees this can never function as a cardinality
// fingerprint of real data), formats are named pattern-match labels only.
const EPOCH_SECONDS_RE = /^\d{9,10}$/;
const ISO8601_RE = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?/;
const BARE_TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;
const DISTINCT_CAP = 50;

function computeValueStats(values) {
  const nonEmpty = values.filter((v) => v !== '' && v != null).map((v) => String(v).trim());
  if (!nonEmpty.length) return null;
  const stats = {};
  const numeric = nonEmpty.map(Number);
  if (numeric.every((n) => !Number.isNaN(n))) {
    stats.min = Math.min(...numeric);
    stats.max = Math.max(...numeric);
  }
  const distinct = new Set(nonEmpty);
  stats.distinctCount = Math.min(distinct.size, DISTINCT_CAP);
  stats.distinctCapped = distinct.size > DISTINCT_CAP;
  const formats = [];
  if (nonEmpty.every((v) => EPOCH_SECONDS_RE.test(v))) formats.push('epoch_seconds');
  if (nonEmpty.every((v) => ISO8601_RE.test(v))) formats.push('iso8601');
  if (nonEmpty.every((v) => BARE_TIME_RE.test(v))) formats.push('bare_time');
  if (formats.length) stats.formats = formats;
  return stats;
}

const SUBJECT_HEADER_RE = /\b(id|subject|participant|patient)([_-]?id)?\b/i;
const TIME_HEADER_RE = /\b(date|time|timestamp)\b/i;

// --- deterministic multi-vendor gate (ADR-028, extended by ADR-029) ----
// Real wearable-vendor CSVs have no single canonical schema per vendor
// (native dashboard exports, third-party research-platform re-flattenings
// e.g. MyDataHelps, and ad hoc researcher flattening of a vendor's own JSON/
// XML export all use different column conventions) -- so this is a
// weighted-vocabulary + structural scorer per candidate vendor, not a fixed-
// signature overlap count.

const TIER_A_WEIGHT = 3;
const TIER_B_WEIGHT = 1;
const ACCEPT_THRESHOLD = 3;
const AMBIGUITY_MARGIN = 3;
const TIER_S_MIN_OVERLAP = 0.9;

// MyDataHelps-style clinical-research re-flattening artifacts that show up
// verbatim in both Garmin- and Apple-Health-via-MyDataHelps CSV exports --
// not vendor-distinctive on their own, so they're weight-1 (tier B) on every
// vendor rather than a vendor-specific tier-A signal.
const SHARED_PLATFORM_VOCAB = [
  'summaryid', 'participantidentifier', 'participantid', 'inserteddate',
  'sourceidentifier', 'sourcename', 'sourceversion',
];

// Per-vendor weighted vocabulary + curated reference shapes. A future vendor
// is a data-only addition here -- no change to classifyVendor() itself.
const VENDOR_REGISTRY = {
  fitbit: {
    tierA: new Set([
      'restingheartrate', 'caloriesbmr', 'trackerdistance', 'trackersteps', 'trackerfloors',
      'trackerelevation', 'trackeractivitycalories', 'trackercalories', 'minutesfairlyactive',
      'minuteslightlyactive', 'minutessedentary', 'minutesveryactive', 'bodybmi', 'bodyfat',
      'bodyweight', 'activitycalories', 'fatburnminutes', 'cardiominutes', 'peakminutes',
      'outofrangeminutes', 'activitytypeid', 'fatpercent',
      'averageheartrate', 'activeduration', 'activityname', 'rmssd', 'hf', 'lf',
      'heartratezone', 'heartratezone1', 'heartratezone2', 'heartratezone3', 'heartratezone4',
      // Fitabase / Kaggle Fitbit export vocabulary (the de-facto real-world
      // Fitbit research CSV, e.g. a Fitbit Takeout export) -- distinctive,
      // ~0 false-positive risk.
      'veryactiveminutes', 'fairlyactiveminutes', 'lightlyactiveminutes', 'sedentaryminutes',
      'veryactivedistance', 'moderatelyactivedistance', 'lightactivedistance', 'sedentaryactivedistance',
      'totalminutesasleep', 'totaltimeinbed', 'totalsleeprecords',
    ]),
    tierB: new Set([
      'value', 'weight', 'bmi', 'steps', 'floors', 'distance', 'elevation', 'calories',
      'sleep', 'hrv', 'mets', 'coverage', 'source', 'level', 'type', 'datetime', 'bpm',
      'startdate', 'enddate',
      // Also ported from the Python-side registry -- same drift as above.
      'totalsteps', 'totaldistance', 'steptotal', 'activitydate', 'activityday', 'activityhour',
      'activityminute', 'intensity', 'totalintensity', 'averageintensity',
      'weightkg', 'weightpounds', 'ismanualreport', 'logid', 'heartrate',
      ...SHARED_PLATFORM_VOCAB,
    ]),
    // This project's own curated reference shapes (w4h-sample-fitbit-csv/
    // w4h-sample-icde-demo-csv manifests) -- an exact/near-exact header-set
    // match against one of these is a strong signal on its own.
    shapes: {
      subjects: new Set(['id', 'startdate', 'enddate']),
      weight: new Set(['id', 'date', 'time', 'weight', 'bmi', 'fatpercent', 'source']),
      calories: new Set(['id', 'date', 'time', 'value', 'mets']),
      // heart_rate/distances/steps/sleep were four byte-identical shape
      // definitions ({id, date, timestamp, value}) -- matchesCuratedShape()
      // always returns whichever is defined first, so every one of these
      // files reported matchedShape="heart_rate" regardless of which signal
      // it actually was. Found live testing the real ICDE-demo fixture:
      // weight.csv/calories.csv/distances.csv/sleep.csv/steps.csv all use
      // this same minimal 4-column convention there (unlike the richer
      // weight/calories shapes above, drawn from the real w4h-sample-fitbit-csv
      // package). Consolidated into one honestly-named generic shape -- it was
      // never distinguishable by header shape alone anyway; the AI already
      // correctly uses the file name to tell these apart (confirmed live),
      // matchedShape only ever needed to answer "is this a known Fitbit
      // shape," not "which specific signal is this."
      single_value_timeseries: new Set(['id', 'date', 'timestamp', 'value']),
      gps_track: new Set(['id', 'date', 'timestamp', 'latitude', 'longitude']),
      // Fitabase daily-activity + weight-log shapes -- ported from the
      // Python-side registry (same drift as the vocab above): a real
      // dailyActivity_merged.csv / weightLogInfo_merged.csv clears this on
      // its own via header-set overlap.
      daily_activity: new Set([
        'id', 'activitydate', 'totalsteps', 'totaldistance', 'trackerdistance',
        'veryactivedistance', 'moderatelyactivedistance', 'lightactivedistance', 'sedentaryactivedistance',
        'veryactiveminutes', 'fairlyactiveminutes', 'lightlyactiveminutes', 'sedentaryminutes', 'calories',
      ]),
      weight_log: new Set(['id', 'date', 'weightkg', 'weightpounds', 'fat', 'bmi', 'ismanualreport', 'logid']),
      // New: the remaining real Fitbit Takeout/Fitabase per-metric export
      // shapes, not on either side before -- hourly/minute rollups and the
      // raw per-second heart-rate stream. Each is small/generic enough on its
      // own that structuralPrefilter()'s subject+temporal gate (extended
      // below to also accept a type-inferred temporal column, since
      // "ActivityHour"/"ActivityMinute" carry no date/time/timestamp token)
      // is what keeps false positives down, same discipline as every other
      // shape here.
      hourly_calories: new Set(['id', 'activityhour', 'calories']),
      hourly_intensities: new Set(['id', 'activityhour', 'totalintensity', 'averageintensity']),
      hourly_steps: new Set(['id', 'activityhour', 'steptotal']),
      minute_calories: new Set(['id', 'activityminute', 'calories']),
      minute_intensities: new Set(['id', 'activityminute', 'intensity']),
      minute_mets: new Set(['id', 'activityminute', 'mets']),
      minute_steps: new Set(['id', 'activityminute', 'steps']),
      minute_sleep: new Set(['id', 'date', 'value', 'logid']),
      seconds_timeseries: new Set(['id', 'time', 'value']),
      // Confirmed against the real ~/OneDrive_bhargav/Fitabase Data
      // 4.12.16-5.12.16/ folder -- that export also includes daily-grain
      // per-metric files (Fitabase splits dailyActivity_merged.csv's columns
      // out into these narrower siblings too) and a separate sleep summary.
      daily_calories: new Set(['id', 'activityday', 'calories']),
      daily_intensities: new Set([
        'id', 'activityday', 'sedentaryminutes', 'lightlyactiveminutes', 'fairlyactiveminutes',
        'veryactiveminutes', 'sedentaryactivedistance', 'lightactivedistance',
        'moderatelyactivedistance', 'veryactivedistance',
      ]),
      daily_steps: new Set(['id', 'activityday', 'steptotal']),
      sleep_day: new Set(['id', 'sleepday', 'totalsleeprecords', 'totalminutesasleep', 'totaltimeinbed']),
      // Deliberately NOT adding a shape for Fitabase's "Wide" per-minute
      // files (minuteCaloriesWide_merged.csv etc. -- Id, ActivityHour, then
      // 60 columns Calories00..Calories59, one per minute-of-hour). That's a
      // genuinely different data shape (one row = one hour, 60 value columns)
      // that this app's csv-batch import (one CSV row -> one GeoMTS row) has
      // no support for -- it would need melting 60 columns into 60 timestamped
      // rows first, a real reshape feature this pass doesn't build. Confirmed
      // these already fall to classifyVendor()'s 'unknown' band on their own
      // (no tierA hits, one generic tierB token) -- correctly refusing to
      // claim a confident match rather than importing something silently
      // wrong. The Narrow equivalents (always exported alongside the Wide
      // ones by Fitabase) are what this importer supports; that's the file to
      // pick instead.
    },
  },
  garmin: {
    // Garmin Health API / MyDataHelps re-flattening vocabulary -- distinctive
    // Firstbeat/Body-Battery/stress terms (tier A) plus the epoch-seconds
    // field-naming convention (tier B) that's characteristic of Garmin's
    // export shape even when the specific metric is generic.
    tierA: new Set([
      'bodybatterylevel', 'stressdetailsummary', 'vo2max', 'aerobictrainingeffect',
      'anaerobictrainingeffect', 'starttimeoffsetinseconds',
    ]),
    tierB: new Set([
      'stresslevel', 'bodybattery', 'respiration', 'durationinseconds',
      'starttimeinseconds', 'calendardate', ...SHARED_PLATFORM_VOCAB,
    ]),
    shapes: {
      // Garmin-via-MyDataHelps rows carry a ParticipantIdentifier column
      // (same clinical-research re-flattening convention as Apple's
      // healthkitv2_samples shape below) -- required here so these shapes
      // can clear structuralPrefilter()'s subject-column check; a bare
      // per-device Garmin export with no participant column falls back to
      // vocabulary scoring instead of a Tier-S match.
      daily_summary: new Set(['summaryid', 'participantidentifier', 'calendardate', 'activekilocalories', 'bmrkilocalories', 'steps', 'durationinseconds', 'activetimeinseconds']),
      sleep_summary: new Set(['summaryid', 'participantidentifier', 'calendardate', 'durationinseconds', 'deepsleepdurationinseconds', 'lightsleepdurationinseconds', 'remsleepinseconds', 'awakedurationinseconds']),
      body_battery_events: new Set(['summaryid', 'participantidentifier', 'calendardate', 'bodybatterylevel', 'starttimeoffsetinseconds', 'durationinseconds']),
    },
  },
  apple_health: {
    // Apple's most distinctive marker (HKQuantityTypeIdentifier* strings)
    // lives in row values of a "type" column, not in headers -- the gate
    // stays header-only (no new value-inspecting behavior, see ADR-029), so
    // detection confidence on the plain attribute_passthrough shape is lower
    // by design; the MyDataHelps HealthKitV2 re-flattening has its own
    // distinctive headers instead.
    tierA: new Set(['healthkitsamplekey', 'sourceoperatingsystemversion', 'devicefdaidentifier']),
    tierB: new Set(['unit', 'creationdate', 'devicename', 'devicemodel', 'devicemanufacturer', ...SHARED_PLATFORM_VOCAB]),
    shapes: {
      attribute_passthrough: new Set(['type', 'sourcename', 'sourceversion', 'unit', 'creationdate', 'startdate', 'enddate', 'value']),
      healthkitv2_samples: new Set([
        'healthkitsamplekey', 'participantidentifier', 'startdate', 'date', 'value', 'units',
        'sourceidentifier', 'sourcename', 'sourceversion', 'sourceoperatingsystemversion',
        'sourceproducttype', 'devicename', 'devicemodel', 'devicemanufacturer',
        'devicehardwareversion', 'devicesoftwareversion', 'devicefirmwareversion',
        'devicelocalidentifier', 'devicefdaidentifier', 'metadata', 'inserteddate',
      ]),
    },
  },
};

// Camel/glued compound subject-identifier headers (e.g. "ParticipantIdentifier")
// have no word boundary for SUBJECT_HEADER_RE once canonicalized -- checked as
// whole-canonical-token equality, not substring, same discipline as the
// Tier A/B vocab.
const SUBJECT_COMPOUND_TOKENS = new Set(['participantidentifier', 'participantid', 'subjectid', 'patientid']);

/** Collapses "Resting Heart Rate" / "resting_heart_rate" / "RestingHeartRate"
 * to the same token so vocabulary matching doesn't depend on a researcher's
 * naming style. Whole-token equality only is used against it -- never
 * substring -- so e.g. "defect_count" (-> "defectcount") never spuriously
 * matches "count". */
export function canonicalizeHeader(header) {
  const spaced = String(header || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** A file's name is itself deterministic evidence of vendor (e.g.
 * "RestingHeartRate.csv" vs "StressDetailSummary.csv" vs "HeartRate.csv") --
 * returns both the fully-glued canonical form (matches compound tier-A
 * terms) and its split words (matches simple tier-B terms), extension
 * stripped. */
function filenameTokens(name) {
  const base = String(name || '').replace(/\.[^./]+$/, '');
  const spaced = base.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const words = spaced.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return [...words, canonicalizeHeader(base)];
}

/** Inserts a real \b word boundary between glued/joined compound words so
 * SUBJECT_HEADER_RE/TIME_HEADER_RE can find "date"/"time"/"id" etc. as a
 * whole word regardless of a vendor's separator convention. Handles both
 * camelCase (e.g. "CalendarDate"/"StartDate", Garmin/Apple/MyDataHelps
 * convention -- \b never fires between two letters of different case) and
 * underscore/hyphen-joined compounds (e.g. "start_date"/"end_date", this
 * project's own Fitbit fixture convention -- \b never fires at a plain
 * underscore either, since "_" is itself a \w character in regex, same
 * class of miss as camelCase). Found live: icde_demo_subjects.csv
 * (id,start_date,end_date) submitted alone classified as "unknown" purely
 * because of this gap -- matchesCuratedShape() found the "subjects" shape
 * fine (it canonicalizes first), but structuralPrefilter() never even got
 * that far. */
function camelSpaced(header) {
  const spaced = String(header || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.replace(/[_-]+/g, ' ');
}

// Ported from the Python-side registry's structural_prefilter(), which
// already accepted this fallback -- a temporal column by header name OR by
// locally-inferred type. Fitbit's own "ActivityHour"/"ActivityMinute"
// columns (hourly/minute Fitabase rollups) carry no date/time/timestamp
// token in their header at all, so without this fallback those files could
// never pass the prefilter and reach shape matching, no matter what's added
// to VENDOR_REGISTRY.fitbit.shapes above.
const TEMPORAL_TYPES = new Set(['date', 'timestamp with time zone', 'time']);

function structuralPrefilter(headers, types = []) {
  const hasSubject = headers.some(
    (h) => SUBJECT_HEADER_RE.test(camelSpaced(h)) || SUBJECT_COMPOUND_TOKENS.has(canonicalizeHeader(h))
  );
  const hasTemporal = headers.some((h) => TIME_HEADER_RE.test(camelSpaced(h))) || types.some((t) => TEMPORAL_TYPES.has(t));
  return hasSubject && hasTemporal;
}

function fileVendorScore(headers, fnTokens, vendorKey) {
  const { tierA, tierB } = VENDOR_REGISTRY[vendorKey];
  const canon = new Set([...headers.map(canonicalizeHeader), ...fnTokens]);
  let score = 0;
  for (const t of canon) {
    if (tierA.has(t)) score += TIER_A_WEIGHT;
    else if (tierB.has(t)) score += TIER_B_WEIGHT;
  }
  return score;
}

function matchesCuratedShape(headers, vendorKey) {
  const canon = new Set(headers.map(canonicalizeHeader));
  for (const [shapeName, shapeCols] of Object.entries(VENDOR_REGISTRY[vendorKey].shapes)) {
    let overlap = 0;
    for (const c of shapeCols) if (canon.has(c)) overlap += 1;
    if (overlap / shapeCols.size >= TIER_S_MIN_OVERLAP) return shapeName;
  }
  return null;
}

// ADR-030: low-weight value-format/range signals, additive to the header/
// filename vocabulary score above -- never a replacement, a file with zero
// value-signal hits scores exactly as it did before this existed. Computed
// only from aggregate stats (computeValueStats() -- min/max, capped
// distinct-count, format-match labels), never a row value.
const VALUE_SIGNAL_WEIGHT = 1;
const VALUE_SIGNAL_HINTS = {
  fitbit: [
    // A plausible resting/active heart-rate range for a column literally
    // named "value" -- this project's own heart_rate.csv convention.
    { header: 'value', check: (s) => s && s.min != null && s.min >= 30 && s.max <= 220 },
  ],
  garmin: [
    // Garmin's *InSeconds field-naming convention holds epoch-seconds-shaped
    // integers, not calendar dates -- a strong tell independent of the name.
    { headerSuffix: 'inseconds', check: (s) => s && s.formats && s.formats.includes('epoch_seconds') },
  ],
  apple_health: [
    // Apple's startDate/endDate/creationDate columns are full ISO-8601
    // timestamps, distinguishing them from Fitbit/Garmin's separate date
    // columns.
    { headerIn: ['startdate', 'enddate', 'creationdate'], check: (s) => s && s.formats && s.formats.includes('iso8601') },
  ],
};

function valueSignalScore(headers, columnValueStats, vendorKey) {
  const hints = VALUE_SIGNAL_HINTS[vendorKey];
  if (!hints || !columnValueStats) return 0;
  let score = 0;
  headers.forEach((h, i) => {
    const canon = canonicalizeHeader(h);
    const stats = columnValueStats[i];
    for (const hint of hints) {
      const nameMatches =
        (hint.header && canon === hint.header) ||
        (hint.headerSuffix && canon.endsWith(hint.headerSuffix)) ||
        (hint.headerIn && hint.headerIn.includes(canon));
      if (nameMatches && hint.check(stats)) score += VALUE_SIGNAL_WEIGHT;
    }
  });
  return score;
}

/**
 * profiles: [{ name, headers, ... }] for every file in one submission. No
 * network call -- pure local check, scored independently per candidate
 * vendor in VENDOR_REGISTRY and batch-aggregated exactly as the old
 * single-vendor gate was (a real export is naturally a family of per-metric
 * files -- each may be weak alone, strong together). Returns
 * { band: 'detected'|'ambiguous'|'unknown', candidates, top }, where
 * `candidates` is every vendor ranked by score with its best shape match (if
 * any) and `top` is the winning candidate (only set when band === 'detected').
 *
 * Three outcomes, not the old strict binary, per ADR-029:
 *  - 'detected': exactly one vendor has a curated-shape match, or exactly one
 *    vendor clears ACCEPT_THRESHOLD and beats the runner-up by
 *    AMBIGUITY_MARGIN. Still only ever a *pre-filled, overridable* default --
 *    callers must still show it to the user, never apply it silently.
 *  - 'ambiguous': two-plus vendors both shape-match, or both clear threshold
 *    within AMBIGUITY_MARGIN of each other. A hard block requiring an
 *    explicit human choice -- this is not the soft "proceed anyway?" middle
 *    band ADR-028 already rejected for the binary case; there is no way to
 *    proceed without naming a vendor.
 *  - 'unknown': no vendor clears threshold and no shape matches anywhere --
 *    the old 'reject', generalized. Zero AI calls either way.
 */
export function classifyVendor(profiles) {
  const vendorKeys = Object.keys(VENDOR_REGISTRY);
  const scores = Object.fromEntries(vendorKeys.map((v) => [v, 0]));
  const shapeMatches = Object.fromEntries(vendorKeys.map((v) => [v, []]));
  let anyPrefilterPass = false;

  for (const p of profiles) {
    if (!structuralPrefilter(p.headers, p.columnTypes)) continue;
    anyPrefilterPass = true;
    const fnTokens = filenameTokens(p.name);
    for (const vendorKey of vendorKeys) {
      scores[vendorKey] += fileVendorScore(p.headers, fnTokens, vendorKey);
      scores[vendorKey] += valueSignalScore(p.headers, p.columnValueStats, vendorKey);
      const shape = matchesCuratedShape(p.headers, vendorKey);
      if (shape) shapeMatches[vendorKey].push({ file: p.name, shape });
    }
  }

  const candidates = vendorKeys
    .map((vendor) => ({
      vendor,
      score: scores[vendor],
      matchedShape: shapeMatches[vendor][0]?.shape || null,
      shapeMatches: shapeMatches[vendor],
    }))
    .sort((a, b) => b.score - a.score);

  const shapeWinners = candidates.filter((c) => c.shapeMatches.length > 0);
  if (shapeWinners.length > 1) return { band: 'ambiguous', candidates, top: null };
  if (shapeWinners.length === 1) return { band: 'detected', candidates, top: shapeWinners[0] };

  const [first, second] = candidates;
  if (anyPrefilterPass && first.score >= ACCEPT_THRESHOLD) {
    if (!second || first.score - second.score >= AMBIGUITY_MARGIN) {
      return { band: 'detected', candidates, top: first };
    }
    return { band: 'ambiguous', candidates, top: null };
  }
  return { band: 'unknown', candidates, top: null };
}

export { VENDOR_REGISTRY };

/**
 * Reads a File for a human-facing preview: headers, a handful of sample rows
 * (as raw arrays, for on-screen display only — never sent anywhere), inferred
 * per-column types, and an approximate row count.
 */
// Only a header + a bounded preview is ever needed here -- reading the whole
// file (file.text()) was real live risk: a selection can include up to
// MAX_FILES files totaling MAX_TOTAL_SIZE_BYTES (1GB), and holding even one
// full 200MB file as a JS string while profiling can freeze or crash the tab.
// 256KB comfortably covers a header line + PREVIEW_ROWS data rows for any
// realistic CSV width.
const PREVIEW_READ_BYTES = 256 * 1024;

export async function buildFileProfile(file, { maxPreviewRows = PREVIEW_ROWS } = {}) {
  const truncated = file.size > PREVIEW_READ_BYTES;
  const text = await file.slice(0, PREVIEW_READ_BYTES).text();
  const lines = text.split(/\r\n|\n|\r/).filter((l) => l.length > 0);
  if (!lines.length) {
    return { name: file.name, delimiter: ',', headers: [], previewRows: [], columnTypes: [], columnValueStats: [], rowCountApprox: 0 };
  }
  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map((h) => h.trim());
  // Drop a possibly mid-row-truncated final line when we only read a
  // byte-bounded prefix -- avoids parsing a cut-off row as real data.
  const sampledLines = truncated ? lines.slice(0, -1) : lines;
  const dataLines = sampledLines.slice(1);
  const previewRows = dataLines.slice(0, maxPreviewRows).map((l) => splitLine(l, delimiter));

  const columnTypes = [];
  const columnValueStats = []; // ADR-030 -- local-only, never sent anywhere; see computeValueStats()
  headers.forEach((_, colIdx) => {
    const colValues = previewRows.map((r) => r[colIdx]);
    columnTypes.push(inferType(colValues));
    columnValueStats.push(computeValueStats(colValues));
  });

  // "Approx" by design -- extrapolated from the sampled
  // chunk's row density when truncated, rather than reading the whole file
  // just to count lines exactly.
  const rowCountApprox = truncated && dataLines.length
    ? Math.round((file.size / PREVIEW_READ_BYTES) * dataLines.length)
    : dataLines.length;

  return {
    name: file.name,
    delimiter,
    headers,
    previewRows,
    columnTypes,
    columnValueStats,
    rowCountApprox,
  };
}
