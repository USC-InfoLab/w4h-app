<template>
  <div class="card p-3">
    <h5 class="card-title mb-1">PHI-safe AI chat</h5>
    <p class="text-muted small mb-3">
      Chat for this lab uses the <strong>team Anthropic key</strong> when one is saved (the lab pays Anthropic).
      Otherwise every member draws <strong>platform credits</strong> until the monthly token quota is reached.
    </p>

    <div v-if="loading" class="text-muted">Loading AI settings…</div>
    <div v-else>
      <div v-if="usage" class="border rounded p-3 mb-3">
        <div class="d-flex flex-wrap justify-content-between align-items-baseline gap-2 mb-2">
          <div>
            <div class="small text-muted text-uppercase fw-semibold">This month</div>
            <div v-if="usage.has_key">
              Team key ({{ usage.key_prefix }}) ·
              <strong>{{ formatTokens(usage.team_key_used) }}</strong> tokens
              <span class="text-muted"> · not drawing platform credits</span>
            </div>
            <div v-else>
              Platform credits:
              <strong>{{ formatTokens(credits.used) }}</strong>
              <template v-if="credits.limit != null">
                / {{ formatTokens(credits.limit) }} tokens
              </template>
              <span v-else class="text-muted"> · unlimited</span>
            </div>
          </div>
          <div v-if="!usage.has_key && creditPct != null" class="small text-muted">{{ creditPct }}% used</div>
        </div>
        <div
          v-if="!usage.has_key && credits.limit != null"
          class="progress mb-0"
          style="height: 10px;"
          role="progressbar"
          :aria-valuenow="creditPct ?? 0"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="progress-bar" :class="creditBarClass" :style="{ width: `${Math.min(100, creditPct ?? 0)}%` }" />
        </div>
        <p class="small text-muted mb-0 mt-2">
          Usage includes every team member’s chat on this lab.
        </p>
      </div>

      <div class="mb-3">
        <label class="form-label">PHI filter</label>
        <select v-model="form.ai_phi_filter" class="form-select" :disabled="!canEdit">
          <option value="strict">PHI-safe (strict) — default</option>
          <option value="permissive">Permissive (confirm paste; still no bulk rows)</option>
        </select>
      </div>

      <div class="mb-3">
        <AiSecretKeyField
          :key="keyFieldNonce"
          v-model="form.anthropic_api_key"
          v-model:clear="form.clear_key"
          :has-key="!!settings?.has_key"
          :key-prefix="settings?.key_prefix || ''"
          :disabled="!canEdit"
          :clearable="canEdit"
          label="Lab Anthropic API key"
          empty-help="Paste a key from the Anthropic Console. All members of this lab share it for chat. It is stored encrypted and never shown in full."
        />
      </div>

      <div v-if="isSuper" class="mb-3">
        <label class="form-label">Monthly platform-credit quota</label>
        <input
          v-model.number="form.monthly_token_quota"
          type="number"
          min="0"
          class="form-control"
          placeholder="Leave blank for platform default"
        />
        <div class="form-text">Applies only while this lab uses platform credits, not a team key.</div>
      </div>
      <p v-else class="small text-muted">
        Platform-credit quota:
        {{ settings?.monthly_token_quota ?? 'platform default' }} tokens
        (only Super admin can raise this).
      </p>

      <div v-if="message" class="alert" :class="ok ? 'alert-success' : 'alert-danger'">{{ message }}</div>
      <div v-if="canEdit" class="d-flex justify-content-end mb-3">
        <button class="btn btn-primary" :disabled="saving" type="button" @click="save">
          Save AI settings
        </button>
      </div>

      <h6 class="mt-2">By team member (this month)</h6>
      <div v-if="!members.length" class="text-muted small">No members yet.</div>
      <div v-else class="table-responsive">
        <table class="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Member</th>
              <th>Role</th>
              <th class="text-end">Calls</th>
              <th class="text-end">Tokens</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in members" :key="row.user_id">
              <td>
                <div>{{ row.name || row.email }}</div>
                <div class="small text-muted">{{ row.email }}</div>
              </td>
              <td>{{ row.role === 'team_admin' ? 'Admin' : 'User' }}</td>
              <td class="text-end">{{ row.calls }}</td>
              <td class="text-end">{{ formatTokens(row.tokens) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { api, authHeaders } from '@/utils/api';
import { isSuperAdmin } from '@/utils/roles';
import { useUserStore } from '@/stores/user';
import AiSecretKeyField from '@/components/AiSecretKeyField.vue';

const props = defineProps({
  teamId: { type: String, required: true },
  canEdit: { type: Boolean, default: false },
});

const emit = defineEmits(['saved']);

const userStore = useUserStore();
const isSuper = computed(() => isSuperAdmin(userStore.user?.role));
const loading = ref(true);
const saving = ref(false);
const settings = ref(null);
const usage = ref(null);
const message = ref('');
const ok = ref(false);
const keyFieldNonce = ref(0);
const form = reactive({
  ai_phi_filter: 'strict',
  anthropic_api_key: '',
  clear_key: false,
  monthly_token_quota: null,
});

const members = computed(() => usage.value?.members || []);
const credits = computed(() => usage.value?.platform_credits || { used: 0, limit: null, remaining: null });
const creditPct = computed(() => {
  const limit = credits.value.limit;
  if (limit == null || Number(limit) <= 0) return null;
  return Math.round((Number(credits.value.used || 0) / Number(limit)) * 100);
});
const creditBarClass = computed(() => {
  const p = creditPct.value;
  if (p == null) return 'bg-primary';
  if (p >= 90) return 'bg-danger';
  if (p >= 70) return 'bg-warning';
  return 'bg-primary';
});

function formatTokens(n) {
  const v = Number(n) || 0;
  return v.toLocaleString();
}

function applyPayload(data) {
  settings.value = data;
  usage.value = data.usage || null;
  form.ai_phi_filter = data.ai_phi_filter || 'strict';
  form.anthropic_api_key = '';
  form.clear_key = false;
  form.monthly_token_quota = data.quota_is_override ? data.monthly_token_quota : null;
  keyFieldNonce.value += 1;
}

async function load() {
  loading.value = true;
  try {
    const res = await api.get(`ai/settings/team/${props.teamId}`, authHeaders());
    applyPayload(res.data);
  } catch (e) {
    settings.value = null;
    usage.value = null;
    message.value = e.response?.data?.error || 'Could not load AI settings.';
    ok.value = false;
  } finally {
    loading.value = false;
  }
}

async function save() {
  saving.value = true;
  message.value = '';
  try {
    const payload = {
      ai_phi_filter: form.ai_phi_filter,
    };
    if (form.clear_key) payload.clear_anthropic_api_key = true;
    else if (form.anthropic_api_key.trim()) payload.anthropic_api_key = form.anthropic_api_key.trim();
    if (isSuper.value) {
      payload.monthly_token_quota = form.monthly_token_quota === '' || form.monthly_token_quota == null
        ? null
        : Number(form.monthly_token_quota);
    }
    await api.patch(`ai/settings/team/${props.teamId}`, payload, authHeaders());
    const res = await api.get(`ai/settings/team/${props.teamId}`, authHeaders());
    applyPayload(res.data);
    ok.value = true;
    message.value = 'AI settings saved.';
    emit('saved');
  } catch (e) {
    ok.value = false;
    message.value = e.response?.data?.error || 'Failed to save AI settings.';
  } finally {
    saving.value = false;
  }
}

onMounted(load);
watch(() => props.teamId, load);
</script>
