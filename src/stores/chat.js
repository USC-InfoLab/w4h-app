import { defineStore } from 'pinia';
import { computed, ref, watch } from 'vue';
import { useUserStore } from './user';
import { api, authHeaders } from '@/utils/api';

const WIDTH_KEY = 'w4h-chat-width';
const OPEN_KEY = 'w4h-chat-open';
const PANEL_MIN = 320;
const PANEL_MAX = 800;

function clampWidth(w) {
  return Math.min(PANEL_MAX, Math.max(PANEL_MIN, Number(w) || 420));
}

function startOfLocalDay(ts = Date.now()) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function conversationTimeGroup(updatedAt, now = Date.now()) {
  const startToday = startOfLocalDay(now);
  const startYesterday = startToday - 24 * 60 * 60 * 1000;
  const startWeek = startToday - 6 * 24 * 60 * 60 * 1000;
  const startMonth = startToday - 29 * 24 * 60 * 60 * 1000;
  const t = new Date(updatedAt).getTime() || 0;
  if (t >= startToday) return { key: 'today', label: 'Today' };
  if (t >= startYesterday) return { key: 'yesterday', label: 'Yesterday' };
  if (t >= startWeek) return { key: 'week', label: 'Previous 7 Days' };
  if (t >= startMonth) return { key: 'month', label: 'Previous 30 Days' };
  return { key: 'older', label: 'Older' };
}

const GROUP_ORDER = ['today', 'yesterday', 'week', 'month', 'older'];

function mapConv(row, { loaded } = {}) {
  const messages = Array.isArray(row.messages) ? row.messages : [];
  return {
    id: row.id,
    title: row.title || 'Chat',
    messages,
    updatedAt: row.updated_at || row.updatedAt || Date.now(),
    titleLocked: !!row.title_locked,
    pinned: !!row.pinned,
    loaded: loaded === true,
  };
}

export const useChatStore = defineStore('chat', () => {
  const userStore = useUserStore();

  const open = ref(false);
  const historyOpen = ref(false);
  const width = ref(clampWidth(localStorage.getItem(WIDTH_KEY) || 480));
  const conversations = ref([]);
  const activeId = ref(null);
  const openTabIds = ref([]);
  const hydratedUserId = ref(null);
  const hydrating = ref(false);
  const status = ref(null);
  const pageContext = ref(null);

  const canUseChat = computed(() => !!userStore.user?.id || !!userStore.user?.email);

  const activeConversation = computed(() => (
    conversations.value.find((c) => c.id === activeId.value) || null
  ));

  const activeMessages = computed(() => activeConversation.value?.messages || []);

  const sortedConversations = computed(() => (
    [...conversations.value].sort((a, b) => {
      const pin = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0);
      if (pin) return pin;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
  ));

  const groupedConversations = computed(() => {
    const pinned = sortedConversations.value.filter((c) => c.pinned);
    const unpinned = sortedConversations.value.filter((c) => !c.pinned);
    const groups = [];
    if (pinned.length) groups.push({ key: 'pinned', label: 'Pinned', items: pinned });
    const buckets = new Map();
    for (const conv of unpinned) {
      const { key, label } = conversationTimeGroup(conv.updatedAt);
      if (!buckets.has(key)) buckets.set(key, { key, label, items: [] });
      buckets.get(key).items.push(conv);
    }
    for (const key of GROUP_ORDER) {
      if (buckets.has(key)) groups.push(buckets.get(key));
    }
    return groups;
  });

  const openTabs = computed(() => (
    openTabIds.value
      .map((id) => conversations.value.find((c) => c.id === id))
      .filter(Boolean)
  ));

  function ensureTab(id) {
    if (!id || openTabIds.value.includes(id)) return;
    openTabIds.value = [...openTabIds.value, id];
  }

  async function fetchStatus(ctx = {}) {
    const params = new URLSearchParams();
    if (ctx.team_id) params.set('team_id', ctx.team_id);
    if (ctx.shell) params.set('shell', ctx.shell);
    const qs = params.toString();
    const res = await api.get(`ai/status${qs ? `?${qs}` : ''}`, authHeaders());
    status.value = res.data;
    return res.data;
  }

  async function loadConversation(id) {
    const conv = conversations.value.find((c) => c.id === id);
    if (conv?.loaded) return conv;
    const res = await api.get(`ai/conversations/${id}`, authHeaders());
    const mapped = mapConv(res.data, { loaded: true });
    const idx = conversations.value.findIndex((c) => c.id === id);
    if (idx >= 0) conversations.value.splice(idx, 1, { ...conversations.value[idx], ...mapped });
    else conversations.value.unshift(mapped);
    return mapped;
  }

  async function hydrateForUser() {
    const userId = userStore.user?.id || userStore.user?.email;
    if (!userId || hydrating.value) return;
    if (hydratedUserId.value === userId && conversations.value.length) return;
    hydrating.value = true;
    try {
      const res = await api.get('ai/conversations', authHeaders());
      const rows = (res.data?.conversations || []).map((r) => mapConv(r, { loaded: false }));
      conversations.value = rows;
      if (rows.length) {
        activeId.value = rows[0].id;
        openTabIds.value = [rows[0].id];
        await loadConversation(rows[0].id);
      } else {
        await newConversation();
      }
      hydratedUserId.value = userId;
    } catch (err) {
      console.warn('Chat hydrate failed:', err.message);
      conversations.value = [];
      activeId.value = null;
      openTabIds.value = [];
    } finally {
      hydrating.value = false;
    }
  }

  function ensureHydrated() {
    if (!canUseChat.value) return;
    hydrateForUser();
  }

  function close() {
    open.value = false;
    historyOpen.value = false;
  }

  function toggle() {
    ensureHydrated();
    open.value = !open.value;
  }

  function setWidth(next) {
    width.value = clampWidth(next);
  }

  async function selectConversation(id) {
    if (!conversations.value.some((c) => c.id === id)) return;
    activeId.value = id;
    ensureTab(id);
    await loadConversation(id);
  }

  async function newConversation() {
    const res = await api.post('ai/conversations', {}, authHeaders());
    const conv = mapConv({ ...res.data, messages: [] }, { loaded: true });
    conversations.value.unshift(conv);
    activeId.value = conv.id;
    ensureTab(conv.id);
    return conv;
  }

  function closeTab(id) {
    const idx = openTabIds.value.indexOf(id);
    if (idx < 0) return;
    openTabIds.value = openTabIds.value.filter((t) => t !== id);
    if (!openTabIds.value.length) {
      const next = sortedConversations.value[0];
      if (next) {
        openTabIds.value = [next.id];
        activeId.value = next.id;
        loadConversation(next.id);
      }
      return;
    }
    if (activeId.value === id) {
      activeId.value = openTabIds.value[Math.min(idx, openTabIds.value.length - 1)];
      loadConversation(activeId.value);
    }
  }

  async function deleteConversation(id) {
    await api.delete(`ai/conversations/${id}`, authHeaders());
    conversations.value = conversations.value.filter((c) => c.id !== id);
    openTabIds.value = openTabIds.value.filter((t) => t !== id);
    if (!conversations.value.length) {
      await newConversation();
      return;
    }
    if (activeId.value === id) {
      activeId.value = openTabIds.value[0] || conversations.value[0].id;
      ensureTab(activeId.value);
      await loadConversation(activeId.value);
    }
  }

  async function renameConversation(id, title) {
    const next = String(title || '').trim();
    if (!next) return;
    const res = await api.patch(`ai/conversations/${id}`, { title: next }, authHeaders());
    const conv = conversations.value.find((c) => c.id === id);
    if (conv) {
      conv.title = res.data.title || next;
      conv.titleLocked = true;
      conv.updatedAt = res.data.updated_at || conv.updatedAt;
    }
  }

  async function togglePinConversation(id) {
    const conv = conversations.value.find((c) => c.id === id);
    if (!conv) return;
    const res = await api.patch(`ai/conversations/${id}`, { pinned: !conv.pinned }, authHeaders());
    Object.assign(conv, {
      pinned: !!res.data.pinned,
      updatedAt: res.data.updated_at || conv.updatedAt,
      title: res.data.title || conv.title,
    });
  }

  function applyConversation(updated) {
    if (!updated?.id) return;
    const mapped = mapConv(updated, { loaded: true });
    const idx = conversations.value.findIndex((c) => c.id === updated.id);
    if (idx >= 0) conversations.value.splice(idx, 1, { ...conversations.value[idx], ...mapped });
    else conversations.value.unshift(mapped);
    activeId.value = updated.id;
    ensureTab(updated.id);
  }

  function setPageContext(ctx) {
    pageContext.value = ctx;
  }

  watch(open, () => {
    try {
      localStorage.removeItem(OPEN_KEY);
    } catch {
      /* ignore */
    }
    syncChatLayout();
  }, { immediate: true });
  watch(canUseChat, syncChatLayout);
  watch(width, (v) => {
    localStorage.setItem(WIDTH_KEY, String(v));
    document.body.style.setProperty('--w4h-chat-width', `${v}px`);
  }, { immediate: true });

  function syncChatLayout() {
    const on = open.value && canUseChat.value;
    document.body.classList.toggle('w4h-chat-open', on);
    if (!on) document.body.style.removeProperty('--w4h-chat-width');
    else document.body.style.setProperty('--w4h-chat-width', `${width.value}px`);
  }

  watch(
    () => userStore.user?.id || userStore.user?.email,
    (id, prev) => {
      hydratedUserId.value = null;
      if (!id || id !== prev) close();
      if (canUseChat.value) hydrateForUser();
    },
  );

  return {
    open,
    historyOpen,
    width,
    conversations,
    activeId,
    openTabIds,
    pageContext,
    status,
    canUseChat,
    activeConversation,
    activeMessages,
    sortedConversations,
    groupedConversations,
    openTabs,
    panelMin: PANEL_MIN,
    panelMax: PANEL_MAX,
    toggle,
    setWidth,
    selectConversation,
    newConversation,
    closeTab,
    deleteConversation,
    renameConversation,
    togglePinConversation,
    setPageContext,
    ensureHydrated,
    fetchStatus,
    applyConversation,
    loadConversation,
  };
});
