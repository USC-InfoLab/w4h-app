import { Node } from '@tiptap/core';
import mermaid from 'mermaid';

let renderSeq = 0;

/**
 * Mermaid diagram block. Stored as `<div class="mermaid">source</div>` (the same
 * shape the Markdown renderer wrote), edited as source with a live preview.
 */
export const MermaidBlock = Node.create({
  name: 'mermaidBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return { source: { default: 'graph TD\n  A[Start] --> B[End]' } };
  },

  parseHTML() {
    return [{ tag: 'div.mermaid', getAttrs: (el) => ({ source: el.textContent || '' }) }];
  },

  renderHTML({ node }) {
    return ['div', { class: 'mermaid' }, node.attrs.source || ''];
  },

  addCommands() {
    return {
      insertMermaid:
        (source) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: source ? { source } : {} }),
    };
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      let current = node;
      const dom = document.createElement('div');
      dom.className = 'richdoc-mermaid';
      dom.contentEditable = 'false';

      const head = document.createElement('div');
      head.className = 'richdoc-mermaid__head';
      head.innerHTML = '<i class="bi bi-diagram-3" aria-hidden="true"></i> Mermaid diagram';

      const textarea = document.createElement('textarea');
      textarea.className = 'form-control form-control-sm font-monospace richdoc-mermaid__src';
      textarea.rows = 4;
      textarea.spellcheck = false;
      textarea.value = node.attrs.source || '';
      textarea.setAttribute('aria-label', 'Mermaid diagram source');
      textarea.readOnly = !editor.isEditable;

      const preview = document.createElement('div');
      preview.className = 'richdoc-mermaid__preview';

      dom.append(head, textarea, preview);

      let timer = null;
      async function renderPreview(source) {
        const id = `richdoc-mermaid-${++renderSeq}`;
        try {
          const { svg } = await mermaid.render(id, source || '');
          preview.innerHTML = svg;
          preview.classList.remove('is-error');
        } catch (e) {
          preview.textContent = `Diagram error: ${e?.message || e}`;
          preview.classList.add('is-error');
          document.getElementById(`d${id}`)?.remove();
        }
      }

      textarea.addEventListener('input', () => {
        const pos = typeof getPos === 'function' ? getPos() : null;
        if (pos == null) return;
        editor.view.dispatch(
          editor.view.state.tr.setNodeMarkup(pos, undefined, { ...current.attrs, source: textarea.value })
        );
        clearTimeout(timer);
        timer = setTimeout(() => renderPreview(textarea.value), 400);
      });

      renderPreview(textarea.value);

      return {
        dom,
        update(updated) {
          if (updated.type.name !== 'mermaidBlock') return false;
          current = updated;
          if (textarea.value !== updated.attrs.source) {
            textarea.value = updated.attrs.source || '';
            renderPreview(textarea.value);
          }
          return true;
        },
        stopEvent: (event) => event.target === textarea,
        ignoreMutation: () => true,
        destroy() {
          clearTimeout(timer);
        },
      };
    };
  },
});

export default MermaidBlock;
