<template>
  <div class="phi-chat d-flex flex-column h-100">
    <div class="phi-chat-meta flex-shrink-0 px-3 pt-2 pb-1">
      <div class="d-flex align-items-center gap-2 flex-wrap">
        <span
          class="badge"
          :class="phiSafe ? 'text-bg-success' : 'text-bg-warning'"
        >{{ phiSafe ? 'PHI-safe' : 'Permissive' }}</span>
        <div class="btn-group btn-group-sm" role="group" aria-label="Chat mode">
          <button
            v-for="m in modes"
            :key="m.id"
            type="button"
            class="btn"
            :class="mode === m.id ? 'btn-primary' : 'btn-outline-secondary'"
            :title="m.hint"
            @click="mode = m.id"
          >{{ m.label }}</button>
        </div>
      </div>
      <div v-if="chips.length" class="d-flex flex-wrap gap-1 mt-2">
        <button
          v-for="chip in chips"
          :key="chip.key"
          type="button"
          class="btn btn-sm btn-outline-secondary py-0 px-2"
          :title="'Remove context'"
          @click="dismissChip(chip.key)"
        >
          {{ chip.label }}
          <i class="bi bi-x" aria-hidden="true"></i>
        </button>
      </div>
    </div>

    <div
      ref="historyEl"
      class="phi-chat-history flex-grow-1 overflow-auto small px-3 py-2"
      @click="onHistoryClick"
    >
      <div v-if="!available" class="text-muted">
        <p class="mb-2">{{ status?.error || 'AI chat is not configured for this context.' }}</p>
        <p v-if="status?.can_manage_platform" class="mb-0">
          Add a platform Claude key under Settings.
        </p>
        <p v-else-if="status?.can_manage_team" class="mb-0">
          Add a lab Anthropic key under
          <RouterLink :to="labKeySettingsTo">Project → Settings</RouterLink>,
          or ask a Super admin to provision platform credits.
        </p>
        <p v-else class="mb-0">Ask an Admin to enable AI chat for this team.</p>
      </div>

      <div v-else-if="messages.length === 0" class="text-muted">
        <p class="mb-2 fst-italic">{{ emptyHint }}</p>
        <ul class="list-unstyled mb-0">
          <li v-for="sample in sampleQuestions" :key="sample">
            <button
              type="button"
              class="btn btn-link btn-sm p-0 text-start"
              :disabled="loading"
              @click="send(sample)"
            >"{{ sample }}"</button>
          </li>
        </ul>
      </div>

      <div v-for="(msg, i) in messages" :key="i" class="mb-3">
        <div v-if="msg.role === 'user'" class="d-flex justify-content-end">
          <div class="phi-bubble phi-bubble--user rounded px-3 py-2">{{ msg.content }}</div>
        </div>
        <div v-else class="d-flex justify-content-start">
          <div
            class="phi-bubble phi-bubble--assistant rounded px-3 py-2"
            v-html="renderChatMarkdown(msg.content)"
          ></div>
        </div>
      </div>

      <div v-if="loading" class="text-muted small fst-italic">
        <span class="spinner-border spinner-border-sm me-1"></span>Thinking…
      </div>
    </div>

    <div class="phi-chat-composer-wrap flex-shrink-0">
      <div class="phi-chat-composer">
        <textarea
          ref="inputEl"
          v-model="input"
          class="phi-chat-composer-input"
          rows="1"
          :placeholder="placeholder"
          :disabled="loading || !available"
          @input="resizeInput"
          @keydown="onInputKeydown"
        ></textarea>
        <div class="d-flex justify-content-end">
          <button
            type="button"
            class="phi-chat-send"
            :disabled="loading || !available || !input.trim()"
            title="Send (Enter)"
            @click="send()"
          >
            <i class="bi bi-arrow-up"></i>
          </button>
        </div>
      </div>
      <div v-if="error" class="text-danger small mt-1">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '@/utils/api';
import { useChatStore } from '@/stores/chat';
import { useUserStore } from '@/stores/user';
import { useUIStore } from '@/stores/ui';
import { useTeamContext } from '@/composables/useTeamContext';
import { canAccessAdminUi } from '@/utils/roles';
import { renderChatMarkdown, rewriteChatHref } from '@/utils/chatMarkdown';

const modes = computed(() => [
  {
    id: 'help',
    label: 'Help',
    hint: isAdminUI.value
      ? 'How to run W4H: SMTP, teams, admins, and the Contributions catalog'
      : 'How to use W4H: teams, projects, keys, and screens',
  },
  { id: 'import', label: 'Import', hint: 'Load CSV/JSON and map columns into a dataset' },
  { id: 'irb', label: 'IRB', hint: 'Draft privacy language and a data management plan' },
  { id: 'analysis', label: 'Analytics', hint: 'Methods and notebook code for data already in W4H' },
]);

const samples = {
  help: [
    'How do I invite a student to my project?',
    'Where do I find my personal API key?',
  ],
  helpAdmin: [
    'How do I set up SMTP for the platform?',
    'How do I invite a Team admin?',
    'How do I add a Contribution to the catalog?',
  ],
  import: [
    'How do I import Fitbit CSV into my team catalog?',
    'What Contributions can I use to load CSV or JSON?',
  ],
  irb: [
    'Help me draft wearable-data privacy language for IRB.',
    'Outline a data management plan from this project’s metadata.',
  ],
  analysis: [
    'How do I compute energy expenditure from band data?',
    'Give a notebook snippet to plot a mapped heart-rate column.',
  ],
};

const chatStore = useChatStore();
const userStore = useUserStore();
const uiStore = useUIStore();
const route = useRoute();
const router = useRouter();
const { activeProject } = useTeamContext();
const { user } = storeToRefs(userStore);
const { status, activeMessages, activeConversation } = storeToRefs(chatStore);

const mode = ref('help');
const input = ref('');
const loading = ref(false);
const error = ref('');
const dismissed = ref(new Set());
const historyEl = ref(null);
const inputEl = ref(null);

const isAdminUI = computed(() => canAccessAdminUi(user.value?.role, user.value?.caps));
const labKeySettingsTo = computed(() => {
  const p = activeProject.value;
  if (!p) return { name: 'home' };
  return {
    name: 'adminProjectsEdit',
    params: { id: p.slug || p.id },
    query: { tab: 'settings' },
  };
});
const messages = computed(() => activeMessages.value);
const available = computed(() => !!status.value?.available);
const phiSafe = computed(() => status.value?.phi_safe !== false);

const emptyHint = computed(() => {
  if (mode.value === 'import') return 'Ask how to load files into a dataset (Contributions, mapping). For example:';
  if (mode.value === 'irb') return 'Ask for IRB / DMP drafting from project metadata. For example:';
  if (mode.value === 'analysis') return 'Ask how to analyze data already in W4H (methods and notebook code — no pasted rows). For example:';
  if (mode.value === 'help' && isAdminUI.value) return 'Ask how to bootstrap and run the platform (SMTP, Team admins, Contributions catalog). For example:';
  return 'Ask how to use the platform (screens, roles, keys). For analysis methods, switch to Analytics. For example:';
});

const sampleQuestions = computed(() => {
  if (mode.value === 'help' && isAdminUI.value) return samples.helpAdmin;
  return samples[mode.value] || samples.help;
});
const placeholder = computed(() => {
  if (mode.value === 'irb') return 'Ask about IRB language or a data management plan…';
  if (mode.value === 'import') return 'Ask how to import or map wearable data…';
  if (mode.value === 'analysis') return 'Ask how to compute a metric or plot a mapped column…';
  return 'Ask how to use W4H…';
});

const chips = computed(() => {
  const out = [];
  const skip = dismissed.value;
  out.push({ key: 'shell', label: isAdminUI.value ? 'Platform Admin' : 'App' });
  if (route.path && !skip.has('route')) {
    out.push({ key: 'route', label: route.path });
  }
  if (activeProject.value?.teamName && !skip.has('team')) {
    out.push({ key: 'team', label: `Team: ${activeProject.value.teamName}` });
  }
  if (activeProject.value?.name && !skip.has('project')) {
    out.push({ key: 'project', label: `Project: ${activeProject.value.name}` });
  }
  if (route.name === 'docs' && route.params.slug && !skip.has('doc')) {
    out.push({ key: 'doc', label: `Help: ${route.params.slug}` });
  }
  if (route.name === 'contributionDetail' && route.params.slug && !skip.has('contribution')) {
    out.push({ key: 'contribution', label: `Contribution: ${route.params.slug}` });
  }
  return out;
});

function dismissChip(key) {
  const next = new Set(dismissed.value);
  next.add(key);
  dismissed.value = next;
}

function onHistoryClick(event) {
  const a = event.target.closest?.('a');
  if (!a || !historyEl.value?.contains(a)) return;
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (a.target === '_blank') return;
  const href = a.getAttribute('href');
  if (!href || href.startsWith('#') || href.startsWith('mailto:')) return;
  if (/^https?:\/\//i.test(href)) return;
  if (!href.startsWith('/')) return;
  event.preventDefault();
  router.push(rewriteChatHref(href));
}

function contextPayload() {
  const skip = dismissed.value;
  return {
    shell: isAdminUI.value ? 'admin' : 'app',
    route: skip.has('route') ? '' : route.fullPath,
    team_id: skip.has('team') ? null : (uiStore.activeTeamId || activeProject.value?.teamId || null),
    team_name: skip.has('team') ? null : (activeProject.value?.teamName || null),
    project_id: skip.has('project') ? null : (activeProject.value?.id || uiStore.activeProjectId || null),
    doc_slug: skip.has('doc') ? null : (route.name === 'docs' ? route.params.slug : null),
    contribution_slug: skip.has('contribution')
      ? null
      : (route.name === 'contributionDetail' ? route.params.slug : null),
    mode: mode.value,
  };
}

async function refreshStatus() {
  try {
    await chatStore.fetchStatus(contextPayload());
  } catch {
    chatStore.status = {
      available: false,
      error: 'Could not load AI status.',
    };
  }
}

function resizeInput() {
  const el = inputEl.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

function onInputKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send();
  }
}

function apiUrl(path) {
  const base = api.defaults.baseURL || '/';
  return base.endsWith('/') ? `${base}${path}` : `${base}/${path}`;
}

async function scrollToBottom() {
  await nextTick();
  if (historyEl.value) historyEl.value.scrollTop = historyEl.value.scrollHeight;
}

// Posts to ai/chat as an SSE stream and appends text deltas onto the
// conversation's last (assistant) message as they arrive. Resolves with the
// final {conversation, model, usage, phi_safe} from the 'done' event, same
// shape the old non-streaming response carried. Throws an Error carrying
// `.code`/`.data` (mirroring axios's err.response.data shape) for PHI_BLOCKED/
// PHI_CONFIRM/other errors, so the existing catch-side handling keeps working.
async function streamChat(payload) {
  const res = await fetch(apiUrl('ai/chat'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders().headers },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || `Chat failed (${res.status})`);
    err.data = data;
    throw err;
  }

  const conv = chatStore.activeConversation;
  conv.messages = [...conv.messages, { role: 'assistant', content: '' }];
  const assistantIndex = conv.messages.length - 1;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalEvent = null;

  function processSseFrame(raw) {
    const dataLine = raw.split('\n').find((l) => l.startsWith('data:'));
    if (!dataLine) return;
    let evt;
    try {
      evt = JSON.parse(dataLine.slice(5).trim());
    } catch {
      return;
    }
    if (evt.type === 'delta') {
      const next = [...conv.messages];
      next[assistantIndex] = {
        role: 'assistant',
        content: (next[assistantIndex]?.content || '') + (evt.text ?? ''),
      };
      conv.messages = next;
      scrollToBottom();
    } else if (evt.type === 'done') {
      finalEvent = evt;
    } else if (evt.type === 'error') {
      const err = new Error(evt.error || 'Chat failed');
      err.data = evt;
      throw err;
    }
  }

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() || '';
    for (const raw of chunks) processSseFrame(raw);
  }
  // The stream closed -- flush whatever's left in buffer in case the
  // server's last frame (often the "done" event itself) had no trailing
  // blank-line separator. Without this, a connection that closes right
  // after writing its final frame silently drops it instead of erroring.
  if (buffer.trim()) processSseFrame(buffer);

  if (!finalEvent) {
    const err = new Error('The response stream ended before completing — try again.');
    err.data = { error: err.message };
    throw err;
  }

  return finalEvent;
}

async function send(preset) {
  const text = String(preset || input.value || '').trim();
  if (!text || loading.value || !available.value) return;
  const conv = chatStore.activeConversation;
  if (!conv) return;

  error.value = '';
  input.value = '';
  resizeInput();
  const lengthBeforeSend = (conv.messages || []).length;
  conv.messages = [...(conv.messages || []), { role: 'user', content: text }];
  loading.value = true;
  await scrollToBottom();

  try {
    const payload = {
      conversation_id: conv.id,
      messages: conv.messages,
      ...contextPayload(),
      stream: true,
    };
    let finalEvent;
    try {
      finalEvent = await streamChat(payload);
    } catch (err) {
      if (err.data?.code === 'PHI_CONFIRM') {
        const ok = window.confirm(`${err.data.error}\n\nSend anyway?`);
        if (!ok) throw err;
        finalEvent = await streamChat({ ...payload, confirm_no_phi: true });
      } else {
        throw err;
      }
    }
    if (finalEvent?.conversation) {
      chatStore.applyConversation(finalEvent.conversation);
    }
    await refreshStatus();
  } catch (err) {
    error.value = err.data?.error || err.message || 'Chat failed';
    // Drop the user turn and any streamed assistant placeholder: the server persisted neither.
    conv.messages = conv.messages.slice(0, lengthBeforeSend);
  } finally {
    loading.value = false;
    await scrollToBottom();
    inputEl.value?.focus();
  }
}

watch(() => [route.fullPath, uiStore.activeTeamId, uiStore.activeProjectId], () => {
  dismissed.value = new Set();
  refreshStatus();
});

watch(activeConversation, async () => {
  await nextTick();
  if (historyEl.value) historyEl.value.scrollTop = historyEl.value.scrollHeight;
});

onMounted(() => {
  refreshStatus();
});
</script>

<style scoped>
.phi-chat {
  min-height: 0;
}
.phi-chat-history {
  min-height: 0;
}
.phi-bubble {
  max-width: 90%;
  text-align: left;
}
.phi-bubble--user {
  background: var(--bs-primary);
  color: var(--bs-white);
}
.phi-bubble--assistant {
  border: 1px solid var(--bs-border-color);
  background: var(--bs-body-bg);
}
.phi-bubble--assistant :deep(> *:first-child) {
  margin-top: 0;
}
.phi-bubble--assistant :deep(> *:last-child) {
  margin-bottom: 0;
}
.phi-bubble--assistant :deep(h1),
.phi-bubble--assistant :deep(h2),
.phi-bubble--assistant :deep(h3) {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.65rem 0 0.35rem;
}
.phi-bubble--assistant :deep(p) {
  margin-bottom: 0.5rem;
}
.phi-bubble--assistant :deep(ul),
.phi-bubble--assistant :deep(ol) {
  padding-left: 1.25rem;
  margin-bottom: 0.5rem;
}
.phi-bubble--assistant :deep(pre) {
  font-size: 0.8em;
  padding: 0.5rem 0.65rem;
  overflow-x: auto;
  border-radius: 0.35rem;
  background: var(--bs-secondary-bg);
  margin-bottom: 0.5rem;
}
.phi-bubble--assistant :deep(code) {
  font-size: 0.85em;
}
.phi-bubble--assistant :deep(a) {
  word-break: break-word;
}
.phi-chat-composer-wrap {
  padding: 0.5rem 0.75rem 0.75rem;
}
.phi-chat-composer {
  border: 1px solid var(--bs-border-color);
  border-radius: 0.75rem;
  background: var(--bs-secondary-bg);
  padding: 0.5rem 0.65rem 0.45rem;
}
.phi-chat-composer-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--bs-body-color);
  resize: none;
  min-height: 1.5rem;
  max-height: 10rem;
  font-size: 0.875rem;
  line-height: 1.45;
}
.phi-chat-send {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: none;
  border-radius: 50%;
  background: var(--bs-primary);
  color: var(--bs-white);
}
.phi-chat-send:disabled {
  opacity: 0.4;
}
</style>
