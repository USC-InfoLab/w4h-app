<template>
  <main class="container-fluid py-3 project-hub">
    <nav aria-label="breadcrumb" class="mb-3">
      <ol class="breadcrumb mb-0">
        <li class="breadcrumb-item">
          <RouterLink :to="{ name: 'projects' }">Projects</RouterLink>
        </li>
        <li class="breadcrumb-item active" aria-current="page">{{ project.name }}</li>
      </ol>
    </nav>

    <header class="mb-3">
      <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
        <div>
          <div class="small text-muted">
            <span>Slug/route: {{ id }}</span>
            <span v-if="project.id"> · ID: {{ project.id }}</span>
          </div>
          <h3 class="mb-1">{{ project.name }}</h3>
          <div class="small text-muted">
            {{ project.status }} · {{ visibilityLabel(project.visibility) }}
            <span v-if="project.irbProtocolId"> · {{ project.irbProtocolId }}</span>
            <span v-if="project.irbExpiryDate"> · expires {{ formatShortDate(project.irbExpiryDate) }}</span>
          </div>
        </div>

        <div class="d-flex gap-2">
          <button
            v-if="capabilities.can_manage"
            class="btn btn-primary"
            type="button"
            @click="openNotebookModal"
          >
            + Add notebook
          </button>
        </div>
      </div>
    </header>

    <div v-if="loadError" class="alert alert-danger py-2 small" role="alert">
      {{ loadError }}
    </div>

    <div class="row g-3">
      <div class="col-12 col-xl-7">
        <section class="card mb-3">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="mb-0">Notebooks <small class="text-muted">({{ project.notebooks.length }})</small></h6>
              <small class="text-muted">Tracked links, not hosted runtime</small>
            </div>

            <div v-if="project.notebooks.length === 0" class="text-muted small">No notebooks tracked yet.</div>

            <div v-for="nb in project.notebooks" :key="nb.id" class="border rounded p-3 mb-2">
              <div class="d-flex justify-content-between align-items-start gap-2">
                <div>
                  <div class="fw-semibold">{{ nb.title }}</div>
                  <div class="small text-muted">{{ nb.description || 'No description.' }}</div>
                </div>
                <span class="badge text-bg-light">{{ nb.purpose }}</span>
              </div>

              <div class="small text-muted mt-2 font-monospace">
                {{ nb.repoRef || 'main' }} · {{ shortSha(nb.repoSha) }}
              </div>
              <div class="small text-break font-monospace">{{ nb.notebookPath }}</div>

              <div class="d-flex flex-wrap gap-2 mt-2">
                <button
                  v-for="launcher in nb.launchers"
                  :key="launcher"
                  type="button"
                  class="btn btn-sm btn-outline-secondary"
                  @click="launchNotebook(launcher, nb)"
                >
                  {{ launcherLabel(launcher) }}
                </button>
              </div>
            </div>

            <button
              v-if="capabilities.can_manage"
              class="btn btn-link px-0"
              type="button"
              @click="openNotebookModal"
            >
              + Add notebook
            </button>
          </div>
        </section>

        <section class="card">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="mb-0">Project documentation</h6>
              <button
                v-if="capabilities.can_manage"
                class="btn btn-sm btn-outline-secondary"
                type="button"
                @click="addDoc"
              >
                + New page
              </button>
            </div>

            <div v-if="project.docs.length === 0" class="text-muted small">No docs yet.</div>

            <ul class="list-group list-group-flush">
              <li v-for="doc in project.docs" :key="doc.id" class="list-group-item px-0 d-flex justify-content-between align-items-center">
                <RouterLink :to="{ name: 'docs', params: { slug: doc.slug } }" class="text-decoration-none">
                  {{ doc.title }}
                </RouterLink>
                <small class="text-muted">edited {{ relativeDate(doc.updatedAt) }}</small>
              </li>
            </ul>
          </div>
        </section>
      </div>

      <aside class="col-12 col-xl-5">
        <section class="card mb-3">
          <div class="card-body">
            <h6 class="mb-2">Collaborating organizations</h6>
            <div v-for="org in project.organizations" :key="org.id" class="d-flex gap-2 align-items-start mb-2">
              <span class="badge text-bg-light">{{ org.short }}</span>
              <div>
                <div class="fw-semibold">{{ org.name }}</div>
                <a
                  v-if="orgWebsiteHref(org)"
                  :href="orgWebsiteHref(org)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="small text-break d-inline-block"
                >
                  {{ orgLinkLabel(org) }}
                </a>
              </div>
            </div>
          </div>
        </section>

        <section class="card mb-3">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="mb-0">Members</h6>
              <button
                v-if="false"
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="openMembersModal"
              >
                Manage
              </button>
            </div>
            <div v-for="m in project.members" :key="m.id" class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div class="fw-semibold">{{ m.name }}</div>
                <small class="text-muted">{{ m.email || m.org }}</small>
              </div>
              <span class="badge text-bg-secondary">{{ m.role }}</span>
            </div>
          </div>
        </section>

        <section v-if="capabilities.can_issue_db_token || capabilities.can_manage" class="card mb-3">
          <div class="card-body">
            <h6 class="mb-2">Database access (Python / APIs)</h6>
            <p class="small text-muted mb-2">
              Issue a temporary access token for this project so scripts and notebooks can access project data
              without storing your database password.
              <span class="ms-1"><code class="small">Tokens expire after 2 days.</code></span>
            </p>
            <div v-if="lastIssuedToken" class="alert alert-warning small py-2 mb-2">
              <div class="fw-semibold mb-1">Copy this token now (shown once)</div>
              <code class="user-select-all d-block text-break">{{ lastIssuedToken }}</code>
              <button type="button" class="btn btn-sm btn-outline-dark mt-2" @click="copyText(lastIssuedToken)">Copy</button>
            </div>
            <div class="d-flex flex-wrap gap-2 mb-3">
              <button
                v-if="capabilities.can_issue_db_token"
                type="button"
                class="btn btn-sm btn-outline-primary"
                :disabled="tokenIssuing"
                @click="issueDbToken"
              >
                {{ tokenIssuing ? 'Issuing…' : 'Issue project token' }}
              </button>
            </div>
            <div v-if="capabilities.can_manage && dbTokens.length">
              <div class="small text-muted mb-1">Active &amp; past tokens</div>
              <ul class="list-group list-group-flush small">
                <li
                  v-for="t in dbTokens"
                  :key="t.id"
                  class="list-group-item px-0 d-flex justify-content-between align-items-start gap-2"
                >
                  <div>
                    <div>{{ t.email || t.name || 'User ' + t.user_id }}</div>
                    <div class="text-muted">
                      expires {{ formatShortDate(t.expires_at) }}
                      <span v-if="t.revoked_at"> · revoked</span>
                    </div>
                  </div>
                  <button
                    v-if="!t.revoked_at"
                    type="button"
                    class="btn btn-sm btn-outline-danger"
                    @click="revokeDbToken(t.id)"
                  >
                    Revoke
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section v-if="capabilities.can_manage" class="card mb-3">
          <div class="card-body">
            <h6 class="mb-2">Fine-grained ACL</h6>
            <p class="small text-muted mb-2">
              Optional rules on top of member roles. Empty list means only membership + roles apply.
            </p>
            <div class="acl-editor small mb-2">
              <div v-if="aclRules.length === 0" class="text-muted small">No ACL rules yet.</div>
              <div v-for="(rule, ridx) in aclRules" :key="ridx" class="acl-rule-card border rounded p-2 mb-2">
                <div class="row g-2">
                  <div class="col-6 col-md-3">
                    <label class="form-label small mb-0">Subject</label>
                    <select
                      v-model="rule.subject_type"
                      class="form-select form-select-sm"
                      @change="normalizeAclRuleSubject(rule)"
                    >
                      <option value="role">role</option>
                      <option value="user">user</option>
                    </select>
                  </div>
                  <div class="col-6 col-md-3">
                    <label class="form-label small mb-0">Subject key</label>
                    <select
                      v-if="rule.subject_type === 'role'"
                      v-model="rule.subject_key"
                      class="form-select form-select-sm"
                    >
                      <option value="owner">owner</option>
                      <option value="admin">admin</option>
                      <option value="editor">editor</option>
                      <option value="viewer">viewer</option>
                    </select>
                    <input
                      v-else
                      v-model="rule.subject_key"
                      class="form-control form-control-sm"
                      placeholder="user email"
                    />
                  </div>
                  <div class="col-6 col-md-3">
                    <label class="form-label small mb-0">Resource</label>
                    <select v-model="rule.resource_type" class="form-select form-select-sm">
                      <option value="project">project</option>
                      <option value="dataset">dataset</option>
                      <option value="doc">doc</option>
                      <option value="notebook">notebook</option>
                      <option value="derived_table">derived_table</option>
                    </select>
                  </div>
                  <div class="col-6 col-md-3">
                    <label class="form-label small mb-0">Resource key</label>
                    <input v-model="rule.resource_key" class="form-control form-control-sm" placeholder="optional id" />
                  </div>
                  <div class="col-6 col-md-4">
                    <label class="form-label small mb-0">Permission</label>
                    <select v-model="rule.permission" class="form-select form-select-sm">
                      <option value="view">view</option>
                      <option value="edit">edit</option>
                      <option value="manage_members">manage_members</option>
                      <option value="link_dataset">link_dataset</option>
                      <option value="create_derived">create_derived</option>
                      <option value="launch_notebook">launch_notebook</option>
                    </select>
                  </div>
                  <div class="col-6 col-md-3">
                    <label class="form-label small mb-0">Effect</label>
                    <select v-model="rule.effect" class="form-select form-select-sm">
                      <option value="allow">allow</option>
                      <option value="deny">deny</option>
                    </select>
                  </div>
                  <div class="col-12 col-md-5 d-flex align-items-end justify-content-end">
                    <button type="button" class="btn btn-sm btn-outline-danger" @click="removeAclRow(ridx)">Remove</button>
                  </div>
                </div>
              </div>
            </div>
            <div class="d-flex flex-wrap gap-2">
              <button type="button" class="btn btn-sm btn-outline-secondary" @click="addAclRow">+ Rule</button>
              <button type="button" class="btn btn-sm btn-primary" :disabled="aclSaving" @click="saveAclRules">
                {{ aclSaving ? 'Saving…' : 'Save ACL rules' }}
              </button>
            </div>
          </div>
        </section>

        <section class="card">
          <div class="card-body">
            <div class="d-flex align-items-center justify-content-between mb-2">
              <h6 class="mb-0">Datasets</h6>
            </div>

            <div v-if="linkedDatasets.length === 0" class="text-muted small">No datasets linked to this project.</div>

            <div v-for="d in linkedDatasets" :key="d.id" class="border rounded p-2 mb-2">
              <div class="fw-semibold">{{ d.name || d.id }}</div>
              <div class="small text-muted">{{ d.study_id || 'study n/a' }} · {{ d.version || 'v1.0.0' }}</div>
              <div class="small text-muted text-truncate" :title="d.description || ''">{{ d.description || 'No description' }}</div>
            </div>
          </div>
        </section>
      </aside>
    </div>

    <div class="modal fade" tabindex="-1" ref="notebookModalEl" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Add notebook link</h5>
            <button type="button" class="btn-close" @click="closeNotebookModal" aria-label="Close" />
          </div>
          <div class="modal-body">
            <div class="row g-3">
              <div class="col-md-8">
                <label class="form-label">Title</label>
                <input v-model="notebookForm.title" class="form-control" />
              </div>
              <div class="col-md-4">
                <label class="form-label">Purpose</label>
                <select v-model="notebookForm.purpose" class="form-select">
                  <option>exploration</option>
                  <option>preprocessing</option>
                  <option>analysis</option>
                  <option>visualization</option>
                  <option>report</option>
                </select>
              </div>
              <div class="col-12">
                <label class="form-label">Description</label>
                <input v-model="notebookForm.description" class="form-control" />
              </div>
              <div class="col-md-8">
                <label class="form-label">Repository URL</label>
                <input v-model="notebookForm.repoUrl" class="form-control font-monospace" placeholder="https://github.com/org/repo" />
              </div>
              <div class="col-md-4">
                <label class="form-label">Ref (branch/tag/sha)</label>
                <input v-model="notebookForm.repoRef" class="form-control font-monospace" placeholder="main" />
              </div>
              <div class="col-12">
                <label class="form-label">Notebook path</label>
                <input v-model="notebookForm.notebookPath" class="form-control font-monospace" placeholder="notebooks/hrv_analysis.ipynb" />
              </div>
              <div class="col-12">
                <label class="form-label d-block">Launchers</label>
                <div class="d-flex gap-3">
                  <label class="form-check-label"><input class="form-check-input me-1" type="checkbox" value="jupyter" v-model="notebookForm.launchers" />Jupyter</label>
                  <label class="form-check-label"><input class="form-check-input me-1" type="checkbox" value="rstudio" v-model="notebookForm.launchers" />RStudio</label>
                  <label class="form-check-label"><input class="form-check-input me-1" type="checkbox" value="vscode" v-model="notebookForm.launchers" />VSCode</label>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeNotebookModal">Cancel</button>
            <button type="button" class="btn btn-primary" :disabled="!canSaveNotebook" @click="saveNotebook">Save notebook</button>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" tabindex="-1" ref="membersModalEl" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Project members</h5>
            <button type="button" class="btn-close" @click="closeMembersModal" aria-label="Close" />
          </div>
          <div class="modal-body">
            <p class="small text-muted">
              At least one <strong>owner</strong> is required. Use account email addresses from your organization.
            </p>
            <div v-for="(row, idx) in memberRows" :key="idx" class="row g-2 align-items-end mb-2">
              <div class="col-md-6">
                <label class="form-label small mb-0">Email</label>
                <input v-model="row.email" type="email" class="form-control form-control-sm" placeholder="name@institution.org" />
              </div>
              <div class="col-md-4">
                <label class="form-label small mb-0">Role</label>
                <select v-model="row.role" class="form-select form-select-sm">
                  <option value="owner">owner</option>
                  <option value="admin">admin</option>
                  <option value="editor">editor</option>
                  <option value="viewer">viewer</option>
                </select>
              </div>
              <div class="col-md-2">
                <button type="button" class="btn btn-sm btn-outline-danger w-100" @click="removeMemberRow(idx)">Remove</button>
              </div>
            </div>
            <button type="button" class="btn btn-sm btn-outline-secondary" @click="addMemberRow">+ Add member</button>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" @click="closeMembersModal">Cancel</button>
            <button type="button" class="btn btn-primary" :disabled="membersSaving" @click="saveMembers">
              {{ membersSaving ? 'Saving…' : 'Save members' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { Modal } from 'bootstrap';
import { useRoute, useRouter } from 'vue-router';

import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

const route = useRoute();
const router = useRouter();

const id = computed(() => String(route.params.id || ''));
const availableDatasets = ref([]);

const capabilities = ref({
  can_manage: false,
  can_issue_db_token: false,
  auth_via_project_token: false
});
const loadError = ref('');

const dbTokens = ref([]);
const lastIssuedToken = ref('');
const tokenIssuing = ref(false);

const memberRows = ref([]);
const membersSaving = ref(false);
const membersModalEl = ref(null);
let membersModal = null;

const aclRules = ref([]);
const aclSaving = ref(false);

function requireBackendProject(actionLabel) {
  if (id.value) return true;
  window.alert(
    `${actionLabel} requires a valid project id or slug. Open a project from the Projects list first.`
  );
  return false;
}

const project = ref({
  id: '',
  name: 'Project',
  description: '',
  status: 'active',
  visibility: 'org-private',
  irbProtocolId: '',
  irbExpiryDate: '',
  notebooks: [],
  docs: [],
  members: [],
  organizations: [],
  linkedDatasetIds: [],
  launchers: {
    jupyterBaseUrl: '',
    rstudioBaseUrl: '',
    vscodeTemplate: 'vscode://file/{path}'
  }
});

const notebookForm = ref(newNotebookForm());

const notebookModalEl = ref(null);
let notebookModal = null;

const linkedDatasets = computed(() => {
  const lookup = new Map(availableDatasets.value.map(d => [String(d.id), d]));
  return (project.value.linkedDatasetIds || []).map((datasetId) => lookup.get(String(datasetId)) || {
    id: datasetId,
    name: datasetId,
    study_id: '',
    description: '',
    version: ''
  });
});

const canSaveNotebook = computed(() => {
  const f = notebookForm.value;
  return Boolean((f.title || '').trim() && (f.notebookPath || '').trim());
});

function newNotebookForm() {
  return {
    title: '',
    description: '',
    purpose: 'analysis',
    repoUrl: '',
    repoRef: 'main',
    notebookPath: '',
    launchers: ['jupyter', 'vscode']
  };
}

function seedProject() {
  const projectId = id.value || 'project';
  return {
    id: projectId,
    name: projectId,
    description: '',
    status: 'active',
    visibility: 'org-private',
    irbProtocolId: '',
    irbExpiryDate: '',
    notebooks: [],
    docs: [
      { id: `${Date.now()}-doc-1`, title: 'Project overview & objectives', slug: 'home', updatedAt: new Date().toISOString() }
    ],
    members: [
      { id: 'me', name: 'Current User', email: '', role: 'owner', org: 'Local workspace' }
    ],
    organizations: [],
    linkedDatasetIds: [],
    launchers: {
      jupyterBaseUrl: '',
      rstudioBaseUrl: '',
      vscodeTemplate: 'vscode://file/{path}'
    }
  };
}

function normalizeProject(raw) {
  const base = seedProject();
  if (!raw || typeof raw !== 'object') return base;
  return {
    ...base,
    ...raw,
    visibility: raw.visibility || base.visibility,
    notebooks: Array.isArray(raw.notebooks) ? raw.notebooks : base.notebooks,
    docs: Array.isArray(raw.docs) ? raw.docs : base.docs,
    members: Array.isArray(raw.members) ? raw.members : base.members,
    organizations: Array.isArray(raw.organizations) ? raw.organizations : base.organizations,
    linkedDatasetIds: Array.isArray(raw.linkedDatasetIds) ? raw.linkedDatasetIds.map(String) : [],
    launchers: {
      ...base.launchers,
      ...(raw.launchers || {})
    }
  };
}

function mapOverviewToProject(overview) {
  const base = seedProject();
  const p = overview?.project || {};
  return normalizeProject({
    ...base,
    id: p.id || base.id,
    name: p.name || base.name,
    description: p.description != null ? p.description : base.description,
    status: p.status || base.status,
    visibility: p.visibility || base.visibility,
    irbProtocolId: p.irb_protocol_id || '',
    irbExpiryDate: p.irb_expiry_date || '',
    members: Array.isArray(overview?.members)
      ? overview.members.map(m => ({
          id: m.user_id,
          name: m.name || m.email || String(m.user_id),
          email: m.email || '',
          role: m.role || 'viewer',
          org: m.user_role || ''
        }))
      : base.members,
    organizations: Array.isArray(overview?.organizations)
      ? overview.organizations.map((o, idx) => {
          const link =
            o.website_url != null && String(o.website_url).trim() !== ''
              ? String(o.website_url).trim()
              : o.url != null && String(o.url).trim() !== ''
                ? String(o.url).trim()
                : '';
          return {
            id: o.id || o.study_id || `study-${idx}`,
            short: o.short || String(o.study_id || '').slice(0, 4).toUpperCase() || 'ORG',
            name: o.name || o.study_name || o.study_id || 'Study',
            url: link
          };
        })
      : base.organizations,
    linkedDatasetIds: Array.isArray(overview?.datasets)
      ? overview.datasets.map(d => String(d.dataset_id || d.id || '')).filter(Boolean)
      : base.linkedDatasetIds,
    notebooks: Array.isArray(overview?.notebooks)
      ? overview.notebooks.map((n) => ({
          id: n.id,
          title: n.title || 'Notebook',
          description: n.description || '',
          purpose: n.purpose || 'analysis',
          repoUrl: n.repo_url || '',
          repoRef: n.repo_ref || 'main',
          repoSha: n.repo_ref || 'main',
          notebookPath: n.notebook_path || '',
          launchers: Array.isArray(n.launchers) ? n.launchers : ['jupyter']
        }))
      : base.notebooks,
    docs: Array.isArray(overview?.docs)
      ? overview.docs.map((d, i) => ({
          id: d.slug || `doc-${i}`,
          title: d.title || d.slug || 'Document',
          slug: d.slug || 'home',
          updatedAt: d.updated_at || d.linked_at || new Date().toISOString()
        }))
      : base.docs,
    launchers: {
      ...base.launchers,
      ...(typeof p.launchers === 'object' && p.launchers && !Array.isArray(p.launchers) ? p.launchers : {})
    }
  });
}

function syncAclRulesFromOverview(overview) {
  const rows = Array.isArray(overview?.acl_rules) ? overview.acl_rules : [];
  aclRules.value = rows.map((r) => ({
    subject_type: r.subject_type || 'role',
    subject_key: r.subject_key || '',
    resource_type: r.resource_type || 'project',
    resource_key: r.resource_key || '',
    permission: r.permission || 'view',
    effect: r.effect || 'allow'
  }));
}

async function loadProject() {
  try {
    const res = await api.get(`projects/${encodeURIComponent(id.value)}`, authHeaders());
    const caps = res.data?.capabilities;
    capabilities.value = {
      can_manage: Boolean(caps?.can_manage),
      can_issue_db_token: Boolean(caps?.can_issue_db_token),
      auth_via_project_token: Boolean(caps?.auth_via_project_token)
    };
    project.value = mapOverviewToProject(res.data);
    syncAclRulesFromOverview(res.data);
    if (capabilities.value.can_manage) {
      await loadDbTokens();
    } else {
      dbTokens.value = [];
    }
    loadError.value = '';
    return;
  } catch (e) {
    project.value = seedProject();
    aclRules.value = [];
    dbTokens.value = [];
    capabilities.value = {
      can_manage: false,
      can_issue_db_token: false,
      auth_via_project_token: false
    };
    loadError.value = e?.response?.data?.error || e?.message || 'Failed to load project from backend.';
  }
}

async function loadDatasets() {
  try {
    const res = await api.get('datasets', authHeaders());
    availableDatasets.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    availableDatasets.value = [];
  }
}

function shortSha(value) {
  return String(value || '').slice(0, 7) || '—';
}

/** Safe href for optional org website (adds https if scheme omitted). */
function orgWebsiteHref(org) {
  const raw = String(org?.url || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function orgLinkLabel(org) {
  const href = orgWebsiteHref(org);
  if (!href) return '';
  try {
    const u = new URL(href);
    return u.hostname.replace(/^www\./i, '') || href;
  } catch {
    return href.length > 56 ? `${href.slice(0, 53)}…` : href;
  }
}

function visibilityLabel(value) {
  const s = String(value || '');
  if (s === 'org-private') return 'Organization-private';
  if (s === 'project-private') return 'Project-private';
  if (s === 'internal') return 'Internal';
  return s || '—';
}

function formatShortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString();
}

function relativeDate(value) {
  const d = new Date(value || Date.now());
  const now = Date.now();
  const diff = Math.max(0, now - d.getTime());
  const day = 24 * 60 * 60 * 1000;
  if (diff < day) return 'today';
  const days = Math.round(diff / day);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

function launcherLabel(value) {
  if (value === 'rstudio') return 'RStudio';
  if (value === 'vscode') return 'VSCode';
  return 'Jupyter';
}

function encodePathForUrl(pathValue) {
  return String(pathValue || '')
    .split('/')
    .map(seg => encodeURIComponent(seg))
    .join('/');
}

function launchNotebook(launcher, notebook) {
  const p = String(notebook.notebookPath || '').trim();
  let url = '';

  if (launcher === 'jupyter') {
    const base = String(project.value.launchers.jupyterBaseUrl || '').trim();
    if (!base || !p) return;
    url = `${base.replace(/\/$/, '')}/lab/tree/${encodePathForUrl(p)}`;
  } else if (launcher === 'rstudio') {
    const base = String(project.value.launchers.rstudioBaseUrl || '').trim();
    if (!base || !p) return;
    url = `${base.replace(/\/$/, '')}/?file=${encodeURIComponent(p)}`;
  } else {
    const template = String(project.value.launchers.vscodeTemplate || '').trim();
    if (!template || !p) return;
    url = template
      .replace('{path}', encodeURIComponent(p))
      .replace('{repo_url}', encodeURIComponent(String(notebook.repoUrl || '')))
      .replace('{repo_ref}', encodeURIComponent(String(notebook.repoRef || 'main')));
  }

  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}

async function loadDbTokens() {
  if (!id.value) return;
  try {
    const res = await api.get(`projects/${encodeURIComponent(id.value)}/db-tokens`, authHeaders());
    dbTokens.value = Array.isArray(res.data) ? res.data : [];
  } catch {
    dbTokens.value = [];
  }
}

async function issueDbToken() {
  if (!requireBackendProject('Issue project token')) return;
  tokenIssuing.value = true;
  lastIssuedToken.value = '';
  try {
    const res = await api.post(`projects/${encodeURIComponent(id.value)}/db-token`, { days: 2 }, authHeaders());
    lastIssuedToken.value = res.data?.token || '';
    await loadDbTokens();
  } catch (e) {
    console.error(e);
    window.alert(e.response?.data?.error || e.message || 'Could not issue token');
  } finally {
    tokenIssuing.value = false;
  }
}

async function revokeDbToken(tokenId) {
  if (!tokenId) return;
  if (!requireBackendProject('Revoke token')) return;
  if (!window.confirm('Revoke this token? Jobs using it will lose access.')) return;
  try {
    await api.delete(
      `projects/${encodeURIComponent(id.value)}/db-tokens/${encodeURIComponent(tokenId)}`,
      authHeaders()
    );
    await loadDbTokens();
  } catch (e) {
    window.alert(e.response?.data?.error || e.message || 'Revoke failed');
  }
}

function copyText(text) {
  if (!text || !navigator.clipboard) return;
  navigator.clipboard.writeText(text).catch(() => {});
}

function openMembersModal() {
  memberRows.value = (project.value.members || []).map((m) => ({
    email: m.email || '',
    role: m.role || 'viewer'
  }));
  if (!memberRows.value.length) {
    memberRows.value.push({ email: '', role: 'viewer' });
  }
  membersModal?.show();
}

function closeMembersModal() {
  membersModal?.hide();
}

function addMemberRow() {
  memberRows.value.push({ email: '', role: 'viewer' });
}

function removeMemberRow(idx) {
  memberRows.value.splice(idx, 1);
}

async function saveMembers() {
  if (!requireBackendProject('Save members')) return;
  membersSaving.value = true;
  try {
    await api.put(
      `projects/${encodeURIComponent(id.value)}/members`,
      {
        members: memberRows.value
          .filter((r) => String(r.email || '').trim())
          .map((r) => ({ email: String(r.email).trim(), role: r.role }))
      },
      authHeaders()
    );
    await loadProject();
    closeMembersModal();
  } catch (e) {
    window.alert(e.response?.data?.error || e.message || 'Failed to save members');
  } finally {
    membersSaving.value = false;
  }
}

function addAclRow() {
  aclRules.value.push({
    subject_type: 'role',
    subject_key: 'viewer',
    resource_type: 'project',
    resource_key: '',
    permission: 'view',
    effect: 'allow'
  });
}

function normalizeAclRuleSubject(rule) {
  if (!rule || typeof rule !== 'object') return;
  if (rule.subject_type === 'role') {
    const allowed = new Set(['owner', 'admin', 'editor', 'viewer']);
    if (!allowed.has(String(rule.subject_key || ''))) {
      rule.subject_key = 'viewer';
    }
  } else if (rule.subject_type === 'user') {
    if (['owner', 'admin', 'editor', 'viewer'].includes(String(rule.subject_key || ''))) {
      rule.subject_key = '';
    }
  }
}

function removeAclRow(idx) {
  aclRules.value.splice(idx, 1);
}

async function saveAclRules() {
  if (!requireBackendProject('Save ACL rules')) return;
  aclSaving.value = true;
  try {
    const res = await api.put(
      `projects/${encodeURIComponent(id.value)}/acl`,
      {
        rules: aclRules.value.map((r) => ({
          subject_type: r.subject_type,
          subject_key: String(r.subject_key || '').trim(),
          resource_type: r.resource_type,
          resource_key: String(r.resource_key || '').trim() || null,
          permission: r.permission,
          effect: r.effect || 'allow'
        }))
      },
      authHeaders()
    );
    aclRules.value = Array.isArray(res.data)
      ? res.data.map((r) => ({
          subject_type: r.subject_type,
          subject_key: r.subject_key || '',
          resource_type: r.resource_type,
          resource_key: r.resource_key || '',
          permission: r.permission,
          effect: r.effect || 'allow'
        }))
      : [];
    await loadProject();
  } catch (e) {
    window.alert(e.response?.data?.error || e.message || 'Failed to save ACL rules');
  } finally {
    aclSaving.value = false;
  }
}

function serializeNotebooksForApi(notebooks) {
  return (notebooks || []).map((n) => ({
    title: n.title,
    description: n.description || null,
    purpose: n.purpose || 'analysis',
    repo_url: n.repoUrl || null,
    repo_ref: n.repoRef || null,
    notebook_path: n.notebookPath,
    runtime_type: 'jupyter',
    launchers: Array.isArray(n.launchers) && n.launchers.length ? n.launchers : ['jupyter']
  }));
}

function openNotebookModal() {
  notebookForm.value = newNotebookForm();
  notebookModal?.show();
}

function closeNotebookModal() {
  notebookModal?.hide();
}

async function saveNotebook() {
  if (!canSaveNotebook.value) return;
  const now = Date.now();
  const entry = {
    id: `${now}-nb`,
    title: notebookForm.value.title.trim(),
    description: notebookForm.value.description.trim(),
    purpose: notebookForm.value.purpose,
    repoUrl: notebookForm.value.repoUrl.trim(),
    repoRef: notebookForm.value.repoRef.trim() || 'main',
    repoSha: notebookForm.value.repoRef.trim() || 'main',
    notebookPath: notebookForm.value.notebookPath.trim(),
    launchers: notebookForm.value.launchers.length ? [...notebookForm.value.launchers] : ['jupyter']
  };

  const previous = project.value.notebooks;
  project.value.notebooks = [entry, ...previous];

  if (!id.value) {
    window.alert('This is not a valid project route. Open a project from the Projects list.');
    closeNotebookModal();
    return;
  }

  try {
    await api.put(
      `projects/${encodeURIComponent(id.value)}/notebooks`,
      { notebooks: serializeNotebooksForApi(project.value.notebooks) },
      authHeaders()
    );
    closeNotebookModal();
    await loadProject();
  } catch (e) {
    project.value.notebooks = previous;
    console.error(e);
    window.alert(e.response?.data?.error || e.message || 'Failed to save notebook.');
  }
}

function addDoc() {
  router.push({ name: 'docNew' });
}

onMounted(async () => {
  document.title = `${APP_NAME} Project`;
  if (!id.value) {
    router.replace({ name: 'projects' });
    return;
  }

  await loadProject();
  await loadDatasets();

  if (notebookModalEl.value) notebookModal = new Modal(notebookModalEl.value);
  if (membersModalEl.value) membersModal = new Modal(membersModalEl.value);
});
</script>

<style scoped>
.project-hub .card {
  border-radius: 0.75rem;
}

.dataset-picker {
  max-height: 260px;
  overflow: auto;
}

.acl-editor {
  max-height: 280px;
  overflow: auto;
}

.acl-rule-card {
  background: rgba(0, 0, 0, 0.02);
}

@media (max-width: 1199.98px) {
  aside {
    order: 2;
  }
}
</style>
