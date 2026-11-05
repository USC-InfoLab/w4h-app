import { Table, TableView } from '@tiptap/extension-table';

/**
 * Table node view with a Notion-style block chrome: grip handle on the left,
 * wrapper that can take a NodeSelection (whole-table select/delete).
 */
export class BlockTableView extends TableView {
  constructor(node, cellMinWidth, view) {
    super(node, cellMinWidth, view);
    this.dom.classList.add('wysiwyg-table-block');
    this.dom.setAttribute('data-table-block', '1');

    this.handle = document.createElement('button');
    this.handle.type = 'button';
    this.handle.className = 'wysiwyg-table-block__handle';
    this.handle.contentEditable = 'false';
    this.handle.tabIndex = -1;
    this.handle.setAttribute('aria-label', 'Select table');
    this.handle.setAttribute('data-drag-handle', '');
    this.handle.innerHTML = '<i class="bi bi-grip-vertical" aria-hidden="true"></i>';
    this.dom.insertBefore(this.handle, this.dom.firstChild);
  }

  ignoreMutation(mutation) {
    if (mutation.target === this.handle || this.handle.contains(mutation.target)) return true;
    if (mutation.target === this.dom && mutation.type === 'attributes') return true;
    return super.ignoreMutation(mutation);
  }
}

/**
 * Light tables as selectable blocks. `allowTableNodeSelection` keeps a
 * NodeSelection on the table (the default plugin rewrites it to a cell range).
 */
export const TableBlock = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      resizable: true,
      renderWrapper: true,
      allowTableNodeSelection: true,
      View: BlockTableView,
    };
  },
});

export default TableBlock;
