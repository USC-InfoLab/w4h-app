<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
  maxRows: { type: Number, default: 8 },
  maxCols: { type: Number, default: 8 },
  defaultRows: { type: Number, default: 3 },
  defaultCols: { type: Number, default: 3 },
});

const emit = defineEmits(['pick']);

const hover = ref({ rows: props.defaultRows, cols: props.defaultCols });
const rowsInput = ref(props.defaultRows);
const colsInput = ref(props.defaultCols);

const preview = computed(() => ({
  rows: hover.value.rows,
  cols: hover.value.cols,
}));

function clamp(n, min, max) {
  const v = Number.parseInt(n, 10);
  if (!Number.isFinite(v)) return min;
  return Math.min(max, Math.max(min, v));
}

function onCellEnter(rows, cols) {
  hover.value = { rows, cols };
  rowsInput.value = rows;
  colsInput.value = cols;
}

function pick(rows = preview.value.rows, cols = preview.value.cols) {
  emit('pick', {
    rows: clamp(rows, 1, 20),
    cols: clamp(cols, 1, 20),
  });
}

function syncHoverFromInputs() {
  hover.value = {
    rows: clamp(rowsInput.value, 1, props.maxRows),
    cols: clamp(colsInput.value, 1, props.maxCols),
  };
}

function onInsert() {
  pick(rowsInput.value, colsInput.value);
}
</script>

<template>
  <div class="table-size-picker" @mouseleave="syncHoverFromInputs">
    <div class="table-size-picker__label">{{ preview.rows }} × {{ preview.cols }} table</div>
    <div
      class="table-size-picker__grid"
      role="grid"
      :aria-label="`${preview.rows} by ${preview.cols} table`"
    >
      <div
        v-for="row in maxRows"
        :key="`r${row}`"
        class="table-size-picker__row"
        role="row"
      >
        <span
          v-for="col in maxCols"
          :key="`${row}x${col}`"
          class="table-size-picker__cell"
          :class="{ 'is-hot': row <= preview.rows && col <= preview.cols }"
          role="gridcell"
          :aria-label="`${row} rows, ${col} columns`"
          @mouseenter="onCellEnter(row, col)"
          @click="pick(row, col)"
        />
      </div>
    </div>
    <div class="table-size-picker__fields">
      <label class="table-size-picker__field">
        <span>Rows</span>
        <input
          v-model.number="rowsInput"
          type="number"
          min="1"
          max="20"
          class="form-control form-control-sm"
          @input="syncHoverFromInputs"
        />
      </label>
      <label class="table-size-picker__field">
        <span>Columns</span>
        <input
          v-model.number="colsInput"
          type="number"
          min="1"
          max="20"
          class="form-control form-control-sm"
          @input="syncHoverFromInputs"
        />
      </label>
      <button type="button" class="btn btn-sm btn-primary" @click="onInsert">
        Insert
      </button>
    </div>
  </div>
</template>

<style scoped>
.table-size-picker {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  padding: 0.35rem 0.25rem 0.15rem;
  min-width: 13.5rem;
}
.table-size-picker__label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--bs-secondary-color);
  text-align: center;
}
.table-size-picker__grid {
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: center;
}
.table-size-picker__row {
  display: flex;
  gap: 3px;
  pointer-events: none;
}
.table-size-picker__cell {
  display: block;
  width: 1.05rem;
  height: 1.05rem;
  pointer-events: auto;
  border: 1px solid var(--bs-border-color);
  border-radius: 2px;
  background: var(--bs-body-bg);
  cursor: pointer;
}
.table-size-picker__cell.is-hot {
  background: color-mix(in srgb, var(--bs-primary) 28%, var(--bs-body-bg));
  border-color: var(--bs-primary);
}
.table-size-picker__fields {
  display: flex;
  align-items: flex-end;
  gap: 0.45rem;
}
.table-size-picker__field {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1 1 4rem;
  font-size: 0.72rem;
  color: var(--bs-secondary-color);
}
.table-size-picker__field input {
  min-width: 0;
}
</style>
