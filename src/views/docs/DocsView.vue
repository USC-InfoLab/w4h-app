<template>
  <main class="container-fluid p-0">
    <div ref="splitRoot" class="docs-split">
      <aside v-if="!hideSidebar" ref="leftPane" class="docs-sidebar border-end">
        <div class="position-sticky" style="top: 1rem;">

          <div v-if="isAdminUI" class="d-flex flex-column gap-1">
            <button class="btn btn-primary btn-sm" @click="goToNewDoc" :disabled="editMode">
              <i class="bi bi-plus-lg"></i> New Doc
            </button>
            <button type="button" class="btn btn-outline-secondary btn-sm" :disabled="editMode"
              @click="downloadMarkdownZip">
              <i class="bi bi-file-earmark-zip"></i> Export Markdown
            </button>
          </div>

          <div v-if="isAdminUI" class="py-1 px-2 border-bottom my-0">
          </div>

          <RouterLink :to="{ name: 'docs', params: { slug: 'home' } }" custom v-slot="{ navigate, href }">
            <a :href="href" @click.prevent="!editMode && navigate()" class="sidebar-link mb-1" :class="[
              (route.path === '/docs' || route.params?.slug === 'home') ? 'active-link' : '',
              { 'is-disabled': editMode }
            ]">
              🏠 Home
            </a>
          </RouterLink>

          <RouterLink :to="{ name: 'docs', params: { slug: 'search' } }" custom v-slot="{ navigate, href }">
            <a :href="href" @click.prevent="!editMode && navigate()" class="sidebar-link mb-0" :class="[
              route.params.slug === 'search' ? 'active-link' : '',
              { 'is-disabled': editMode }
            ]">
              🔍 Search
            </a>
          </RouterLink>

          <div class="py-1 px-2 border-bottom my-0">
          </div>

          <ul class="list-unstyled mb-3">
            <li v-for="(docs, type) in groupedDocs" :key="type" class="mb-2">
              <div v-if="type !== 'top'" class="fw-bold text-uppercase small text-muted mb-1">
                {{ formatDocType(type) }}
              </div>

              <ul class="list-unstyled">
                <li v-for="doc in docs" :key="doc.slug">

                  <div>
                    <a href="#" @click.prevent="
                      !editMode &&
                      (doc.toc && doc.toc.length
                        ? toggledoc(doc.slug)
                        : $router.push({ name: 'docs', params: { slug: doc.slug }, hash: '#top' })
                      )
                      " class="text-decoration-none" :class="[
                        route.params.slug === doc.slug ? 'fw-bold text-decoration-none' : '',
                        { 'is-disabled': editMode }
                      ]">
                      {{ stripHTML(doc.title) }}
                      <span v-if="doc.toc && doc.toc.length">
                        {{ opendocs.includes(doc.slug) ? '▾' : '▸' }}
                      </span>
                    </a>

                    <ul class="list-unstyled small mb-3" v-if="opendocs.includes(doc.slug)">
                      <template v-if="doc.toc?.length">
                        <li v-for="item in doc.toc" :key="item.id"
                          :style="{ marginLeft: 0.5 + (item.level - 2) * 0.5 + 'rem' }">
                          <router-link
                            :to="{ name: 'docs', params: { slug: doc.slug }, hash: '#' + (item.id || docsHeadingHashId(item.title)) }"
                            custom v-slot="{ navigate, href }">
                            <a :href="href" @click.prevent="!editMode && navigate()"
                              class="text-decoration-none d-block toc-link" :class="{ 'is-disabled': editMode }">
                              {{ item.title }}
                            </a>
                          </router-link>
                        </li>
                      </template>
                      <li v-else>
                        <router-link :to="{ name: 'docs', params: { slug: doc.slug }, hash: '#top' }"
                          class="text-decoration-none d-block">
                          <i class="bi bi-file-earmark-text"></i> Open Document
                        </router-link>
                      </li>
                    </ul>
                  </div>
                </li>
              </ul>
            </li>
          </ul>

        </div>
      </aside>

      <div ref="rightPane" class="docs-content" id="top">
        <template v-if="isAdminUI && isEditing">

          <Suspense>
            <MdDocEditable :slug="route.params.slug ?? null" :is-new="props.isNewDoc" @saved="onDocSaved"
              @close="exitEditMode" />
          </Suspense>
        </template>

        <template v-else>
          <div v-if="route.params?.slug === 'search'">
            <DocsSearch />
          </div>

          <div v-else-if="selecteddoc">
            <div v-if="isAdminUI" class="text-primary ps-2">
              <button class="btn btn-sm btn-primary edit-btn me-2" @click="editMode = true">
                <i class="bi bi-pencil me-1"></i> Edit
              </button>
              <button type="button" class="btn btn-sm delete-btn btn-danger" @click="openDeleteModal(selecteddoc)">
                Delete
              </button>
            </div>

            <div :key="selecteddoc.slug" v-html="selecteddoc.html" class="md-preview p-3"></div>
          </div>

        </template>

        <a href="#top" v-show="showBackToTop" class="btn btn-secondary btn-sm back-to-top-fade">↑ Top</a>
      </div>
    </div>

    <DocsDeleteDocModal :show="showDeleteModal" :doc="docToDelete" @close="showDeleteModal = false"
      @deleted="handleDeleted" />
  </main>
</template>

<script setup>
import { ref, watch, onMounted, computed, onBeforeUnmount, nextTick } from 'vue';
import Split from 'split.js';
import mermaid from 'mermaid';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';
import { stripHTML } from '../../utils/toc';
import { docsHeadingHashId } from '@/utils/docsHeadingId';

import DocsDeleteDocModal from '@/components/DocsDeleteDocModal.vue';
import DocsSearch from '@/components/DocsSearch.vue';

mermaid.initialize({ startOnLoad: false, theme: 'default' });

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
const uiStore = useUIStore();

import MdDocEditable from '@/components/MdDocEditable.vue';

const editMode = ref(false);

const allDocs = ref([]);
const opendocs = ref([]);
const selecteddoc = ref(null);

const splitRoot = ref(null);
const leftPane = ref(null);
const rightPane = ref(null);
let splitInstance = null;

const isAdminUI = computed(() => user.value.role === 'admin' && uiStore.isAdminUI);
const hideSidebar = computed(() => selecteddoc.value?.show_in_docs === false && selecteddoc.value?.slug !== 'home');


function goToNewDoc() {
  router.push({ name: 'docNew' });
}

async function downloadMarkdownZip() {
  try {
    const res = await api.get('/docs/export', {
      ...authHeaders(),
      responseType: 'blob',
    });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'w4h-docs-bundle.zip';
    a.rel = 'noopener';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Export markdown zip failed', e);
  }
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
    groups[type].sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));
  }

  // optionally sort topDocs too
  topDocs.sort((a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title));

  return { 'top': topDocs, ...groups };
});

// helper to display labels nicely
function formatDocType(type) {
  switch (type) {
    case '': return '';
    case 'guide': return 'Guides';
    case 'reference': return 'Reference';
    case 'tutorial': return 'Tutorials';
    case 'faq': return 'FAQs';
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
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
    const el = document.querySelector(route.hash);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
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

function initSplitIfNeeded() {
  // destroy existing instance first
  if (splitInstance && splitInstance.destroy) {
    try { splitInstance.destroy(); } catch { /* ignore */ }
    splitInstance = null;
  }

  // Only init split on desktop widths (optional)
  if (!leftPane.value || !rightPane.value || hideSidebar.value) {
    // full width for right pane if no sidebar
    if (rightPane.value) rightPane.value.style.width = '100%';
    return;
  }

  if (window.innerWidth < 768) {
    // small screen: do not create Split; let CSS handle stacking
    leftPane.value.style.width = '';
    rightPane.value.style.width = '';
    return;
  }

  const persisted = localStorage.getItem('docs.split.sizes');
  const sizes = persisted ? JSON.parse(persisted) : [25, 75];

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
  if (!slug) {
    const res = await api.get(`/docs`, authHeaders());

    if (isAdminUI.value) {
      allDocs.value = res.data; // show all docs to admin
    } else {
      allDocs.value = res.data.filter(c => c.hidden === false);

      // filter -datasets for user city
      const userCity = user.value.city_id;
      allDocs.value = allDocs.value.filter(doc => {
        if (doc.slug.endsWith('-datasets')) {
          const docCity = doc.slug.replace('-datasets', '').toLowerCase();
          return docCity === userCity.toLowerCase();
        }
        return true;
      });
    }

    //goHome();
  } else {
    const res = await api.get(`/docs/${slug}`, authHeaders());
    const doc = res.data;

    if (!allDocs.value.length) {
      const listRes = await api.get(`/docs`, authHeaders());
      if (isAdminUI.value) {
        allDocs.value = listRes.data; // show all docs to admin
      } else {
        allDocs.value = listRes.data.filter(c => c.hidden === false);

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

  handleSlug(route.params.slug);

  window.addEventListener('scroll', () => {
    showBackToTop.value = window.scrollY > 300;
  });

  // Wait for DOM refs to be available
  await nextTick();

  initSplitIfNeeded();
  window.addEventListener('resize', handleResize);
  document.addEventListener('click', onMdPreviewMediaClick);
  watch(() => route.params.slug, handleSlug);
});

watch(
  () => [selecteddoc.value?.html, editMode.value, props.isNewDoc],
  async () => {
    await refreshMermaidInPreview();
  },
  { flush: 'post' }
);

watch(
  () => route.hash,
  async (hash) => {
    if (!hash) return
    await nextTick()
    const el = document.querySelector(hash)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }
)

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  document.removeEventListener('click', onMdPreviewMediaClick);
  if (copyButtonsListenerRegistered) {
    document.body.removeEventListener('click', onDocsCopyButtonClick);
    copyButtonsListenerRegistered = false;
  }
  if (splitInstance && splitInstance.destroy) {
    try { splitInstance.destroy(); } catch { /* ignore */ }
    splitInstance = null;
  }
});
</script>

<style>
.docs-content h1,
.docs-content h2,
.docs-content h3,
.docs-content h4,
#top {
  /* Include #top just to be safe */
  scroll-margin-top: 56px;
}

svg[id^="mermaid-"] {
  display: block;
  margin: 0 auto;
}

@media (prefers-color-scheme: dark) {
  .mermaid svg {
    background: transparent !important;
  }

  .mermaid p {
    color: #ccc !important;
  }

  .mermaid rect,
  .mermaid polygon {
    fill: #2e2e2e !important;
    stroke: #ccc !important;
  }

  .mermaid path {
    fill: #2e2e2e !important;
    stroke: #ccc !important;
  }

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

/* Keep Edit button fixed to top-right of the viewport */
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

/* Slight hover feedback */
.docs-content .edit-btn:hover {
  opacity: 1;
  transform: scale(1.05);
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
@media (prefers-color-scheme: dark) {
  .md-preview blockquote {
    background-color: #333333;
    color: #e9ecef;
  }
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
}

.md-preview th {
  background-color: #f1f3f5;
  /* slightly darker than even rows */
  font-weight: 600;
  color: #212529;
  border-bottom: 2px solid rgba(0, 0, 0, 0.15);
  /* emphasize separation from rows */
}

.md-preview tr:nth-child(even) td {
  background-color: rgba(0, 0, 0, 0.02);
}

.md-preview tr:hover td {
  background-color: rgba(0, 0, 0, 0.05);
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  .md-preview th {
    background-color: #444;
    color: #e9ecef;
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
  }

  .md-preview td {
    border-color: rgba(255, 255, 255, 0.1);
    color: #e9ecef;
  }

  .md-preview tr:nth-child(even) td {
    background-color: rgba(255, 255, 255, 0.05);
  }

  .md-preview tr:hover td {
    background-color: rgba(255, 255, 255, 0.1);
  }
}

/* Split.js gutter styling */
.gutter.gutter-horizontal {
  width: 4px !important;
  /* same as before */
  cursor: col-resize;
  background-color: rgba(35, 35, 35, 0.5) !important;
  /* light gray visible gutter */
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.05);
  /* subtle inner line */
  position: relative;
  z-index: 10;
  transition: background-color 0.2s ease;
}

.gutter.gutter-horizontal:hover {
  background-color: rgba(0, 0, 0, 0.2) !important;
  /* darker on hover */
}

/* .md-preview a[target="_blank"]::after {
  content: "\f08e";
  font-family: "bootstrap-icons";
  display: inline-block;
  margin-left: 0.25rem;
  vertical-align: text-bottom;
} */

.md-preview a[target="_blank"]::after {
  content: "\F1C5";
  /* Unicode for box-arrow-up-right */
  font-family: "bootstrap-icons";
  margin-left: 0.25rem;
  vertical-align: text-bottom;
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

/* 🎯 FIX: Override Shiki's inline light theme with its dark theme variables 
          when the user prefers dark mode. */
@media (prefers-color-scheme: dark) {

  /* 1. Force the main container background and default color */
  .md-preview pre.shiki-themes {
    /* This should already be working for background */
    background-color: var(--shiki-dark-bg) !important;
    color: var(--shiki-dark) !important;
    border: 1px solid #555;
    /* Darker border for definition */

    /* 🚨 NEW: Explicitly set the top-level foreground color to the dark variable,
                  using !important to beat the inline light color property. */
    color: var(--shiki-dark) !important;
  }

  /* 2. Target the token spans inside the PRE block.
          This tells the browser to use the dark color variable for individual tokens 
          that are not specifically colored by Shiki's light theme inline style. */
  .md-preview pre.shiki-themes span {
    color: var(--shiki-dark) !important;
  }
}

.md-editor-fullscreen {
  top: 56px !important;
  /* match your menu bar height */
  height: calc(100vh - 56px) !important;
  z-index: 1050 !important;
  /* just above the navbar, below modals if any */
}

/* Standard sidebar link style (for all items) */
.sidebar-link,
.list-unstyled a {
  color: var(--bs-link-color);
  /* Uses the standard Bootstrap link blue */
  text-decoration: none;
  display: block;
  padding: 2px 0;
  transition: color 0.2s;
}

/* Active state (for all items including Home/Search) */
.active-link,
.list-unstyled a.fw-bold {
  color: var(--bs-primary) !important;
  /* Force the bright blue */
  font-weight: 700 !important;
}

/* Hover state */
.sidebar-link:hover,
.list-unstyled a:hover {
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

/* Layout for Split.js panes */
.docs-split {
  display: flex;
  height: calc(100vh - 56px);
  /* <--- THIS IS THE FIX */
  /* adjust to taste */
  gap: 0;
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

/* small-screen fallback: stack panes vertically */
@media (max-width: 767.98px) {
  .docs-split {
    display: block;
    height: auto;
  }

  .docs-sidebar {
    display: none;
    /* keep mobile behavior like your previous .d-none d-md-block */
  }

  .docs-content {
    padding: 1rem;
  }
}

/* keep your link styling */
aside a.text-decoration-none {
  text-decoration: none !important;
  cursor: pointer;
}

.gutter.gutter-horizontal {
  /* width: 12px; */
  /* slightly wider */
  cursor: col-resize;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.02);
  position: relative;
  z-index: 10;
  /* sit above sidebar content */
  transition: background-color 0.2s ease;
}

.gutter.gutter-horizontal:hover {
  background-color: rgba(0, 0, 0, 0.08);
}

.gutter {
  pointer-events: all !important;
}

/* .docs-content::-webkit-scrollbar {
  width: 8px;
} */

.docs-content::-webkit-scrollbar-thumb {
  background-color: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.docs-content {
  overflow: overlay;
  scroll-behavior: smooth;
  /* padding: 1rem; */
}

/* Prevent global horizontal scroll on docs page */
.docs-split {
  overflow-x: hidden;
}

/* Prevent horizontal scroll inside right pane */
.docs-content {
  overflow-x: hidden;
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