<script setup>
// Published notebook reports (ADR-029 §5): interactive HTML snapshots shown in a sandboxed
// iframe — scripts allowed, no network, no same-origin. For edge cases the chart component
// cannot express; not a dashboard.
import { computed, onMounted, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';

const props = defineProps({
  projectId: { type: String, default: '' },
  datasets: { type: Array, default: () => [] },
  canManage: { type: Boolean, default: false },
  currentUserId: { type: [String, Number], default: null },
});

const reports = ref([]);
const loading = ref(false);
const error = ref('');
const message = ref('');
const viewing = ref(null); // { report, html }
const viewLoading = ref(false);

const showPublish = ref(false);
const form = ref({ title: '', description: '', html: '', fileName: '', datasetIds: [], slug: '', version: '', ack: false });
const publishing = ref(false);
const publishError = ref('');

const linkable = computed(() => (props.datasets || [])
  .map((d) => ({
    id: String(d.id || d.dataset_id || ''),
    name: d.name || d.id || 'Dataset',
    loaded: Number(d.physical_table_count ?? d.table_count ?? 0) > 0,
  }))
  .filter((d) => d.id && d.loaded));

async function load() {
  if (!props.projectId) return;
  loading.value = true;
  error.value = '';
  try {
    const res = await api.get(`projects/${encodeURIComponent(props.projectId)}/reports`, authHeaders());
    reports.value = Array.isArray(res.data) ? res.data : [];
  } catch (e) {
    reports.value = [];
    error.value = e.response?.data?.error || 'Could not load reports.';
  } finally {
    loading.value = false;
  }
}
onMounted(load);
watch(() => props.projectId, load);

function fmtDate(v) {
  return v ? new Date(v).toLocaleString() : '';
}
function fmtSize(bytes) {
  return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}
function sources(r) {
  const ds = r.source?.datasets || [];
  return ds.map((d) => `${d.name || d.id}${d.team_name ? ` (${d.team_name})` : ''}`).join(', ');
}
const canDelete = (r) => props.canManage || Number(r.created_by) === Number(props.currentUserId);

async function view(r) {
  viewLoading.value = true;
  viewing.value = null;
  error.value = '';
  try {
    const res = await api.get(
      `projects/${encodeURIComponent(props.projectId)}/reports/${encodeURIComponent(r.id)}/content`,
      authHeaders()
    );
    viewing.value = res.data;
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not open this report.';
  } finally {
    viewLoading.value = false;
  }
}

async function remove(r) {
  if (!window.confirm(`Delete the report “${r.title}”? This cannot be undone.`)) return;
  try {
    await api.delete(`projects/${encodeURIComponent(props.projectId)}/reports/${encodeURIComponent(r.id)}`, authHeaders());
    if (viewing.value?.report?.id === r.id) viewing.value = null;
    message.value = 'Report deleted.';
    await load();
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not delete the report.';
  }
}

function onFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    form.value.html = String(reader.result || '');
    form.value.fileName = file.name;
    if (!form.value.title) form.value.title = file.name.replace(/\.html?$/i, '');
  };
  reader.readAsText(file);
}

async function publish() {
  publishing.value = true;
  publishError.value = '';
  try {
    await api.post(`projects/${encodeURIComponent(props.projectId)}/reports`, {
      title: form.value.title,
      description: form.value.description || undefined,
      html: form.value.html,
      dataset_ids: form.value.datasetIds,
      contribution: form.value.slug ? { slug: form.value.slug, version: form.value.version } : undefined,
      acknowledge_embedded_data: form.value.ack,
    }, authHeaders());
    message.value = 'Report published.';
    showPublish.value = false;
    form.value = { title: '', description: '', html: '', fileName: '', datasetIds: [], slug: '', version: '', ack: false };
    await load();
  } catch (e) {
    publishError.value = e.response?.data?.error || 'Could not publish the report.';
  } finally {
    publishing.value = false;
  }
}
</script>

<template>
  <div class="card p-3 mb-3">
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
      <div>
        <h6 class="mb-0">Reports</h6>
        <p class="small text-muted mb-0">
          Interactive notebook output published to this project, for views the charts above cannot show.
          A report is a <strong>snapshot</strong>: it does not update when the data changes.
        </p>
      </div>
      <button v-if="canManage" type="button" class="btn btn-sm btn-outline-primary flex-shrink-0"
        @click="showPublish = !showPublish">
        <i class="bi bi-upload" aria-hidden="true"></i> Publish a report…
      </button>
    </div>

    <div v-if="message" class="alert alert-success py-1 small">{{ message }}</div>
    <div v-if="error" class="alert alert-danger py-1 small">{{ error }}</div>

    <form v-if="showPublish" class="border rounded p-3 mb-3" @submit.prevent="publish">
      <div class="alert alert-warning small py-2">
        The report page <strong>embeds the data it plots</strong> and runs its own scripts. It is shown
        only to members of this project, in a sandbox with no network access. Run your notebook in your own
        environment, export it as HTML, and upload it here.
      </div>
      <div class="row g-2">
        <div class="col-md-6">
          <label class="form-label small mb-0" for="rep-file">Report file (.html)</label>
          <input id="rep-file" type="file" accept=".html,.htm,text/html" class="form-control form-control-sm" required @change="onFile" />
        </div>
        <div class="col-md-6">
          <label class="form-label small mb-0" for="rep-title">Title</label>
          <input id="rep-title" v-model.trim="form.title" class="form-control form-control-sm" maxlength="200" required />
        </div>
        <div class="col-12">
          <label class="form-label small mb-0" for="rep-desc">Description (optional)</label>
          <input id="rep-desc" v-model.trim="form.description" class="form-control form-control-sm" maxlength="1000" />
        </div>
        <div class="col-md-6">
          <label class="form-label small mb-0">Built from datasets <span class="text-muted">(your team's own, required)</span></label>
          <div v-for="d in linkable" :key="d.id" class="form-check">
            <input :id="`rep-ds-${d.id}`" v-model="form.datasetIds" type="checkbox" class="form-check-input" :value="d.id" />
            <label :for="`rep-ds-${d.id}`" class="form-check-label small">{{ d.name }}</label>
          </div>
          <div v-if="!linkable.length" class="small text-muted">No loaded datasets linked to this project.</div>
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-0" for="rep-slug">Contribution (optional)</label>
          <input id="rep-slug" v-model.trim="form.slug" class="form-control form-control-sm" placeholder="slug" />
        </div>
        <div class="col-md-3">
          <label class="form-label small mb-0" for="rep-ver">Version</label>
          <input id="rep-ver" v-model.trim="form.version" class="form-control form-control-sm" placeholder="v1.0.0" />
        </div>
        <div class="col-12">
          <div class="form-check">
            <input id="rep-ack" v-model="form.ack" type="checkbox" class="form-check-input" required />
            <label for="rep-ack" class="form-check-label small">
              I understand this report embeds the data it plots and can be read by every member of this project.
            </label>
          </div>
        </div>
      </div>
      <div v-if="publishError" class="alert alert-danger py-1 small mt-2 mb-0">{{ publishError }}</div>
      <div class="d-flex gap-2 mt-2">
        <button class="btn btn-sm btn-primary" type="submit"
          :disabled="publishing || !form.html || !form.title || !form.datasetIds.length || !form.ack">
          {{ publishing ? 'Publishing…' : 'Publish' }}
        </button>
        <button class="btn btn-sm btn-link" type="button" @click="showPublish = false">Cancel</button>
      </div>
    </form>

    <div v-if="loading" class="small text-muted">Loading…</div>
    <p v-else-if="!reports.length" class="small text-muted mb-0">No reports published yet.</p>
    <ul v-else class="list-group list-group-flush border rounded">
      <li v-for="r in reports" :key="r.id" class="list-group-item">
        <div class="d-flex flex-wrap justify-content-between gap-2">
          <div class="min-w-0">
            <div class="fw-semibold">{{ r.title }}</div>
            <div v-if="r.description" class="small">{{ r.description }}</div>
            <div class="small text-muted">
              Snapshot {{ fmtDate(r.snapshot_at) }} · {{ r.created_by_name || 'Unknown' }} · {{ fmtSize(r.size_bytes) }}
            </div>
            <div class="small text-muted">
              From {{ sources(r) }}<span v-if="r.source?.contribution?.slug">
                · {{ r.source.contribution.slug }}{{ r.source.contribution.version ? '@' + r.source.contribution.version : '' }}</span>
            </div>
          </div>
          <div class="d-flex gap-1 align-self-start flex-shrink-0">
            <button type="button" class="btn btn-sm btn-primary" @click="view(r)">Open</button>
            <button v-if="canDelete(r)" type="button" class="btn btn-sm btn-outline-danger" @click="remove(r)">Delete</button>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="viewLoading" class="small text-muted mt-3">Opening report…</div>
    <div v-if="viewing" class="mt-3">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <div class="small fw-semibold">{{ viewing.report.title }}
          <span class="badge text-bg-secondary ms-1">Snapshot · {{ fmtDate(viewing.report.snapshot_at) }}</span>
        </div>
        <button type="button" class="btn btn-sm btn-link" @click="viewing = null">Close</button>
      </div>
      <!-- Unvetted HTML: scripts only. No same-origin, no top navigation, no popups, no forms;
           a CSP injected by the API also blocks every network request. -->
      <iframe
        class="report-frame"
        title="Published report"
        sandbox="allow-scripts"
        referrerpolicy="no-referrer"
        :srcdoc="viewing.html"
      ></iframe>
    </div>
  </div>
</template>

<style scoped>
.report-frame {
  width: 100%;
  height: 560px;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  background: #fff;
}
</style>
