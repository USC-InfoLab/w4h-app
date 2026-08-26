<template>
  <main class="container-fluid p-0 docs-view">
    <nav v-if="!hideSidebar" class="docs-subnav d-md-none border-bottom" aria-label="Docs navigation">
      <div class="container-fluid d-flex align-items-center justify-content-between">
        <button type="button" class="btn btn-link docs-subnav-btn" data-bs-toggle="offcanvas"
          data-bs-target="#docsMenuOffcanvas" :disabled="editMode">
          <i class="bi bi-list"></i> Menu
        </button>
        <div class="d-flex align-items-center gap-1">
          <template v-if="showDocAdminActions">
            <button type="button" class="btn btn-sm btn-primary" @click="editMode = true">
              <i class="bi bi-pencil"></i><span class="d-none d-sm-inline ms-1">Edit</span>
            </button>
            <button type="button" class="btn btn-sm btn-danger" @click="openDeleteModal(selecteddoc)">
              <span class="d-none d-sm-inline">Delete</span><span class="d-sm-none"><i class="bi bi-trash"></i></span>
            </button>
          </template>
          <button v-if="selecteddoc?.toc?.length" type="button" class="btn btn-link docs-subnav-btn"
            data-bs-toggle="offcanvas" data-bs-target="#docsTocOffcanvas" :disabled="editMode">
            On this page <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </nav>

    <div ref="splitRoot" class="docs-split" :class="{ 'docs-split--subnav': !hideSidebar }">
      <aside v-if="!hideSidebar" ref="leftPane" class="docs-sidebar border-end d-none d-md-block">
        <div class="position-sticky" style="top: 1rem;">
          <DocsSidebarNav :is-admin-ui="isAdminUI" :edit-mode="editMode" :grouped-docs="groupedDocs"
            :opendocs="opendocs" :active-slug="route.params?.slug ?? ''" @new-doc="goToNewDoc"
            @toggle-doc="toggledoc" />
        </div>
      </aside>

      <div ref="rightPane" class="docs-content" id="top">
        <template v-if="isAdminUI && isEditing">

          <div class="pt-3">
            <Suspense>
              <MdDocEditable :slug="route.params.slug ?? null" :is-new="props.isNewDoc" @saved="onDocSaved"
                @close="exitEditMode" />
            </Suspense>
          </div>
        </template>

        <template v-else>
          <div v-if="route.params?.slug === 'search'">
            <DocsSearch />
          </div>

          <div v-else-if="selecteddoc">
            <div v-if="showDocAdminActions" class="docs-admin-actions d-none d-md-block">
              <button class="btn btn-sm btn-primary edit-btn me-2" @click="editMode = true">
                <i class="bi bi-pencil me-1"></i> Edit
              </button>
              <button type="button" class="btn btn-sm delete-btn btn-danger" @click="openDeleteModal(selecteddoc)">
                Delete
              </button>
            </div>

            <div class="md-preview p-3">
              <h1 v-if="docPageTitle" :id="docPageTitleId">{{ docPageTitle }}</h1>
              <div :key="selecteddoc.slug" v-html="displayHtml" @click="onDocContentClick"></div>
            </div>

            <div v-if="selecteddoc.updated_at" class="doc-last-edited px-3 pb-4">
              Last updated{{ selecteddoc.updated_by ? ` by ${selecteddoc.updated_by}` : '' }}
              on {{ formatDocDate(selecteddoc.updated_at) }}
            </div>
          </div>

        </template>

        <a href="#top" v-show="showBackToTop" class="btn btn-secondary btn-sm back-to-top-fade">↑ Top</a>
      </div>
    </div>

    <DocsDeleteDocModal :show="showDeleteModal" :doc="docToDelete" @close="showDeleteModal = false"
      @deleted="handleDeleted" />

    <div v-if="!hideSidebar" class="offcanvas offcanvas-start" id="docsMenuOffcanvas" tabindex="-1"
      aria-labelledby="docsMenuOffcanvasLabel">
      <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title" id="docsMenuOffcanvasLabel">Documentation</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body">
        <DocsSidebarNav :is-admin-ui="isAdminUI" :edit-mode="editMode" :grouped-docs="groupedDocs"
          :opendocs="opendocs" :active-slug="route.params?.slug ?? ''" @new-doc="onMobileNewDoc"
          @toggle-doc="toggledoc" @navigated="closeOffcanvas('docsMenuOffcanvas')" />
      </div>
    </div>

    <div v-if="selecteddoc?.toc?.length" class="offcanvas offcanvas-end" id="docsTocOffcanvas" tabindex="-1"
      aria-labelledby="docsTocOffcanvasLabel">
      <div class="offcanvas-header border-bottom">
        <h5 class="offcanvas-title" id="docsTocOffcanvasLabel">On this page</h5>
        <button type="button" class="btn-close" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div class="offcanvas-body">
        <DocsPageToc :toc="selecteddoc.toc" :slug="selecteddoc.slug" :edit-mode="editMode"
          @navigated="closeOffcanvas('docsTocOffcanvas')" />
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, watch, onMounted, computed, onBeforeUnmount, nextTick } from 'vue';
import Split from 'split.js';
import mermaid from 'mermaid';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

import { Offcanvas } from 'bootstrap';
import DocsDeleteDocModal from '@/components/DocsDeleteDocModal.vue';
import DocsSearch from '@/components/DocsSearch.vue';
import DocsSidebarNav from '@/components/DocsSidebarNav.vue';
import DocsPageToc from '@/components/DocsPageToc.vue';
import { useDocTypes } from '@/composables/useDocTypes';
import { stripHTML } from '@/utils/toc';
import { docsHeadingHashId } from '@/utils/docsHeadingId';

const { fetchDocTypes } = useDocTypes();

const showDeleteModal = ref(false);
const docToDelete = ref(null);

function exitEditMode() {
  editMode.value = false;
  if (props.isNewDoc) {
    router.push({ name: 'docs', params: { slug: 'home' } });
  }
}

async function onDocSaved(updatedDoc) {
  // 1. Update the master list
  // If the slug changed, find by ID instead of slug to replace the old entry
  const idx = allDocs.value.findIndex(d => d.id === updatedDoc.id || d.slug === updatedDoc.slug);

  if (idx !== -1) {
    allDocs.value[idx] = { ...updatedDoc };
  } else {
    allDocs.value.push(updatedDoc);
  }

  // 2. Set as active doc
  selecteddoc.value = updatedDoc;

  // 3. IMPORTANT: If the slug changed, update the URL without reloading
  // This triggers handleSlug() via your watcher and keeps everything in sync
  if (route.params.slug !== updatedDoc.slug) {
    await router.replace({
      name: 'docs',
      params: { slug: updatedDoc.slug },
      hash: route.hash
    });
  }

  // 4. Auto-expand sidebar
  if (updatedDoc.toc?.length && !opendocs.value.includes(updatedDoc.slug)) {
    opendocs.value.push(updatedDoc.slug);
  }

  // Do not close after save!
  //editMode.value = false;
}

function openDeleteModal(doc) {
  docToDelete.value = doc;
  showDeleteModal.value = true;
}

function handleDeleted(slug) {
  // 1. remove doc from local master list
  allDocs.value = allDocs.value.filter(d => d.slug !== slug);

  // 2. Clear selected doc if it was the one deleted
  if (selecteddoc.value?.slug === slug) {
    selecteddoc.value = null;

    // 3. Navigate back to the main docs view so the URL isn't pointing to a 404
    router.push({ name: 'docs', params: { slug: 'home' } });
  }

  // 4. Clean up open sidebar sections
  opendocs.value = opendocs.value.filter(s => s !== slug);
}

import { useRoute, useRouter } from 'vue-router';
const router = useRouter();
const route = useRoute();

import { useUserStore } from '@/stores/user';
import { storeToRefs } from 'pinia';

const userStore = useUserStore();
const { user } = storeToRefs(userStore);

import { useUIStore } from '@/stores/ui';
import { canAccessAdminUi } from '@/utils/roles';
const uiStore = useUIStore();
const { darkMode } = storeToRefs(uiStore);

function applyMermaidTheme() {
  mermaid.initialize({ startOnLoad: false, theme: darkMode.value ? 'dark' : 'default' });
}

applyMermaidTheme();

import MdDocEditable from '@/components/MdDocEditable.vue';
import { handleDocContentClick, rewriteDocMediaUrls } from '@/utils/docMedia';

const editMode = ref(false);

const allDocs = ref([]);
const opendocs = ref([]);
const selecteddoc = ref(null);

/** HTML with media/ and baked APP_URL docs-media srcs normalized for the browser. */
const displayHtml = computed(() => rewriteDocMediaUrls(selecteddoc.value?.html || ''));

function onDocContentClick(event) {
  handleDocContentClick(event, router);
}

const splitRoot = ref(null);
const leftPane = ref(null);
const rightPane = ref(null);
let splitInstance = null;

const isAdminUI = computed(() => canAccessAdminUi(user.value?.role, user.value?.caps));
const isSearchPage = computed(() => route.params?.slug === 'search');
const showDocAdminActions = computed(() =>
  isAdminUI.value && selecteddoc.value && !isEditing.value && !isSearchPage.value
);
const hideSidebar = computed(() => selecteddoc.value?.show_in_docs === false && selecteddoc.value?.slug !== 'home');

/** Canonical page title from DB / frontmatter — not repeated as body H1. */
const docPageTitle = computed(() => {
  const t = selecteddoc.value?.title;
  return t ? stripHTML(String(t)) : '';
});
const docPageTitleId = computed(() =>
  docPageTitle.value ? docsHeadingHashId(docPageTitle.value) || 'doc-title' : 'doc-title'
);


function goToNewDoc() {
  router.push({ name: 'docNew' });
}

function onMobileNewDoc() {
  closeOffcanvas('docsMenuOffcanvas');
  goToNewDoc();
}

function closeOffcanvas(id) {
  const el = document.getElementById(id);
  if (!el) return;
  Offcanvas.getInstance(el)?.hide();
}

async function refreshMermaidInPreview() {
  if (editMode.value || props.isNewDoc) return;
  await nextTick();
  const container = document.querySelector('.md-preview');
  if (!container) return;
  const nodes = [...container.querySelectorAll('.mermaid')].filter((el) => !el.querySelector('svg'));
  if (!nodes.length) return;
  try {
    await mermaid.run({ nodes });
  } catch (e) {
    console.warn('Mermaid render in docs preview', e);
  }
}

const groupedDocs = computed(() => {
  const groups = {};
  const topDocs = []; // docs with empty doc_type

  for (const doc of allDocs.value) {
    if (doc.slug === 'home') continue;
    // Agent / generated-index files are not Help pages (API also skips these on import).
    const metaSlug = String(doc.slug || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (metaSlug === 'agents' || metaSlug === 'claude' || metaSlug === 'docs_index') continue;

    const type = doc.doc_type || '';
    if (!type) {
      topDocs.push(doc);
      continue;
    }

    if (!groups[type]) groups[type] = [];
    groups[type].push(doc);
  }

  // sort each group by sort_order then title
  for (const type in groups) {
    groups[type].sort(
      (a, b) =>
        (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
        a.title.localeCompare(b.title)
    );
  }

  // optionally sort topDocs too
  topDocs.sort(
    (a, b) =>
      (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) ||
      a.title.localeCompare(b.title)
  );

  return { top: topDocs, ...groups };
});

// Format the updated_at timestamp for the "last updated" footer.
function formatDocDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

async function selectdoc(doc) {
  if (!doc) {
    selecteddoc.value = null;
    return;
  }

  selecteddoc.value = doc;

  if (doc.toc?.length && !opendocs.value.includes(doc.slug)) {
    opendocs.value.push(doc.slug);
  }

  await nextTick();

  ensureCopyButtonsListener();
  initSplitIfNeeded();
  await refreshMermaidInPreview();

  if (route.hash) {
    await scrollToRouteHash();
  } else {
    rightPane.value?.scrollTo({ top: 0 });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function toggledoc(slug) {
  if (opendocs.value.includes(slug)) {
    opendocs.value = opendocs.value.filter(s => s !== slug);
  } else {
    opendocs.value.push(slug);
  }
}

watch(hideSidebar, () => {
  nextTick(() => {
    if (rightPane.value) rightPane.value.style.width = hideSidebar.value ? '100%' : '';
    initSplitIfNeeded();
  });
});

function destroySplit() {
  if (splitInstance && splitInstance.destroy) {
    try { splitInstance.destroy(); } catch { /* ignore */ }
    splitInstance = null;
  }
  // HMR / breakpoint flips can leave Split.js gutter nodes behind, which then
  // sit as extra flex children and pinch the read pane.
  splitRoot.value?.querySelectorAll(':scope > .gutter').forEach((el) => el.remove());
  if (leftPane.value) leftPane.value.style.width = '';
  if (rightPane.value) rightPane.value.style.width = '';
}

function sanitizeSplitSizes(raw) {
  if (raw == null || raw === '') return [25, 75];
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return [25, 75];
  }
  if (!Array.isArray(parsed) || parsed.length !== 2) return [25, 75];
  const a = Number(parsed[0]);
  const b = Number(parsed[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return [25, 75];
  const sum = a + b;
  if (sum < 90 || sum > 110) return [25, 75];
  if (Math.abs(sum - 100) < 0.05) return [a, b];
  return [(a / sum) * 100, (b / sum) * 100];
}

function initSplitIfNeeded() {
  const canSplit = !!leftPane.value && !!rightPane.value && !hideSidebar.value && window.innerWidth >= 768;

  // Recreating Split.js resets the right pane's scrollTop and drops hash targets.
  if (!canSplit) {
    destroySplit();
    if (rightPane.value) rightPane.value.style.width = hideSidebar.value ? '100%' : '';
    if (leftPane.value && window.innerWidth < 768) leftPane.value.style.width = '';
    return;
  }
  if (splitInstance) return;

  // Orphan gutters from HMR / a previous instance that didn't clean up.
  if (splitRoot.value?.querySelector(':scope > .gutter')) {
    destroySplit();
  }

  const sizes = sanitizeSplitSizes(localStorage.getItem('docs.split.sizes'));

  // Patch addEventListener to force passive: true for touch events during split.js init
  const originalAddEventListener = Element.prototype.addEventListener;
  Element.prototype.addEventListener = function (type, listener, options) {
    if (type === 'touchstart' || type === 'touchmove' || type === 'touchend') {
      // Force passive for touch events to avoid performance warnings
      if (typeof options === 'object') {
        options.passive = true;
      } else {
        options = { passive: true };
      }
    }
    return originalAddEventListener.call(this, type, listener, options);
  };

  try {
    splitInstance = Split([leftPane.value, rightPane.value], {
      sizes,
      minSize: [150, 300],
      gutterSize: 8,
      cursor: 'col-resize',
      snapOffset: 0,
      onDragEnd: (newSizes) => {
        localStorage.setItem('docs.split.sizes', JSON.stringify(newSizes));
      }
    });
  } finally {
    // Restore original addEventListener
    Element.prototype.addEventListener = originalAddEventListener;
  }
}

function handleResize() {
  // re-init split on breakpoint changes
  initSplitIfNeeded();
}

let copyButtonsListenerRegistered = false;

async function onDocsCopyButtonClick(e) {
  const btn = e.target.closest('.copy-btn');
  if (!btn || !btn.closest('.md-preview')) return;
  const raw = btn.getAttribute('data-code');
  if (raw == null) return;
  const code = decodeURIComponent(raw);
  try {
    await navigator.clipboard.writeText(code);
    btn.innerHTML = '<i class="bi bi-check"></i>';
    setTimeout(() => {
      btn.innerHTML = '<i class="bi bi-files"></i>';
    }, 2000);
  } catch (err) {
    console.error('Copy failed', err);
  }
}

function ensureCopyButtonsListener() {
  if (copyButtonsListenerRegistered) return;
  document.body.addEventListener('click', onDocsCopyButtonClick);
  copyButtonsListenerRegistered = true;
}

async function handleSlug(slug) {
  if (slug === 'search') {
    selecteddoc.value = null;
    editMode.value = false;
  }

  if (!slug || slug === 'search') {
    if (!allDocs.value.length) {
      const res = await api.get(`/docs`, authHeaders());
      const rows = Array.isArray(res.data) ? res.data : [];

      if (isAdminUI.value) {
        allDocs.value = rows;
      } else {
        allDocs.value = rows.filter(c => c.hidden === false);

        const userCity = user.value.city_id;
        allDocs.value = allDocs.value.filter(doc => {
          if (doc.slug.endsWith('-datasets')) {
            const docCity = doc.slug.replace('-datasets', '').toLowerCase();
            return docCity === userCity.toLowerCase();
          }
          return true;
        });
      }
    }
    if (slug === 'search') return;
    //goHome();
  } else {
    const res = await api.get(`/docs/${slug}`, authHeaders());
    const doc = res.data;

    if (!allDocs.value.length) {
      const listRes = await api.get(`/docs`, authHeaders());
      const rows = Array.isArray(listRes.data) ? listRes.data : [];
      if (isAdminUI.value) {
        allDocs.value = rows;
      } else {
        allDocs.value = rows.filter(c => c.hidden === false);

        // filter -datasets for user city
        const userCity = user.value.city_id;
        allDocs.value = allDocs.value.filter(docItem => {
          if (docItem.slug.endsWith('-datasets')) {
            const docCity = docItem.slug.replace('-datasets', '').toLowerCase();
            return docCity === userCity.toLowerCase();
          }
          return true;
        });
      }
    } else {
      //console.log('allDocs already loaded, just select doc');
    }
    selectdoc(doc);
  }
}

function onMdPreviewMediaClick(e) {
  const media = e.target.closest('.md-preview img, .md-preview video');
  if (!media) return;
  media.classList.toggle('enlarged');
}

const showBackToTop = ref(true);

const props = defineProps({
  isNewDoc: { type: Boolean, default: false }
});

const isEditing = computed(() => props.isNewDoc || editMode.value);

watch(() => props.isNewDoc, (isNew) => {
  if (isNew) {
    selecteddoc.value = null;
    // editMode remains false because isNewDoc is already true
    // resulting in isEditing being true.
  }
});

onMounted(async () => {
  document.title = `${APP_NAME} Docs`;

  fetchDocTypes({ force: true });

  window.addEventListener('scroll', () => {
    showBackToTop.value = window.scrollY > 300;
  });
  window.addEventListener('resize', handleResize);
  document.addEventListener('click', onMdPreviewMediaClick);
  watch(() => route.params.slug, handleSlug);

  await handleSlug(route.params.slug);
  await nextTick();
  initSplitIfNeeded();
  await nextTick();
  await scrollToRouteHash();
});

watch(
  () => [selecteddoc.value?.html, editMode.value, props.isNewDoc],
  async () => {
    await refreshMermaidInPreview();
  },
  { flush: 'post' }
);

watch(darkMode, async () => {
  applyMermaidTheme();
  await refreshMermaidInPreview();
});

/**
 * Safe querySelector for anchors: CSS selectors cannot start with a digit
 * (e.g. `#1-overview` is invalid). Fall back to getElementById which has
 * no such restriction.
 */
function safeQueryHash(hash) {
  if (!hash || hash === '#') return null;
  const id = hash.startsWith('#') ? hash.slice(1) : hash;
  // Try getElementById first — works for any id string
  const byId = document.getElementById(id);
  if (byId) return byId;
  // Fall back to querySelector only for ids that are safe selectors
  try {
    return document.querySelector(hash);
  } catch {
    return null;
  }
}

async function scrollToRouteHash() {
  const hash = route.hash;
  if (!hash || hash === '#') return;
  for (let i = 0; i < 12; i += 1) {
    const el = safeQueryHash(hash);
    if (el) {
      const pane = rightPane.value;
      if (pane && pane.contains(el) && pane !== el) {
        const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 8;
        const top = el.getBoundingClientRect().top - pane.getBoundingClientRect().top + pane.scrollTop - margin;
        pane.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      return;
    }
    await nextTick();
    await new Promise((r) => requestAnimationFrame(r));
  }
}

watch(
  () => route.hash,
  async (hash) => {
    if (!hash) return;
    await nextTick();
    await scrollToRouteHash();
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('click', onMdPreviewMediaClick);
  if (copyButtonsListenerRegistered) {
    document.body.removeEventListener('click', onDocsCopyButtonClick);
    copyButtonsListenerRegistered = false;
  }
  destroySplit();
});
</script>

<style>
.docs-content h1,
.docs-content h2,
.docs-content h3,
.docs-content h4,
#top {
  scroll-margin-top: 0.5rem;
}

@media (max-width: 767.98px) {
  .docs-content h1,
  .docs-content h2,
  .docs-content h3,
  .docs-content h4,
  #top {
    scroll-margin-top: 0.5rem;
  }
}

svg[id^="mermaid-"] {
  display: block;
  margin: 0 auto;
}

/* Mermaid dark mode — let Mermaid's own 'dark' theme handle colours;
   only override the SVG container background so it blends with the page. */
[data-bs-theme='dark'] .mermaid svg {
  background: transparent !important;
}

/* ---------- General Markdown Styling ---------- */
/* 1. Ensure the checkbox input itself is not clickable */
.md-preview .task-list-item input[type="checkbox"] {
  pointer-events: none !important;
  cursor: default !important;
}

/* 🎯 NEW: Disable the label element, which is the main clickable area */
.md-preview .task-list-item-label {
  pointer-events: none !important;
  cursor: default !important;
}

/* If the whole list item is catching clicks, use this high-specificity rule */
.md-preview li.task-list-item {
  cursor: default !important;
}

/* Disable interactivity on the checklist items */
.md-preview .task-list-item input[type="checkbox"],
.md-preview .task-list-item-label {
  /* Absorb all mouse clicks to prevent checking/unchecking */
  pointer-events: none !important;
  cursor: default !important;
}

/* Inject a space between the checkbox and the label text */
.md-preview .task-list-item-checkbox+.task-list-item-label::before {
  /* Inject a non-breaking space */
  content: "\00a0";
}

/* SHIKI CSS
  Keep your custom copy-button and layout rules, but remove HLJS specific overrides.
  Shiki's output will have a class like `shiki` on the `<pre>` tag.
  It manages background and colors via inline styles and CSS variables.
*/

.md-preview pre {
  margin: 1rem 0.5rem !important;
  border-radius: 6px;
  overflow: auto;
  box-sizing: border-box;
}

/* Ensure consistent monospace font */
.md-preview pre code {
  display: block;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  white-space: pre;
}

/* Copy button inside each code block - MUST BE KEPT */
.md-preview pre {
  position: relative;
  width: 100%;
  overflow-x: auto;
}

/* Edit button fixed to top-right of docs-content */
.docs-content {
  position: relative;
}

/* Edit/Delete fixed top-right — desktop only */
@media (min-width: 768px) {
  .docs-content .edit-btn {
    position: fixed;
    top: 4.3rem;
    right: 1.5rem;
    z-index: 9999;
    transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  }

  .docs-content .delete-btn {
    position: fixed;
    top: 4.3rem;
    right: 7rem;
    z-index: 9999;
    transition: opacity 0.2s ease-in-out, transform 0.2s ease-in-out;
  }

  .docs-content .edit-btn:hover {
    opacity: 1;
    transform: scale(1.05);
  }
}

.md-preview img {
  max-height: 350px;
  max-width: 85% !important;
  width: auto;
  height: auto;
  display: block;
  margin: 2rem auto !important;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  object-fit: contain;

  cursor: zoom-in;
  transition: transform 0.2s ease;
}

/* What's New / release-note media — allow taller screenshots & GIFs */
.md-preview img[src*="/docs-media/whats-new/"],
.md-preview img[src*="media/whats-new/"] {
  max-height: 520px;
  max-width: 100% !important;
}

.md-preview video {
  display: block;
  max-width: 100%;
  max-height: 520px;
  margin: 2rem auto;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  background: #111;
}

/* When zoomed */
.md-preview img.enlarged {
  cursor: zoom-out;
  transform: scale(2);
  /* Adjust zoom level */
  transform-origin: center;
  /* Zoom from center */
  z-index: 10;
  position: relative;
}

/* Make sure Edit button always stays above code overlay */
.docs-content .btn.float-end {
  position: relative;
  z-index: 5;
}

.code-block {
  position: relative;
}

.copy-btn {
  position: absolute;
  top: 5px !important;
  right: 5px !important;
  opacity: 0.2 !important;
  transition: opacity 0.2s ease-in-out !important;
  z-index: 2;
  background: transparent;
  border: none;
  cursor: pointer;
}

.copy-btn:hover {
  opacity: 1 !important;
}

/* Default (light mode) */
.md-preview blockquote {
  border-left: 4px solid #17dcff;
  padding: 0.5rem 1rem;
  margin: 1rem 0.5rem;
  font-style: italic;
  background-color: #f9f9f9;
  /* light gray */
  color: #212529;
  /* dark text */
  border-radius: 0.25rem;
}

/* Dark mode */
[data-bs-theme='dark'] .md-preview blockquote {
  background-color: #333333;
  color: #e9ecef;
}

/* ---------- Alert boxes ---------- */

div .alert {
  margin: 1rem 0.5rem !important;
}

.md-preview table {
  width: 100%;
  border-collapse: collapse;
  /* ensures borders are shared */
  margin: 1rem 0;
  font-size: 0.95rem;
  table-layout: auto;
}

.md-preview th,
.md-preview td {
  border: 1px solid rgba(0, 0, 0, 0.1);
  /* shared border */
  padding: 0.5rem 0.75rem;
  text-align: left;
  color: var(--bs-body-color, #212529);
}

.md-preview th {
  background-color: #f1f3f5;
  /* slightly darker than even rows */
  font-weight: 600;
  border-bottom: 2px solid rgba(0, 0, 0, 0.15);
  /* emphasize separation from rows */
}

.md-preview tr:nth-child(even) td {
  background-color: rgba(0, 0, 0, 0.02);
}

.md-preview tr:hover td {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Dark mode — follow app theme (data-bs-theme), not OS prefers-color-scheme */
[data-bs-theme='dark'] .md-preview th {
  background-color: #444;
  color: var(--bs-body-color, #e9ecef);
  border-bottom: 2px solid rgba(255, 255, 255, 0.2);
}

[data-bs-theme='dark'] .md-preview td {
  border-color: rgba(255, 255, 255, 0.1);
  color: var(--bs-body-color, #e9ecef);
}

[data-bs-theme='dark'] .md-preview tr:nth-child(even) td {
  background-color: rgba(255, 255, 255, 0.05);
}

[data-bs-theme='dark'] .md-preview tr:hover td {
  background-color: rgba(255, 255, 255, 0.1);
}

/* Split.js gutter: 8px hit target, visual 1px divider (not a grey slab) */
.gutter.gutter-horizontal {
  width: 8px !important;
  cursor: col-resize;
  background-color: transparent !important;
  box-shadow: none;
  position: relative;
  z-index: 10;
}

.gutter.gutter-horizontal::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 1px;
  transform: translateX(-50%);
  background-color: var(--bs-border-color, #dee2e6);
  pointer-events: none;
}

.gutter.gutter-horizontal:hover::after {
  background-color: var(--bs-secondary-color, #6c757d);
}

.md-preview a[target="_blank"]::after {
  content: "\f144"; /* bi-arrow-up-right — geometric ↗, no box */
  font-family: "bootstrap-icons";
  font-size: 0.75em;
  margin-left: 0.2em;
  vertical-align: baseline;
  text-decoration: none;
}

#top {
  scroll-margin-top: 20px;
  /* offset for fixed toolbar */
}


/* Ensure the wrapper uses the full dimensions for relative positioning */
.code-block {
  position: relative;
}

.md-preview pre {
  margin: 1rem 0.5rem !important;
  /* Keep your spacing */
  border-radius: 6px;
  /* Keep your radius */
  overflow: auto;
  box-sizing: border-box;
}

.md-preview pre.shiki-themes {
  /* * 1. Set a distinct background for light mode
     * Use a subtle light gray color (like GitHub's standard) 
     */
  background-color: #f6f8fa !important;
  /* GitHub's light code background */

  /* 2. Add a border or subtle shadow for definition */
  border: 1px solid #e1e4e8;
  /* Light gray border */
  border-radius: 6px;

  /* 3. Ensure proper spacing */
  padding: 1em !important;
  margin: 1rem 0.5rem !important;
  overflow: auto;

  max-height: 350px;
  /* <--- Set your desired maximum height here */
  overflow-y: auto;
  /* <--- Enable vertical scrollbar when height is exceeded */

  /* Keep existing property for horizontal overflow */
  overflow-x: auto;

  box-sizing: border-box;
}

/* Override Shiki's inline light theme with its dark theme variables when app theme is dark. */
[data-bs-theme='dark'] .md-preview pre.shiki-themes {
  background-color: var(--shiki-dark-bg) !important;
  color: var(--shiki-dark) !important;
  border: 1px solid #555;
}

[data-bs-theme='dark'] .md-preview pre.shiki-themes span {
  color: var(--shiki-dark) !important;
}

.md-editor-fullscreen {
  top: calc(var(--app-navbar-height, 52px) + var(--app-shell-py, 1rem)) !important;
  height: calc(100vh - var(--app-navbar-height, 52px) - var(--app-shell-py, 1rem)) !important;
  z-index: 1050 !important;
}

/* Standard sidebar link style — desktop aside only; mobile uses DocsSidebarNav */
.docs-sidebar .sidebar-link,
.docs-sidebar .list-unstyled a {
  color: var(--bs-link-color);
  /* Uses the standard Bootstrap link blue */
  text-decoration: none;
  display: block;
  padding: 2px 0;
  transition: color 0.2s;
}

/* Active state (for all items including Home/Search) */
.docs-sidebar .active-link,
.docs-sidebar .list-unstyled a.fw-bold {
  color: var(--w4h-active-fg) !important;
  font-weight: 700 !important;
  border-left: 3px solid var(--w4h-gold);
  padding-left: 0.4rem !important;
  margin-left: -0.4rem;
}

/* Hover state */
.docs-sidebar .sidebar-link:hover,
.docs-sidebar .list-unstyled a:hover {
  color: var(--bs-link-hover-color);
  /* text-decoration: underline !important; */
}
</style>

<style scoped>
.story-meta-footer {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(248, 249, 250, 0.9);
  /* light gray (Bootstrap secondary bg tone) */
  color: #6c757d;
  /* Bootstrap text-secondary */
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  z-index: 2000;
  pointer-events: none;
  /* don't block clicks */
}

/* "Last updated by … on …" footer under each doc */
.doc-last-edited {
  font-size: 0.85rem;
  color: var(--bs-secondary-color, #6c757d);
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  margin-top: 1.5rem;
  padding-top: 0.75rem;
}

/* Layout for Split.js panes — fill padded main, do not re-count navbar */
.docs-split {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  height: auto;
  gap: 0;
  overflow: hidden;
}

/* left sidebar */
.docs-sidebar {
  overflow: auto;
  min-width: 150px;
  /* hard floor */
  max-width: 600px;
  width: 280px;
  /* initial fallback */
  padding: 0.5rem 1rem;
  box-sizing: border-box;
  background: var(--bs-body-bg);
}

/* small-screen: sidebar hidden via d-none d-md-block; nav via fixed subnav */
@media (max-width: 767.98px) {
  .docs-split {
    display: block;
    height: auto;
    overflow: visible;
  }

  .docs-split--subnav {
    padding-top: var(--docs-subnav-height, 2.5rem);
  }

  .docs-content {
    padding: 0;
  }
}

/* Fixed subnav directly under main navbar (Vue docs pattern) */
.docs-subnav {
  --docs-subnav-height: 2.5rem;
  position: fixed;
  top: var(--app-navbar-height, 44px);
  left: 0;
  right: 0;
  z-index: 1020;
  height: var(--docs-subnav-height);
  background: var(--bs-body-bg);
}

.docs-subnav .container-fluid {
  height: 100%;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

.docs-subnav-btn {
  color: var(--bs-body-color);
  text-decoration: none;
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
  line-height: 1.5;
}

.docs-subnav-btn:disabled {
  opacity: 0.5;
  pointer-events: none;
}

/* keep your link styling */
aside a.text-decoration-none {
  text-decoration: none !important;
  cursor: pointer;
}

.gutter.gutter-horizontal {
  cursor: col-resize;
  background-color: transparent;
  box-shadow: none;
  position: relative;
  z-index: 10;
}

.gutter {
  pointer-events: all !important;
}

.docs-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.docs-content {
  flex: 1 1 auto;
  min-width: 0;
  width: auto;
  overflow-x: hidden;
  overflow-y: auto;
  scroll-behavior: smooth;
}

/* Keep code blocks scrollable internally, not the whole page */
:deep(.md-preview pre) {
  max-width: 100%;
  /* margin-bottom: 1rem !important; */
  margin: 1rem 0.5rem !important;
}

:deep(.md-preview code),
:deep(.md-preview table) {
  max-width: 100%;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  padding: 5px !important;
}

.docs-sidebar a.disabled {
  pointer-events: none !important;
  cursor: default !important;
  color: var(--bs-secondary-color) !important;
  /* optionally dim */
}

.disabled-link {
  pointer-events: none;
  color: #6c757d !important;
  /* Bootstrap text-muted color */
  opacity: 0.6;
}

.back-to-top-fade {
  position: fixed;
  bottom: 0.6rem;
  right: 2rem;
  z-index: 2000;
  opacity: 0.8;
  transition: opacity .2s;
}

.back-to-top-fade:hover {
  opacity: 1;
}

/* Sidebar TOC link styling */
.toc-link {
  transition: color 0.2s ease;
  cursor: pointer;
  /* Default hand cursor */
}

/* State when user is editing */
.toc-link.is-disabled {
  color: var(--bs-secondary-color) !important;
  opacity: 0.5;
  cursor: not-allowed !important;
  /* The "circle with a line" cursor */
  text-decoration: none !important;
}

/* Ensure the parent <a> for the main document also reflects this */
aside a.text-decoration-none.is-disabled {
  cursor: not-allowed !important;
  opacity: 0.6;
}

/* Sidebar links when disabled */
.docs-sidebar a.is-disabled {
  color: #adb5bd !important;
  /* Muted gray */
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  pointer-events: auto !important;
  /* Ensure the mouse can actually "see" it to show the cursor */
}

/* Specifically for the TOC items to ensure they inherit the behavior */
.toc-link.is-disabled {
  color: #adb5bd !important;
  cursor: not-allowed !important;
}
</style>