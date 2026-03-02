<template>
  <DocsSettingsModal v-model:doc="doc" />

  <div class="modal fade" id="dirtyCheckModal" tabindex="-1" aria-labelledby="dirtyCheckModalLabel" aria-hidden="true">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title" id="dirtyCheckModalLabel">Unsaved Changes</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          You have unsaved changes. Are you sure you want to close without saving?
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-primary" @click="confirmClose">Close Anyway</button>
        </div>
      </div>
    </div>
  </div>

  <MdEditor ref="mdEditorRef" v-model="doc.md" language="en-US" :toolbarsExclude="['github']" :toolbars="toolbars"
    :theme="mdEditorTheme" :preview="false" @onUploadImg="handleImageUpload" @onSave="handleEditorSave"
    class="editor-fullscreen">
    <template #defToolbars>
      <input v-model="doc.title" type="text" class="form-control form-control-sm ms-2" placeholder="Untitled"
        style="min-width: 180px" />

      <button class="btn btn-sm btn-primary ms-2" @click="openSettingsModal">
        <i class="bi bi-gear"></i>
      </button>

      <button class="btn btn-sm btn-primary ms-2 text-nowrap flex-shrink-0" :disabled="!isDirty"
        @click="handleEditorSave(doc.md)">
        <i class="bi bi-save"></i>
        Save
      </button>
      <button class="btn btn-sm btn-secondary mx-2 text-nowrap flex-shrink-0" @click="handleEditorClose">
        <i class="bi bi-x-lg"></i>
        Close
      </button>
    </template>
  </MdEditor>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, computed, nextTick, watch } from 'vue';
import { useRouter } from 'vue-router'; // Added
import { MdEditor } from 'md-editor-v3';
import 'md-editor-v3/lib/style.css';
import { config } from 'md-editor-v3';
import MarkdownItTaskLists from 'markdown-it-task-lists';
import DocsSettingsModal from './DocsSettingsModal.vue';
import MarkdownIt from 'markdown-it';
import markdownItAnchor from 'markdown-it-anchor';
import markdownItAttrs from 'markdown-it-attrs';
import Shiki from '@shikijs/markdown-it';
import { Modal } from 'bootstrap';
import { onBeforeRouteLeave } from 'vue-router';
import { api, authHeaders } from '@/utils/api';
import { generateTOC } from '../utils/toc';
import mermaid from 'mermaid';

// Initialize Mermaid
mermaid.initialize({ startOnLoad: false, theme: 'default' });

const router = useRouter(); // Added

const props = defineProps({
  slug: { type: String, default: null },
  isNew: { type: Boolean, default: false }
});
const emit = defineEmits(['saved', 'close']);

const mdEditorRef = ref(null);
const mdEditorTheme = ref('light');
const originalDoc = ref(null);
const dirtyCheckModalInstance = ref(null);
const settingsModalInstance = ref(null);

const doc = ref({
  title: '',
  slug: '',
  card_title: '',
  description: '',
  action_label: 'Open',
  is_feature_card: true,
  show_in_docs: true,
  doc_type: 'other',
  sort_order: 0,
  card_order: 0,
  hidden: false,
  html: '',
  md: '',
  toc: []
});

const toolbars = [
  'bold', 'underline', 'italic', '-', 'title', 'strikeThrough', 'quote', 'unorderedList',
  'orderedList', 'task', '-', 'codeRow', 'code', 'link', 'image', 'table', 'mermaid', '-',
  'revoke', 'next', '-', 'pageFullscreen', 'fullscreen', 'preview', 'previewOnly',
  'htmlPreview', 'catalog', '-', 0, 1, '=', 2, 3
];

// --- MARKDOWN SETUP ---

const supportedLanguages = ['plaintext', 'json', 'js', 'html', 'shell', 'bash', 'sql', 'md'];

config({
  markdownItConfig(mdit) {
    mdit.use(markdownItAttrs);
  }
});

// Using a standard variable for md instance to be populated in onMounted
let md;

// --- FUNCTIONS ---

const handleImageUpload = async (files, callback) => {
  try {
    const baseUrl = import.meta.env.VITE_API_URL;
    const headers = { 'Content-Type': 'multipart/form-data', ...authHeaders().headers };

    const uploadPromises = files.map(async (file) => {
      const form = new FormData();
      form.append('image', file);
      return api.post(`${baseUrl}news/uploadImages`, form, { headers });
    });

    const imagePathResponses = await Promise.all(uploadPromises);
    const uploadedImageUrls = imagePathResponses.map(res => `${import.meta.env.VITE_API_URL}${res.data.imagePath}`);

    callback(uploadedImageUrls);
  } catch (error) {
    console.error('Error uploading images:', error);
  }
};

watch(() => doc.value.title, (newTitle) => {
  if (props.isNew) {
    doc.value.slug = slugify(newTitle);
  }
});

const handleEditorSave = async (markdown) => {
  if (!doc.value.title?.trim()) {
    return; // optionally show UI error
  }


  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  const processedMarkdown = markdown
    .replace(/(?<!\\)\{\{APP_URL\}\}/g, appUrl)
    .replace(/\\(\{\{APP_URL\}\})/g, '$1');

  const finalHtml = md.render(processedMarkdown);

  const tmp = document.createElement('div');
  tmp.innerHTML = finalHtml;

  const mermaidDivs = tmp.querySelectorAll('.mermaid');
  for (let div of mermaidDivs) {
    const svg = await mermaid.render(div.id, div.textContent);
    div.innerHTML = svg.svg;
  }

  doc.value.html = tmp.innerHTML;
  doc.value.toc = generateTOC(markdown);
  doc.value.md = markdown;

  try {
    // Slug is already there thanks to the watcher!
    const res = await api.put(`/docs/${doc.value.slug}`, doc.value, authHeaders());

    doc.value = res.data;
    originalDoc.value = JSON.parse(JSON.stringify(doc.value));

    if (props.isNew) {
      router.replace({ name: 'docs', params: { slug: doc.value.slug } });
    }
    emit('saved', doc.value);
  } catch (err) {
    console.error('Save failed:', err);
  }
};

const isDirty = computed(() => {
  if (!originalDoc.value) return false;
  return JSON.stringify(doc.value) !== JSON.stringify(originalDoc.value);
});

function setupCopyButtons() {
  document.body.addEventListener("click", async (e) => {
    const btn = e.target.closest(".copy-btn");
    if (btn) {
      const code = decodeURIComponent(btn.getAttribute("data-code"));
      try {
        await navigator.clipboard.writeText(code);
        btn.innerHTML = '<i class="bi bi-check"></i>';
        setTimeout(() => { btn.innerHTML = '<i class="bi bi-files"></i>'; }, 2000);
      } catch (err) {
        console.error("Copy failed", err);
      }
    }
  });
}

function openSettingsModal() {
  const modalEl = document.getElementById('settingsModal');
  if (modalEl) {
    settingsModalInstance.value = new Modal(modalEl);
    settingsModalInstance.value.show();
  }
}

function handleEditorClose() {
  if (isDirty.value) {
    if (!dirtyCheckModalInstance.value) {
      dirtyCheckModalInstance.value = new Modal(document.getElementById('dirtyCheckModal'));
    }
    // Ensure we don't have a leftover route callback if opened manually
    dirtyCheckModalInstance.value._nextRoute = null;
    dirtyCheckModalInstance.value.show();
  } else {
    emit('close');
  }
}

function confirmClose() {
  console.log('Confirming close...');

  // 1. Hide the modal via Bootstrap API
  if (dirtyCheckModalInstance.value) {
    dirtyCheckModalInstance.value.hide();
  }

  // 2. IMPORTANT: Mark it as not dirty so guards don't re-trigger
  originalDoc.value = JSON.parse(JSON.stringify(doc.value));

  // 3. Handle Route Navigation vs Component Close
  if (dirtyCheckModalInstance.value?._nextRoute) {
    console.log('Continuing navigation');
    const next = dirtyCheckModalInstance.value._nextRoute;
    dirtyCheckModalInstance.value._nextRoute = null;
    next();
  } else {
    console.log('Emitting close to parent');
    emit('close');
  }
}

onBeforeRouteLeave((to, from, next) => {
  if (isDirty.value) {
    if (!dirtyCheckModalInstance.value) {
      dirtyCheckModalInstance.value = new Modal(document.getElementById('dirtyCheckModal'));
    }
    dirtyCheckModalInstance.value.show();
    dirtyCheckModalInstance.value._nextRoute = next;
    next(false);
  } else {
    next();
  }
});

function slugify(str) {
  return str
    .normalize('NFKD')
    .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');        // trim leading/trailing dashes
}

onMounted(async () => {
  // Theme logic
  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
  prefersDarkTheme.addEventListener('change', updateTheme);
  updateTheme(prefersDarkTheme);

  // Initialize Markdown-it with Shiki
  md = new MarkdownIt({ html: true, breaks: true })
    .use(await Shiki({
      themes: { light: 'github-light', dark: 'github-dark' },
      langs: supportedLanguages,
      defaultLanguage: 'plaintext',
    }))
    .use(markdownItAttrs)
    .use(markdownItAnchor, { slugify })
    .use(MarkdownItTaskLists, { enabled: true, label: true, labelAfter: true, disabled: false });

  // Keep original fence for logic
  const originalFenceRule = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const lang = token.info.trim().split(/\s+/g)[0];

    if (lang === 'mermaid') {
      return `<div id="mermaid-${idx}" class="mermaid">${token.content}</div>`;
    } else {
      if (!lang || !supportedLanguages.includes(lang.toLowerCase())) {
        tokens[idx].info = 'plaintext';
      }
      const rawCode = encodeURIComponent(token.content);
      const highlighted = originalFenceRule(tokens, idx, options, env, self);
      return `
        <div class="code-block">
          <button class="copy-btn" data-code="${rawCode}"><i class="bi bi-files"></i></button>
          ${highlighted}
        </div>`;
    }
  };

  // LOAD DATA
  if (props.slug) {
    // EDIT MODE
    const res = await api.get(`/docs/${props.slug}`, authHeaders());
    doc.value = res.data;
  } else {
    // CREATE MODE (/docs/new)
    // Leave doc empty, no API call
  }

  originalDoc.value = JSON.parse(JSON.stringify(doc.value));

  await nextTick();
  setupCopyButtons();
});

onBeforeUnmount(() => {
  const prefersDarkTheme = window.matchMedia('(prefers-color-scheme: dark)');
  prefersDarkTheme.removeEventListener('change', updateTheme);
});

function updateTheme(prefersDarkTheme) {
  mdEditorTheme.value = prefersDarkTheme.matches ? 'dark' : 'light';
}
</script>

<style scoped>
/* Keeping your existing styles ... */
.editor-fullscreen {
  width: 100% !important;
  min-height: calc(100vh - 56px) !important;
}

.code-block {
  position: relative;
}

.copy-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 4px;
  padding: 2px 6px;
}
</style>