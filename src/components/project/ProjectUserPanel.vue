<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';
import { projectMemberUiValue } from '@/utils/roles';
import ProjectDocsCard from '@/components/project/ProjectDocsCard.vue';
import ProjectDatasetMasterDetail from '@/components/project/ProjectDatasetMasterDetail.vue';

const props = defineProps({
  projectId: { type: String, default: '' },
  name: { type: String, default: '' },
  description: { type: String, default: '' },
  status: { type: String, default: 'active' },
  teamLabel: { type: String, default: '' },
  createdByLabel: { type: String, default: '' },
  createdAtLabel: { type: String, default: '' },
  members: { type: Array, default: () => [] },
  datasets: { type: Array, default: () => [] },
  pages: { type: Array, default: () => [] },
  canEditPages: { type: Boolean, default: false },
});

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const showKey = ref(false);
const apiKeyPlain = ref('');
const apiKeyMeta = ref(null);
const keyBusy = ref(false);
const keyError = ref('');
const keyJustRotated = ref(false);
const passwordModal = ref({
  open: false,
  action: null, // 'reveal' | 'rotate'
  password: '',
  showPassword: false,
  error: '',
});
let revealTimer = null;

const apiEndpoint = computed(() => {
  const base = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return base || 'API endpoint not configured';
});

const jupyterEnabled = computed(() => {
  const url = String(import.meta.env.VITE_JUPYTER_URL || '').trim();
  return Boolean(url);
});

const jupyterUrl = computed(() => String(import.meta.env.VITE_JUPYTER_URL || '').trim());

function memberDisplayName(row) {
  const name = String(row?.name || '').trim();
  const email = String(row?.email || '').trim();
  if (name && (!email || name.toLowerCase() !== email.toLowerCase())) return name;
  return email || name || 'Unknown';
}

const sortedMembers = computed(() =>
  [...props.members].sort((a, b) => {
    const ao = projectMemberUiValue(a.role) === 'owner' ? 0 : 1;
    const bo = projectMemberUiValue(b.role) === 'owner' ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return memberDisplayName(a).localeCompare(memberDisplayName(b));
  })
);

const admins = computed(() =>
  sortedMembers.value.filter((m) => projectMemberUiValue(m.role) === 'owner')
);

const hasCredential = computed(
  () =>
    Boolean(apiKeyMeta.value?.active) ||
    Boolean(apiKeyMeta.value?.api_key_prefix) ||
    Boolean(apiKeyPlain.value)
);

/** Full key only after password step-up reveal/rotate. Always masked by default. */
const displayedKey = computed(() => {
  if (showKey.value && apiKeyPlain.value) return apiKeyPlain.value;
  if (hasCredential.value) return '••••••••••••••••••••••••••';
  return 'No API key yet';
});

const passwordModalTitle = computed(() =>
  passwordModal.value.action === 'rotate'
    ? 'Confirm password to rotate credential'
    : 'Confirm password to show credential'
);

function clearRevealTimer() {
  if (revealTimer) {
    clearTimeout(revealTimer);
    revealTimer = null;
  }
}

function hideKey() {
  showKey.value = false;
  clearRevealTimer();
}

function revealKeyTemporarily() {
  if (!apiKeyPlain.value) return;
  showKey.value = true;
  clearRevealTimer();
  revealTimer = setTimeout(() => {
    hideKey();
  }, 30000);
}

function openPasswordModal(action) {
  keyError.value = '';
  passwordModal.value = {
    open: true,
    action,
    password: '',
    showPassword: false,
    error: '',
  };
}

function closePasswordModal() {
  passwordModal.value = {
    open: false,
    action: null,
    password: '',
    showPassword: false,
    error: '',
  };
}

function onShowClick() {
  if (showKey.value) {
    hideKey();
    return;
  }
  openPasswordModal('reveal');
}

function onRotateClick() {
  openPasswordModal('rotate');
}

async function loadApiKeyMeta() {
  try {
    const res = await api.get('users/me/api-key', authHeaders());
    apiKeyMeta.value = res.data || null;
  } catch {
    apiKeyMeta.value = null;
  }
}

async function copyText(value) {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    /* ignore */
  }
}

async function copyKey() {
  if (!apiKeyPlain.value || !showKey.value) return;
  await copyText(apiKeyPlain.value);
}

async function submitPasswordModal() {
  const password = String(passwordModal.value.password || '');
  if (!password) {
    passwordModal.value.error = 'Password is required.';
    return;
  }
  keyBusy.value = true;
  passwordModal.value.error = '';
  keyError.value = '';
  try {
    if (passwordModal.value.action === 'rotate') {
      const res = await api.post('users/me/api-key', { password }, authHeaders());
      apiKeyPlain.value = res.data?.api_key || '';
      keyJustRotated.value = true;
      // Do not leave plaintext in the user store / localStorage.
      if (user.value?.api_key) {
        await userStore.setUser({ ...user.value, api_key: undefined });
      }
      closePasswordModal();
      revealKeyTemporarily();
      await loadApiKeyMeta();
    } else {
      const res = await api.post('users/me/api-key/reveal', { password }, authHeaders());
      apiKeyPlain.value = res.data?.api_key || '';
      keyJustRotated.value = false;
      closePasswordModal();
      revealKeyTemporarily();
      await loadApiKeyMeta();
    }
  } catch (error) {
    const msg = error.response?.data?.error || error.message || 'Request failed.';
    passwordModal.value.error = msg;
    if (error.response?.status === 409) {
      keyError.value = msg;
    }
  } finally {
    keyBusy.value = false;
  }
}

onMounted(() => {
  // Never auto-load plaintext into the field; require password step-up.
  apiKeyPlain.value = '';
  showKey.value = false;
  loadApiKeyMeta();
});

onBeforeUnmount(() => clearRevealTimer());
</script>

<template>
  <div>
    <!-- 1. Project identity -->
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div class="min-w-0">
        <h4 class="mb-1">{{ name || 'Project' }}</h4>
        <p v-if="description" class="text-muted mb-2">{{ description }}</p>
        <p v-else class="text-muted small mb-2">No description.</p>
        <div class="d-flex flex-wrap align-items-center gap-3 small">
          <span>
            <span class="text-muted">Status</span>
            <span class="badge text-bg-success ms-1">{{ status }}</span>
          </span>
          <span v-if="teamLabel">
            <span class="text-muted">Team</span>
            <span class="ms-1">{{ teamLabel }}</span>
          </span>
          <span v-if="createdByLabel">
            <span class="text-muted">Created by</span>
            <span class="ms-1">
              {{ createdByLabel }}
              <template v-if="createdAtLabel"> · {{ createdAtLabel }}</template>
            </span>
          </span>
        </div>
      </div>
    </div>

    <!-- 2. Dataset master-detail -->
    <div class="mb-3">
      <ProjectDatasetMasterDetail :datasets="datasets" />
    </div>

    <!-- 3. Project docs | Analysis access | Managed JupyterLab -->
    <div class="row g-3 mb-3">
      <div class="col-12 col-lg-4">
        <ProjectDocsCard
          v-if="projectId"
          :project-id="projectId"
          :can-edit="canEditPages"
          :initial-pages="pages"
          landing
        />
      </div>

      <div class="col-12 col-lg-4">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-2">Analysis access</h5>
          <p class="small text-muted mb-3">
            Use local Jupyter, R/RStudio, VS Code, institutional compute, or your own hardware.
            Clients talk to the HTTPS API — not database ports.
          </p>

          <div class="mb-3">
            <div class="small fw-semibold mb-1">API endpoint</div>
            <div class="input-group input-group-sm">
              <input class="form-control font-monospace" type="text" :value="apiEndpoint" readonly />
              <button
                type="button"
                class="btn btn-outline-secondary"
                title="Copy"
                @click="copyText(apiEndpoint)"
              >
                Copy
              </button>
            </div>
          </div>

          <div class="mb-3">
            <div class="small fw-semibold mb-1">Personal API credential</div>
            <div class="input-group input-group-sm">
              <input class="form-control font-monospace" type="text" :value="displayedKey" readonly />
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="keyBusy || (!hasCredential && !showKey)"
                :title="showKey ? 'Hide' : 'Re-enter password to show'"
                @click="onShowClick"
              >
                {{ showKey ? 'Hide' : 'Show' }}
              </button>
              <button
                type="button"
                class="btn btn-outline-secondary"
                :disabled="!showKey || !apiKeyPlain"
                title="Copy"
                @click="copyKey"
              >
                Copy
              </button>
            </div>
            <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-2">
              <small class="text-muted">
                <template v-if="hasCredential">Credential on file · password required to show or rotate</template>
                <template v-else>Generate a credential to call the API</template>
              </small>
              <button
                type="button"
                class="btn btn-sm btn-outline-primary"
                :disabled="keyBusy"
                @click="onRotateClick"
              >
                <span v-if="keyBusy" class="spinner-border spinner-border-sm me-1" />
                {{ hasCredential ? 'Rotate credential' : 'Generate credential' }}
              </button>
            </div>
            <div v-if="keyJustRotated && showKey" class="alert alert-warning py-2 small mt-2 mb-0">
              Copy this credential now — it hides automatically after 30 seconds.
            </div>
            <div v-if="keyError" class="text-danger small mt-2">{{ keyError }}</div>
          </div>

          <div class="alert alert-warning py-2 small">
            <strong>Keep this credential private.</strong>
            Never put it in source code, repositories, or notebooks you share.
            Use environment variables or an approved secrets manager.
          </div>

          <div class="mt-auto pt-2">
            <router-link
              :to="{ name: 'docs', params: { slug: 'quick-start' } }"
              class="small text-decoration-none"
            >
              Setup instructions &amp; code examples →
            </router-link>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-4">
        <div class="card p-3 h-100">
          <h5 class="card-title mb-2">Managed JupyterLab</h5>
          <template v-if="jupyterEnabled">
            <p class="small text-muted mb-3">
              Optional hosted notebook environment for this deployment. Not required to use the API.
            </p>
            <a
              class="btn btn-primary"
              :href="jupyterUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open JupyterLab
              <i class="bi bi-box-arrow-up-right ms-1" aria-hidden="true"></i>
            </a>
          </template>
          <template v-else>
            <p class="small text-muted mb-3">
              Hosted JupyterLab is not enabled for this deployment. Use the Analysis access card
              and setup instructions to connect from your own environment.
            </p>
            <button type="button" class="btn btn-outline-secondary" disabled>
              JupyterLab unavailable
            </button>
            <div class="mt-auto pt-3">
              <router-link
                :to="{ name: 'docs', params: { slug: 'quick-start' } }"
                class="small text-decoration-none"
              >
                External analysis setup →
              </router-link>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 4. People -->
    <div class="card p-3">
      <h5 class="card-title mb-2">People</h5>
      <p class="small text-muted mb-3">
        Contact an <strong>Admin</strong> to ingest tables or change who is on the project.
        You can run analytics on datasets that already have tables.
      </p>

      <div v-if="admins.length === 0" class="small text-muted">No admins listed yet.</div>
      <div v-else>
        <div class="small text-muted text-uppercase mb-2">Admins</div>
        <ul class="list-unstyled mb-0">
          <li
            v-for="row in admins"
            :key="row.user_id"
            class="d-flex justify-content-between align-items-start gap-2 py-2 border-bottom"
          >
            <div class="min-w-0">
              <div class="fw-semibold">{{ memberDisplayName(row) }}</div>
              <a v-if="row.email" class="small" :href="`mailto:${row.email}`">{{ row.email }}</a>
            </div>
          </li>
        </ul>
      </div>
    </div>

    <div
      v-if="passwordModal.open"
      class="modal fade show d-block"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      style="background: rgba(0, 0, 0, 0.45)"
      @keydown.esc.prevent="closePasswordModal"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <form @submit.prevent="submitPasswordModal">
            <div class="modal-header">
              <h5 class="modal-title">{{ passwordModalTitle }}</h5>
              <button type="button" class="btn-close" aria-label="Close" @click="closePasswordModal" />
            </div>
            <div class="modal-body">
              <p class="small text-muted mb-3">
                For security, re-enter your account password to
                {{ passwordModal.action === 'rotate' ? 'generate or rotate' : 'view' }}
                your API credential.
              </p>
              <label class="form-label" for="api-key-stepup-password">Password</label>
              <div class="position-relative">
                <input
                  id="api-key-stepup-password"
                  v-model="passwordModal.password"
                  :type="passwordModal.showPassword ? 'text' : 'password'"
                  class="form-control pe-5"
                  autocomplete="current-password"
                  autofocus
                  :disabled="keyBusy"
                />
                <button
                  type="button"
                  class="btn-eye-toggle"
                  :aria-label="passwordModal.showPassword ? 'Hide password' : 'Show password'"
                  :title="passwordModal.showPassword ? 'Hide password' : 'Show password'"
                  tabindex="-1"
                  @click="passwordModal.showPassword = !passwordModal.showPassword"
                >
                  <i :class="passwordModal.showPassword ? 'bi bi-eye-slash' : 'bi bi-eye'" />
                </button>
              </div>
              <div v-if="passwordModal.error" class="text-danger small mt-2">{{ passwordModal.error }}</div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-outline-secondary" :disabled="keyBusy" @click="closePasswordModal">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="keyBusy || !passwordModal.password">
                <span v-if="keyBusy" class="spinner-border spinner-border-sm me-1" />
                Confirm
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn-eye-toggle {
  position: absolute;
  inset: 0 0 0 auto;
  z-index: 3;
  display: flex;
  align-items: center;
  padding: 0 0.85rem;
  color: var(--bs-secondary-color);
  background: transparent;
  border: 0;
}

.btn-eye-toggle:hover {
  color: inherit;
}
</style>
