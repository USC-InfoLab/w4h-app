<template>
  <Teleport to="body">
    <aside
      v-if="chatStore.canUseChat && chatStore.open"
      class="global-chat-panel"
      :style="panelStyle"
      aria-label="PHI-safe AI chat"
    >
      <div
        class="global-chat-resize"
        title="Drag to resize"
        @mousedown="onSplitterMouseDown"
      ></div>

      <div class="global-chat-main">
        <div class="global-chat-tabs" role="tablist">
          <div class="global-chat-tab-list">
            <div
              v-for="tab in chatStore.openTabs"
              :key="tab.id"
              class="global-chat-tab"
              :class="{ active: tab.id === chatStore.activeId }"
              role="tab"
              :aria-selected="tab.id === chatStore.activeId"
              tabindex="0"
              :title="tab.title"
              @click="chatStore.selectConversation(tab.id)"
              @keydown.enter.prevent="chatStore.selectConversation(tab.id)"
            >
              <i class="bi bi-chat global-chat-tab-icon" aria-hidden="true"></i>
              <span class="global-chat-tab-label text-truncate">{{ tab.title }}</span>
              <span
                class="global-chat-tab-close"
                role="button"
                tabindex="-1"
                title="Close tab"
                @click.stop="chatStore.closeTab(tab.id)"
              >
                <i class="bi bi-x"></i>
              </span>
            </div>
          </div>

          <div class="global-chat-actions">
            <button
              type="button"
              class="global-chat-icon-btn"
              title="New Chat"
              aria-label="New Chat"
              @click="chatStore.newConversation()"
            >
              <i class="bi bi-plus-lg"></i>
            </button>
            <button
              ref="historyBtnEl"
              type="button"
              class="global-chat-icon-btn"
              :class="{ active: historyMenuOpen }"
              title="Show Chat History"
              aria-label="Show Chat History"
              @click="toggleHistoryMenu"
            >
              <i class="bi bi-clock-history"></i>
            </button>
          </div>
        </div>

        <PhiSafeChat v-if="chatStore.activeConversation" :key="chatStore.activeId" />
      </div>
    </aside>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="chatStore.canUseChat && chatStore.open && historyMenuOpen"
      ref="historyMenuEl"
      class="global-chat-history-menu"
      role="dialog"
      aria-label="Chat history"
      :style="historyMenuStyle"
      @keydown.esc.stop="closeHistoryMenu"
    >
      <div class="global-chat-history-search">
        <i class="bi bi-search" aria-hidden="true"></i>
        <input
          ref="historySearchEl"
          v-model="historyQuery"
          type="search"
          class="global-chat-history-search-input"
          placeholder="Search chats…"
        />
      </div>
      <div class="global-chat-history-scroll">
        <p v-if="!filteredGroups.length" class="global-chat-history-empty text-secondary">
          No chats found
        </p>
        <section
          v-for="group in filteredGroups"
          :key="group.key"
          class="global-chat-history-group"
        >
          <h3 class="global-chat-history-heading">{{ group.label }}</h3>
          <ul class="list-unstyled mb-0">
            <li
              v-for="conv in group.items"
              :key="conv.id"
              class="global-chat-history-item"
              :class="{ active: conv.id === chatStore.activeId }"
              @click="selectFromHistory(conv.id)"
            >
              <span class="global-chat-history-item-title text-truncate">{{ conv.title }}</span>
              <div class="global-chat-history-item-actions" @click.stop>
                <button
                  type="button"
                  class="global-chat-history-action"
                  title="More"
                  aria-label="More"
                  @click="toggleItemMenu(conv.id, $event)"
                >
                  <i class="bi bi-three-dots"></i>
                </button>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div
      v-if="itemMenu"
      ref="itemMenuEl"
      class="global-chat-item-menu"
      :style="itemMenuStyle"
      role="menu"
      @keydown.esc.stop="closeItemMenu"
    >
      <button type="button" class="global-chat-item-menu-btn" role="menuitem" @click="onPin">
        {{ itemMenuPinned ? 'Unpin' : 'Pin' }}
      </button>
      <button type="button" class="global-chat-item-menu-btn" role="menuitem" @click="onRename">
        Rename
      </button>
      <hr class="global-chat-item-menu-sep" />
      <button type="button" class="global-chat-item-menu-btn danger" role="menuitem" @click="onDelete">
        Delete
      </button>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import PhiSafeChat from './PhiSafeChat.vue';
import { useChatStore } from '@/stores/chat';

const chatStore = useChatStore();
const { width } = storeToRefs(chatStore);

const historyMenuOpen = ref(false);
const historyQuery = ref('');
const historyBtnEl = ref(null);
const historyMenuEl = ref(null);
const historySearchEl = ref(null);
const historyMenuStyle = ref({});
const itemMenu = ref(null);
const itemMenuEl = ref(null);
const itemMenuStyle = ref({});
const isMobile = ref(false);

const itemMenuPinned = computed(() => {
  if (!itemMenu.value) return false;
  return !!chatStore.conversations.find((c) => c.id === itemMenu.value)?.pinned;
});

const panelStyle = computed(() => ({
  width: isMobile.value ? '100vw' : `${width.value}px`,
}));

const filteredGroups = computed(() => {
  const q = historyQuery.value.trim().toLowerCase();
  if (!q) return chatStore.groupedConversations;
  return chatStore.groupedConversations
    .map((group) => ({
      ...group,
      items: group.items.filter((c) => String(c.title || '').toLowerCase().includes(q)),
    }))
    .filter((group) => group.items.length);
});

function syncMobile() {
  isMobile.value = window.matchMedia('(max-width: 767.98px)').matches;
  document.body.style.setProperty(
    '--w4h-chat-width',
    isMobile.value ? '100vw' : `${width.value}px`,
  );
}

function positionHistoryMenu() {
  const btn = historyBtnEl.value;
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const menuWidth = Math.min(352, window.innerWidth - 16);
  let left = rect.right - menuWidth;
  if (left < 8) left = 8;
  historyMenuStyle.value = {
    position: 'fixed',
    top: `${rect.bottom + 8}px`,
    left: `${left}px`,
    width: `${menuWidth}px`,
    zIndex: '2000',
  };
}

function closeHistoryMenu() {
  historyMenuOpen.value = false;
  historyQuery.value = '';
  closeItemMenu();
}

async function toggleHistoryMenu() {
  closeItemMenu();
  historyMenuOpen.value = !historyMenuOpen.value;
  if (historyMenuOpen.value) {
    positionHistoryMenu();
    await nextTick();
    historySearchEl.value?.focus();
  }
}

function selectFromHistory(id) {
  chatStore.selectConversation(id);
  closeHistoryMenu();
}

function closeItemMenu() {
  itemMenu.value = null;
}

function toggleItemMenu(id, event) {
  if (itemMenu.value === id) {
    closeItemMenu();
    return;
  }
  itemMenu.value = id;
  const anchor = event.currentTarget.getBoundingClientRect();
  itemMenuStyle.value = {
    position: 'fixed',
    top: `${anchor.bottom + 4}px`,
    left: `${Math.max(8, anchor.right - 160)}px`,
    zIndex: '2010',
  };
}

function onPin() {
  if (!itemMenu.value) return;
  chatStore.togglePinConversation(itemMenu.value);
  closeItemMenu();
}

function onRename() {
  if (!itemMenu.value) return;
  const conv = chatStore.conversations.find((c) => c.id === itemMenu.value);
  const next = window.prompt('Rename chat', conv?.title || '');
  if (next != null) chatStore.renameConversation(itemMenu.value, next);
  closeItemMenu();
}

function onDelete() {
  if (!itemMenu.value) return;
  chatStore.deleteConversation(itemMenu.value);
  closeItemMenu();
}

function onDocPointerDown(event) {
  const t = event.target;
  if (historyMenuOpen.value) {
    if (!historyBtnEl.value?.contains(t) && !historyMenuEl.value?.contains(t) && !itemMenuEl.value?.contains(t)) {
      closeHistoryMenu();
    }
  }
  if (itemMenu.value) {
    if (itemMenuEl.value && !itemMenuEl.value.contains(t) && !t.closest?.('.global-chat-history-action')) {
      closeItemMenu();
    }
  }
}

function onSplitterMouseDown(event) {
  if (isMobile.value) return;
  event.preventDefault();
  const startX = event.clientX;
  const startWidth = chatStore.width;
  const onMove = (moveEvent) => {
    chatStore.setWidth(startWidth + (startX - moveEvent.clientX));
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  };
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function onKeydown(e) {
  if (!chatStore.canUseChat) return;
  const meta = e.metaKey || e.ctrlKey;
  if (meta && e.key.toLowerCase() === 'j') {
    e.preventDefault();
    chatStore.toggle();
  }
  if (e.key === 'Escape') {
    if (itemMenu.value) closeItemMenu();
    else if (historyMenuOpen.value) closeHistoryMenu();
  }
}

onMounted(() => {
  chatStore.ensureHydrated();
  syncMobile();
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('resize', syncMobile);
  document.addEventListener('pointerdown', onDocPointerDown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('resize', syncMobile);
  document.removeEventListener('pointerdown', onDocPointerDown, true);
});
</script>

<style scoped>
.global-chat-panel {
  position: fixed;
  top: var(--app-navbar-height, 44px);
  right: 0;
  bottom: 0;
  z-index: 1020;
  display: flex;
  flex-direction: column;
  background: var(--bs-body-bg);
  border-left: 1px solid var(--bs-border-color);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  text-align: left;
}
.global-chat-resize {
  position: absolute;
  top: 0;
  bottom: 0;
  left: -3px;
  width: 6px;
  cursor: col-resize;
  z-index: 3;
}
@media (max-width: 767.98px) {
  .global-chat-resize { display: none; }
}
.global-chat-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.global-chat-tabs {
  display: flex;
  align-items: stretch;
  gap: 0;
  padding: 0 0.35rem 0 0.25rem;
  border-bottom: 1px solid var(--bs-border-color);
  background: var(--bs-tertiary-bg);
  min-height: 2.35rem;
  max-height: 2.35rem;
}
.global-chat-tab-list {
  display: flex;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.global-chat-tab {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 11rem;
  min-width: 0;
  padding: 0.55rem 0.45rem 0.5rem 0.65rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--bs-secondary-color);
  cursor: pointer;
}
.global-chat-tab.active {
  color: inherit;
  border-bottom-color: var(--bs-primary);
  font-weight: 600;
}
.global-chat-tab-label {
  font-size: 0.78rem;
  min-width: 0;
}
.global-chat-tab-close {
  opacity: 0;
  width: 1.1rem;
  height: 1.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.global-chat-tab:hover .global-chat-tab-close,
.global-chat-tab.active .global-chat-tab-close {
  opacity: 0.75;
}
.global-chat-actions {
  display: flex;
  align-items: center;
  align-self: center;
}
.global-chat-icon-btn {
  width: 1.75rem;
  height: 1.75rem;
  border: 0;
  border-radius: 0.35rem;
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>

<style>
.global-chat-history-menu {
  display: flex;
  flex-direction: column;
  max-height: min(28rem, calc(100vh - 8rem));
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.65rem;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
  overflow: hidden;
  text-align: left;
}
.global-chat-history-search {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0.65rem 0.75rem 0.35rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.45rem;
  background: var(--bs-tertiary-bg);
}
.global-chat-history-search-input {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 0.85rem;
}
.global-chat-history-scroll {
  overflow: auto;
  padding: 0.25rem 0.35rem 0.65rem;
}
.global-chat-history-empty {
  margin: 0.75rem;
  font-size: 0.85rem;
}
.global-chat-history-heading {
  margin: 0.35rem 0.65rem 0.3rem;
  font-size: 0.72rem;
  font-weight: 650;
  color: var(--bs-secondary-color);
}
.global-chat-history-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.4rem 0.35rem 0.4rem 0.55rem;
  border-radius: 0.4rem;
  cursor: pointer;
}
.global-chat-history-item:hover,
.global-chat-history-item.active {
  background: var(--bs-tertiary-bg);
}
.global-chat-history-item-title {
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
}
.global-chat-history-item-actions {
  opacity: 0;
}
.global-chat-history-item:hover .global-chat-history-item-actions {
  opacity: 1;
}
.global-chat-history-action {
  border: 0;
  background: transparent;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.3rem;
}
.global-chat-item-menu {
  min-width: 10rem;
  padding: 0.35rem;
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
}
.global-chat-item-menu-btn {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 0.4rem 0.65rem;
  border-radius: 0.35rem;
  font-size: 0.85rem;
}
.global-chat-item-menu-btn:hover {
  background: var(--bs-tertiary-bg);
}
.global-chat-item-menu-btn.danger {
  color: var(--bs-danger);
}
.global-chat-item-menu-sep {
  margin: 0.25rem 0;
  border: 0;
  border-top: 1px solid var(--bs-border-color);
}
</style>
