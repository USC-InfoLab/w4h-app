<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { storeToRefs } from 'pinia';
import { Modal } from 'bootstrap';
import { api, authHeaders } from '@/utils/api';
import { useUserStore } from '@/stores/user';

// Personal API credential (masked by default; password step-up to show or rotate; auto-hide).
// Used by Profile → API keys and ProjectUserPanel.

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const showKey = ref(false);
const apiKeyPlain = ref('');
const apiKeyMeta = ref(null);
const keyBusy = ref(false);
const keyError = ref('');
const keyJustRotated = ref(false);
// Set when the credential status could not be loaded: never offer Generate (it rotates a working key).
const metaError = ref('');
const passwordModal = ref({
  action: null, // 'reveal' | 'rotate'
  password: '',
  showPassword: false,
  error: '',
});
const passwordModalEl = ref(null);
const passwordInputEl = ref(null);
let passwordModalInstance = null;
let modalTrigger = null; // Bootstrap restores focus only for data-bs-toggle triggers
let revealTimer = null;

const apiEndpoint = computed(() => {
  const base = String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  return base || 'API endpoint not configured';
});

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
  if (metaError.value) return 'Credential status unknown';
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
  apiKeyPlain.value = '';
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

function resetPasswordModal() {
  passwordModal.value = {
    action: null,
    password: '',
    showPassword: false,
    error: '',
  };
}

function openPasswordModal(action) {
  keyError.value = '';
  resetPasswordModal();
  passwordModal.value.action = action;
  modalTrigger = document.activeElement;
  passwordModalInstance?.show();
}

function closePasswordModal() {
  passwordModalInstance?.hide();
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
    metaError.value = '';
  } catch (error) {
    apiKeyMeta.value = null;
    metaError.value = `Couldn't load your credential status: ${error.response?.data?.error || error.message}. `
      + 'Reload to try again.';
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
    } else {
      const res = await api.post('users/me/api-key/reveal', { password }, authHeaders());
      apiKeyPlain.value = res.data?.api_key || '';
      keyJustRotated.value = false;
    }
    if (!apiKeyPlain.value) {
      passwordModal.value.error = 'The server did not return a credential.';
      return;
    }
    closePasswordModal();
    revealKeyTemporarily();
    // Do not leave plaintext in the user store / localStorage (the old key is already dead).
    if (keyJustRotated.value && user.value?.api_key) {
      userStore.setUser({ ...user.value, api_key: undefined }).catch((err) => console.error(err));
    }
    await loadApiKeyMeta();
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

function onModalShown() {
  passwordInputEl.value?.focus();
}

function onModalHidden() {
  resetPasswordModal();
  modalTrigger?.focus?.();
  modalTrigger = null;
}

onMounted(() => {
  // Never auto-load plaintext into the field; require password step-up.
  apiKeyPlain.value = '';
  showKey.value = false;
  if (passwordModalEl.value) {
    passwordModalInstance = new Modal(passwordModalEl.value);
    passwordModalEl.value.addEventListener('shown.bs.modal', onModalShown);
    passwordModalEl.value.addEventListener('hidden.bs.modal', onModalHidden);
  }
  loadApiKeyMeta();
});

onBeforeUnmount(() => {
  clearRevealTimer();
  passwordModalEl.value?.removeEventListener('shown.bs.modal', onModalShown);
  passwordModalEl.value?.removeEventListener('hidden.bs.modal', onModalHidden);
  passwordModalInstance?.dispose();
  passwordModalInstance = null;
});
</script>

<template>
  <div>
    <div class="mb-3">
      <div class="small fw-semibold mb-1">API endpoint</div>
      <div class="input-group input-group-sm">
        <input class="form-control font-monospace" type="text" :value="apiEndpoint" readonly
          aria-label="API endpoint" />
        <button type="button" class="btn btn-outline-secondary" title="Copy" @click="copyText(apiEndpoint)">
          Copy
        </button>
      </div>
    </div>

    <div class="mb-3">
      <div class="small fw-semibold mb-1">Personal API credential</div>
      <div class="input-group input-group-sm">
        <input class="form-control font-monospace" type="text" :value="displayedKey" readonly
          aria-label="Personal API credential" />
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
          :disabled="keyBusy || !!metaError"
          @click="onRotateClick"
        >
          <span v-if="keyBusy" class="spinner-border spinner-border-sm me-1" />
          {{ hasCredential ? 'Rotate credential' : 'Generate credential' }}
        </button>
      </div>
      <div v-if="showKey" class="alert alert-warning py-2 small mt-2 mb-0" role="status">
        <template v-if="keyJustRotated">Your previous credential no longer works; restart open Jupyter kernels to use the new one. </template>
        Copy this credential now — it hides automatically after 30 seconds.
      </div>
      <div v-if="keyError" class="text-danger small mt-2" role="alert">{{ keyError }}</div>
      <div v-if="metaError" class="text-danger small mt-2" role="alert">{{ metaError }}</div>
    </div>

    <div class="alert alert-warning py-2 small mb-0">
      <strong>Keep this credential private.</strong>
      Never put it in source code, repositories, or notebooks you share.
      Use environment variables or an approved secrets manager.
    </div>

    <div
      ref="passwordModalEl"
      class="modal fade"
      tabindex="-1"
      aria-labelledby="api-key-stepup-title"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <form @submit.prevent="submitPasswordModal">
            <div class="modal-header">
              <h5 id="api-key-stepup-title" class="modal-title">{{ passwordModalTitle }}</h5>
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
                  ref="passwordInputEl"
                  v-model="passwordModal.password"
                  :type="passwordModal.showPassword ? 'text' : 'password'"
                  class="form-control pe-5"
                  autocomplete="current-password"
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
              <div v-if="passwordModal.error" class="text-danger small mt-2" role="alert">
                {{ passwordModal.error }}
              </div>
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
