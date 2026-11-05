<script setup>
/**
 * Rich-text editor for project pages (ADR-030). HTML in, HTML out; the API
 * sanitizes on save. Toolbar and menus follow the Crosstown xnn-app editor,
 * trimmed to what research reports need.
 */
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import mermaid from 'mermaid';
import WzMenu from '@/components/richdoc/WzMenu.vue';
import TableSizePicker from '@/components/richdoc/TableSizePicker.vue';
import { TableBlock } from '@/components/richdoc/TableBlock.js';
import { MermaidBlock } from '@/components/richdoc/MermaidBlock.js';

const props = defineProps({
  modelValue: { type: String, default: '' },
  theme: { type: String, default: 'light' },
  placeholder: { type: String, default: 'Write your report…' },
});
const emit = defineEmits(['update:modelValue']);

const viewMode = ref('visual'); // visual | html
const htmlDraft = ref('');
let lastEmitted = null;

mermaid.initialize({ startOnLoad: false, theme: props.theme === 'dark' ? 'dark' : 'default' });

const TEXT_COLORS = [
  { label: 'Default', value: null },
  { label: 'Gray', value: '#6c757d' },
  { label: 'Red', value: '#c0392b' },
  { label: 'Orange', value: '#d35400' },
  { label: 'Green', value: '#1e8449' },
  { label: 'Blue', value: '#1f618d' },
  { label: 'Purple', value: '#7d3c98' },
];
const HIGHLIGHTS = [
  { label: 'None', value: null },
  { label: 'Yellow', value: '#fff3a3' },
  { label: 'Green', value: '#c8f7c5' },
  { label: 'Blue', value: '#cfe8ff' },
  { label: 'Pink', value: '#ffd6e7' },
];
const blockTypes = [
  { id: 'paragraph', label: 'Paragraph', icon: 'bi-text-paragraph' },
  { id: 'h2', label: 'Heading 1', icon: 'bi-type-h1' },
  { id: 'h3', label: 'Heading 2', icon: 'bi-type-h2' },
  { id: 'h4', label: 'Heading 3', icon: 'bi-type-h3' },
  { id: 'blockquote', label: 'Quote', icon: 'bi-quote' },
  { id: 'codeBlock', label: 'Code block', icon: 'bi-code-square' },
];

const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    // Page title is the H1; body headings start at H2.
    StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: { HTMLAttributes: { class: 'code-block' } } }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
      defaultProtocol: 'https',
      HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
    }),
    Image.configure({ inline: false }),
    TableBlock.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TextStyle,
    Color,
    Highlight.configure({ multicolor: true }),
    MermaidBlock,
    Placeholder.configure({ placeholder: () => props.placeholder }),
  ],
  onUpdate: ({ editor: ed }) => {
    lastEmitted = ed.getHTML();
    emit('update:modelValue', lastEmitted);
  },
});

watch(
  () => props.modelValue,
  (value) => {
    const ed = editor.value;
    if (!ed || value === lastEmitted) return;
    ed.commands.setContent(value || '', false);
  }
);

onBeforeUnmount(() => editor.value?.destroy());

const cmd = (fn) => {
  const ed = editor.value;
  if (!ed) return;
  fn(ed.chain().focus()).run();
};
const isActive = (name, attrs) => !!editor.value?.isActive(name, attrs);
const inTable = computed(() => isActive('table'));

const currentBlock = computed(() => {
  if (isActive('heading', { level: 2 })) return blockTypes[1];
  if (isActive('heading', { level: 3 })) return blockTypes[2];
  if (isActive('heading', { level: 4 })) return blockTypes[3];
  if (isActive('blockquote')) return blockTypes[4];
  if (isActive('codeBlock')) return blockTypes[5];
  return blockTypes[0];
});
const activeColor = computed(() => editor.value?.getAttributes('textStyle')?.color || null);

function setBlockType(id, close) {
  cmd((c) => {
    if (id === 'paragraph') return c.setParagraph();
    if (id === 'blockquote') return c.toggleBlockquote();
    if (id === 'codeBlock') return c.toggleCodeBlock();
    return c.setHeading({ level: Number(id.slice(1)) });
  });
  close?.();
}
function setColor(value, close) {
  cmd((c) => (value ? c.setColor(value) : c.unsetColor()));
  close?.();
}
function setHighlight(value, close) {
  cmd((c) => (value ? c.setHighlight({ color: value }) : c.unsetHighlight()));
  close?.();
}
function setLink() {
  const prev = editor.value?.getAttributes('link')?.href || '';
  const url = window.prompt('Link URL (leave empty to remove)', prev);
  if (url === null) return;
  if (!url.trim()) return cmd((c) => c.extendMarkRange('link').unsetLink());
  cmd((c) => c.extendMarkRange('link').setLink({ href: url.trim() }));
}
function insertImage() {
  const url = window.prompt('Image URL (https://…)');
  if (!url || !/^https?:\/\//i.test(url.trim())) return;
  const alt = window.prompt('Describe the image (alt text)', '') || '';
  cmd((c) => c.setImage({ src: url.trim(), alt }));
}
function insertTable({ rows, cols }, close) {
  cmd((c) => c.insertTable({ rows, cols, withHeaderRow: true }));
  close?.();
}

function setView(mode) {
  if (mode === viewMode.value || !editor.value) return;
  if (mode === 'html') {
    htmlDraft.value = editor.value.getHTML();
  } else {
    editor.value.commands.setContent(htmlDraft.value || '', true);
  }
  viewMode.value = mode;
}
</script>

<template>
  <div class="richdoc" :data-theme="theme">
    <div v-if="editor" class="wz-toolbar" role="toolbar" aria-label="Formatting">
      <template v-if="viewMode === 'visual'">
        <WzMenu placement="bottom-start" min-width="12rem">
          <template #trigger="{ open }">
            <button type="button" class="wz-btn wz-btn--label" :class="{ 'is-open': open }" aria-haspopup="menu"
              :aria-expanded="open" v-tooltip="'Text style'" @mousedown.prevent>
              <i class="bi" :class="currentBlock.icon"></i>
              <span class="wz-btn__text">{{ currentBlock.label }}</span>
              <i class="bi bi-chevron-down wz-btn__caret"></i>
            </button>
          </template>
          <template #default="{ close }">
            <button v-for="b in blockTypes" :key="b.id" type="button" class="wz-menuitem"
              :class="{ 'is-active': currentBlock.id === b.id }" role="menuitem" @mousedown.prevent
              @click="setBlockType(b.id, close)">
              <i class="bi wz-menuitem__icon" :class="b.icon"></i>
              <span class="wz-menuitem__label">{{ b.label }}</span>
              <i v-if="currentBlock.id === b.id" class="bi bi-check2 wz-menuitem__check"></i>
            </button>
          </template>
        </WzMenu>

        <span class="wz-sep"></span>
        <div class="wz-group">
          <button type="button" class="wz-btn" :class="{ 'is-active': isActive('bold') }" v-tooltip="'Bold  ⌘B'"
            aria-label="Bold" @mousedown.prevent @click="cmd((c) => c.toggleBold())"><i class="bi bi-type-bold"></i></button>
          <button type="button" class="wz-btn" :class="{ 'is-active': isActive('italic') }" v-tooltip="'Italic  ⌘I'"
            aria-label="Italic" @mousedown.prevent @click="cmd((c) => c.toggleItalic())"><i class="bi bi-type-italic"></i></button>
          <button type="button" class="wz-btn" :class="{ 'is-active': isActive('strike') }" v-tooltip="'Strikethrough'"
            aria-label="Strikethrough" @mousedown.prevent @click="cmd((c) => c.toggleStrike())"><i class="bi bi-type-strikethrough"></i></button>
          <button type="button" class="wz-btn" :class="{ 'is-active': isActive('code') }" v-tooltip="'Inline code'"
            aria-label="Inline code" @mousedown.prevent @click="cmd((c) => c.toggleCode())"><i class="bi bi-code-slash"></i></button>
        </div>

        <span class="wz-sep"></span>
        <div class="wz-group">
          <WzMenu placement="bottom-start" min-width="10rem">
            <template #trigger="{ open }">
              <button type="button" class="wz-btn wz-swatch-btn" :class="{ 'is-open': open }" aria-haspopup="menu"
                :aria-expanded="open" v-tooltip="'Text color'" aria-label="Text color" @mousedown.prevent>
                <i class="bi bi-type" :style="activeColor ? { color: activeColor } : null"></i>
                <span class="wz-swatch-bar" :style="{ background: activeColor || 'transparent' }"></span>
              </button>
            </template>
            <template #default="{ close }">
              <button v-for="c in TEXT_COLORS" :key="c.label" type="button" class="wz-menuitem" role="menuitem"
                :class="{ 'is-active': activeColor === c.value }" @mousedown.prevent @click="setColor(c.value, close)">
                <span class="wz-swatch" :style="{ background: c.value || 'transparent' }"></span>
                <span class="wz-menuitem__label">{{ c.label }}</span>
              </button>
            </template>
          </WzMenu>
          <WzMenu placement="bottom-start" min-width="10rem">
            <template #trigger="{ open }">
              <button type="button" class="wz-btn" :class="{ 'is-open': open, 'is-active': isActive('highlight') }"
                aria-haspopup="menu" :aria-expanded="open" v-tooltip="'Highlight'" aria-label="Highlight" @mousedown.prevent>
                <i class="bi bi-highlighter"></i>
              </button>
            </template>
            <template #default="{ close }">
              <button v-for="c in HIGHLIGHTS" :key="c.label" type="button" class="wz-menuitem" role="menuitem"
                @mousedown.prevent @click="setHighlight(c.value, close)">
                <span class="wz-swatch" :style="{ background: c.value || 'transparent' }"></span>
                <span class="wz-menuitem__label">{{ c.label }}</span>
              </button>
            </template>
          </WzMenu>
          <button type="button" class="wz-btn" v-tooltip="'Clear formatting'" aria-label="Clear formatting"
            @mousedown.prevent @click="cmd((c) => c.unsetAllMarks().clearNodes())"><i class="bi bi-eraser"></i></button>
        </div>

        <span class="wz-sep"></span>
        <div class="wz-group">
          <button type="button" class="wz-btn" :class="{ 'is-active': isActive('bulletList') }" v-tooltip="'Bullet list'"
            aria-label="Bullet list" @mousedown.prevent @click="cmd((c) => c.toggleBulletList())"><i class="bi bi-list-ul"></i></button>
          <button type="button" class="wz-btn" :class="{ 'is-active': isActive('orderedList') }" v-tooltip="'Numbered list'"
            aria-label="Numbered list" @mousedown.prevent @click="cmd((c) => c.toggleOrderedList())"><i class="bi bi-list-ol"></i></button>
        </div>

        <span class="wz-sep"></span>
        <div class="wz-group">
          <button type="button" class="wz-btn" :class="{ 'is-active': isActive('link') }" v-tooltip="'Link'"
            aria-label="Link" @mousedown.prevent @click="setLink"><i class="bi bi-link-45deg"></i></button>
          <button type="button" class="wz-btn" v-tooltip="'Image from URL'" aria-label="Image"
            @mousedown.prevent @click="insertImage"><i class="bi bi-image"></i></button>
          <WzMenu placement="bottom-start" min-width="12rem">
            <template #trigger="{ open }">
              <button type="button" class="wz-btn" :class="{ 'is-open': open }" aria-haspopup="menu" :aria-expanded="open"
                v-tooltip="'Table'" aria-label="Insert table" @mousedown.prevent>
                <i class="bi bi-table"></i>
              </button>
            </template>
            <template #default="{ close }">
              <TableSizePicker @pick="(size) => insertTable(size, close)" />
            </template>
          </WzMenu>
          <button type="button" class="wz-btn" v-tooltip="'Mermaid diagram'" aria-label="Mermaid diagram"
            @mousedown.prevent @click="cmd((c) => c.insertMermaid())"><i class="bi bi-diagram-3"></i></button>
          <button type="button" class="wz-btn" v-tooltip="'Divider'" aria-label="Divider"
            @mousedown.prevent @click="cmd((c) => c.setHorizontalRule())"><i class="bi bi-hr"></i></button>
        </div>

        <template v-if="inTable">
          <span class="wz-sep"></span>
          <WzMenu placement="bottom-start" min-width="11rem">
            <template #trigger="{ open }">
              <button type="button" class="wz-btn wz-btn--label" :class="{ 'is-open': open }" aria-haspopup="menu"
                :aria-expanded="open" @mousedown.prevent>
                <span class="wz-btn__text">Table</span><i class="bi bi-chevron-down wz-btn__caret"></i>
              </button>
            </template>
            <template #default="{ close }">
              <button type="button" class="wz-menuitem" @mousedown.prevent @click="cmd((c) => c.addRowAfter()); close()">Add row below</button>
              <button type="button" class="wz-menuitem" @mousedown.prevent @click="cmd((c) => c.addColumnAfter()); close()">Add column right</button>
              <button type="button" class="wz-menuitem" @mousedown.prevent @click="cmd((c) => c.deleteRow()); close()">Delete row</button>
              <button type="button" class="wz-menuitem" @mousedown.prevent @click="cmd((c) => c.deleteColumn()); close()">Delete column</button>
              <button type="button" class="wz-menuitem" @mousedown.prevent @click="cmd((c) => c.toggleHeaderRow()); close()">Toggle header row</button>
              <button type="button" class="wz-menuitem text-danger" @mousedown.prevent @click="cmd((c) => c.deleteTable()); close()">Delete table</button>
            </template>
          </WzMenu>
        </template>

        <span class="wz-sep"></span>
        <div class="wz-group">
          <button type="button" class="wz-btn" :disabled="!editor.can().undo()" v-tooltip="'Undo  ⌘Z'" aria-label="Undo"
            @mousedown.prevent @click="cmd((c) => c.undo())"><i class="bi bi-arrow-counterclockwise"></i></button>
          <button type="button" class="wz-btn" :disabled="!editor.can().redo()" v-tooltip="'Redo  ⇧⌘Z'" aria-label="Redo"
            @mousedown.prevent @click="cmd((c) => c.redo())"><i class="bi bi-arrow-clockwise"></i></button>
        </div>
      </template>

      <div class="wz-view-toggle" role="group" aria-label="Editor view">
        <button type="button" class="wz-btn" :class="{ 'is-active': viewMode === 'visual' }" @click="setView('visual')">Visual</button>
        <button type="button" class="wz-btn" :class="{ 'is-active': viewMode === 'html' }" @click="setView('html')">HTML</button>
      </div>
    </div>

    <EditorContent v-show="viewMode === 'visual'" :editor="editor" class="richdoc-content page-html" />
    <textarea
      v-if="viewMode === 'html'"
      v-model="htmlDraft"
      class="form-control font-monospace richdoc-source"
      spellcheck="false"
      aria-label="HTML source"
      @input="emit('update:modelValue', (lastEmitted = htmlDraft))"
    ></textarea>
  </div>
</template>

<style scoped>
.richdoc {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.5rem;
  min-height: 60vh;
  background: var(--bs-body-bg);
}
.wz-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.15rem;
  padding: 0.3rem 0.55rem;
  border-bottom: 1px solid var(--bs-border-color);
  background: var(--bs-body-bg);
  border-radius: 0.5rem 0.5rem 0 0;
}
.wz-group {
  display: flex;
  align-items: center;
  gap: 0.1rem;
}
.wz-sep {
  align-self: stretch;
  width: 1px;
  margin: 0.25rem 0.3rem;
  background: var(--bs-border-color);
}
.wz-view-toggle {
  display: flex;
  margin-left: auto;
  border: 1px solid var(--bs-border-color);
  border-radius: 0.4rem;
  overflow: hidden;
}
.wz-view-toggle .wz-btn {
  border-radius: 0;
  min-width: 3.2rem;
  height: 1.7rem;
  font-size: 0.78rem;
}
.wz-view-toggle .wz-btn + .wz-btn {
  border-left: 1px solid var(--bs-border-color);
}
.wz-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  min-width: 1.9rem;
  height: 1.9rem;
  padding: 0 0.35rem;
  border: 0;
  border-radius: 0.4rem;
  background: transparent;
  color: var(--bs-body-color);
  font-size: 0.9rem;
  line-height: 1;
  white-space: nowrap;
}
.wz-btn:hover,
.wz-btn.is-open {
  background: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.06));
}
.wz-btn.is-active {
  background: var(--bs-primary);
  color: #fff;
}
.wz-btn:disabled {
  opacity: 0.4;
  pointer-events: none;
}
.wz-btn--label {
  padding: 0 0.45rem;
}
.wz-btn__text {
  font-size: 0.82rem;
}
.wz-btn__caret {
  font-size: 0.7rem;
  opacity: 0.6;
}
.wz-swatch-btn {
  flex-direction: column;
  gap: 0.05rem;
}
.wz-swatch-bar {
  display: block;
  width: 0.85rem;
  height: 3px;
  border-radius: 1px;
}
.wz-swatch {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 0.2rem;
  border: 1px solid var(--bs-border-color);
}
.wz-menuitem {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.4rem 0.55rem;
  border: 0;
  border-radius: 0.35rem;
  background: transparent;
  color: var(--bs-body-color);
  font-size: 0.875rem;
  text-align: left;
}
.wz-menuitem:hover {
  background: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.06));
}
.wz-menuitem.is-active,
.wz-menuitem__check {
  color: var(--bs-primary);
}
.wz-menuitem__icon {
  width: 1rem;
  text-align: center;
  opacity: 0.8;
}
.wz-menuitem__label {
  flex: 1;
}
.richdoc-content {
  flex: 1;
  padding: 1rem 1.25rem;
  overflow: auto;
}
.richdoc-content :deep(.ProseMirror) {
  min-height: 50vh;
  outline: none;
}
.richdoc-content :deep(p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  height: 0;
  color: var(--bs-secondary-color);
  pointer-events: none;
}
.richdoc-content :deep(.selectedCell) {
  background: rgba(var(--bs-primary-rgb), 0.12);
}
.richdoc-content :deep(.column-resize-handle) {
  position: absolute;
  top: 0;
  right: -2px;
  bottom: 0;
  width: 4px;
  background: var(--bs-primary);
  pointer-events: none;
}
.richdoc-content :deep(.tableWrapper) {
  position: relative;
  overflow-x: auto;
}
.richdoc-content :deep(.wysiwyg-table-block__handle) {
  display: none;
}
.richdoc-content :deep(.richdoc-mermaid) {
  margin: 0.75rem 0;
  padding: 0.5rem;
  border: 1px dashed var(--bs-border-color);
  border-radius: 0.4rem;
}
.richdoc-content :deep(.richdoc-mermaid__head) {
  font-size: 0.78rem;
  color: var(--bs-secondary-color);
  margin-bottom: 0.25rem;
}
.richdoc-content :deep(.richdoc-mermaid__preview) {
  margin-top: 0.5rem;
  text-align: center;
}
.richdoc-content :deep(.richdoc-mermaid__preview.is-error) {
  color: var(--bs-danger);
  font-size: 0.8rem;
  text-align: left;
}
.richdoc-source {
  flex: 1;
  min-height: 55vh;
  border: 0;
  border-radius: 0 0 0.5rem 0.5rem;
  font-size: 0.82rem;
}
</style>
