<template>
  <main class="container-fluid">
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
      <div>
        <nav aria-label="breadcrumb">
          <ol class="breadcrumb mb-1">
            <li class="breadcrumb-item">
              <router-link :to="{ name: 'adminHome' }">Admin</router-link>
            </li>
            <li class="breadcrumb-item active" aria-current="page">UI kit</li>
          </ol>
        </nav>
        <h1 class="h4 mb-1">UI kit / style guide</h1>
        <p class="text-muted small mb-0">
          Brand controls for tuning <code>style.css</code>. Super admin only — not a product page.
        </p>
      </div>
      <div class="card p-3">
        <label class="form-label small text-muted mb-1" for="styleGuideThemeMode">Theme mode</label>
        <select
          id="styleGuideThemeMode"
          :value="themeMode"
          class="form-select form-select-sm"
          @change="setThemeMode(($event.target).value)"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
        <div class="small text-muted mt-1">
          Resolved theme: <strong>{{ darkMode ? 'dark' : 'light' }}</strong>
        </div>
      </div>
    </div>

    <!-- Tokens -->
    <section class="mb-4">
      <h2 class="h5">Brand tokens</h2>
      <div class="row g-2">
        <div v-for="swatch in swatches" :key="swatch.name" class="col-6 col-md-3 col-xl-2">
          <div class="border rounded overflow-hidden h-100">
            <div class="token-swatch" :style="{ background: swatch.css }" />
            <div class="p-2 small">
              <div class="fw-semibold">{{ swatch.name }}</div>
              <code class="d-block text-muted">{{ swatch.token }}</code>
              <code class="d-block">{{ swatch.hex }}</code>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Links -->
    <section class="mb-4">
      <h2 class="h5">Links</h2>
      <div class="card p-3">
        <p class="mb-2">
          Inline
          <a href="#">sample link</a>
          (no underline until hover; dark = Gold, light = Cardinal).
        </p>
        <p class="mb-0">
          <button type="button" class="btn btn-link p-0">btn-link control</button>
        </p>
      </div>
    </section>

    <!-- Tooltips -->
    <section class="mb-4">
      <h2 class="h5">Tooltips</h2>
      <p class="text-muted small mb-2">
        Tokens: <code>--w4h-tooltip-bg</code> / <code>--w4h-tooltip-fg</code>
        (map to Bootstrap emphasis / body; invert with dark mode).
      </p>
      <div class="row g-2 mb-3">
        <div v-for="swatch in tooltipSwatches" :key="swatch.name" class="col-6 col-md-3 col-xl-2">
          <div class="border rounded overflow-hidden h-100">
            <div class="token-swatch" :style="{ background: swatch.css }" />
            <div class="p-2 small">
              <div class="fw-semibold">{{ swatch.name }}</div>
              <code class="d-block text-muted">{{ swatch.token }}</code>
              <code class="d-block">{{ swatch.hex }}</code>
            </div>
          </div>
        </div>
      </div>
      <div class="card p-3 d-flex flex-wrap gap-3 align-items-center">
        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          data-bs-toggle="tooltip"
          data-bs-placement="top"
          title="Bootstrap tooltip — bg follows emphasis / body tokens"
        >
          Bootstrap tooltip
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          v-tooltip="'Floating Vue tooltip — same tokens'"
        >
          Floating Vue tooltip
        </button>
      </div>
    </section>

    <!-- Buttons -->
    <section class="mb-4">
      <h2 class="h5">Buttons</h2>
      <div class="card p-3">
        <div class="d-flex flex-wrap gap-2 mb-3">
          <button type="button" class="btn btn-primary">Primary</button>
          <button type="button" class="btn btn-secondary">Secondary</button>
          <button type="button" class="btn btn-success">Success</button>
          <button type="button" class="btn btn-danger">Danger</button>
          <button type="button" class="btn btn-warning">Warning</button>
          <button type="button" class="btn btn-info">Info</button>
          <button type="button" class="btn btn-light">Light</button>
          <button type="button" class="btn btn-dark">Dark</button>
        </div>
        <div class="d-flex flex-wrap gap-2 mb-3">
          <button type="button" class="btn btn-outline-primary">Outline primary</button>
          <button type="button" class="btn btn-outline-secondary">Outline secondary</button>
          <button type="button" class="btn btn-outline-danger">Outline danger</button>
          <button type="button" class="btn btn-sm btn-primary">Small primary</button>
          <button type="button" class="btn btn-lg btn-primary">Large primary</button>
          <button type="button" class="btn btn-primary" disabled>Disabled</button>
        </div>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-primary">Left</button>
          <button type="button" class="btn btn-primary">Middle</button>
          <button type="button" class="btn btn-primary">Right</button>
        </div>
      </div>
    </section>

    <!-- Alerts / callout -->
    <section class="mb-4">
      <h2 class="h5">Alerts &amp; callout</h2>
      <div class="w4h-callout mb-3" role="status">
        <h5 class="alert-heading mb-2">Brand callout (.w4h-callout)</h5>
        <p class="mb-2">
          Neutral panel with Cardinal accent bar. Prefer this over
          <code>alert-info</code> for onboarding / tips.
          Includes a <a href="#">sample link</a>.
        </p>
        <button type="button" class="btn btn-sm btn-outline-primary">Got it</button>
      </div>
      <div class="alert alert-primary">alert-primary (Bootstrap, remapped)</div>
      <div class="alert alert-secondary">alert-secondary</div>
      <div class="alert alert-success">alert-success</div>
      <div class="alert alert-danger">alert-danger — must stay distinct from brand CTAs</div>
      <div class="alert alert-warning mt-3">alert-warning</div>
      <div class="alert alert-info mb-0">alert-info — avoid for brand panels</div>
    </section>

    <!-- Forms -->
    <section class="mb-4">
      <h2 class="h5">Forms</h2>
      <div class="card p-3">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label" for="sgEmail">Email</label>
            <input id="sgEmail" type="email" class="form-control" placeholder="you@example.com" />
          </div>
          <div class="col-md-6">
            <label class="form-label" for="sgSelect">Select</label>
            <select id="sgSelect" class="form-select">
              <option>Admin</option>
              <option>User</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label" for="sgTextarea">Textarea</label>
            <textarea id="sgTextarea" class="form-control" rows="2" placeholder="Notes" />
          </div>
          <div class="col-md-6">
            <label class="form-label">Checks &amp; switches</label>
            <div class="form-check">
              <input id="sgCheck" class="form-check-input" type="checkbox" checked />
              <label class="form-check-label" for="sgCheck">Checkbox</label>
            </div>
            <div class="form-check">
              <input id="sgRadio" class="form-check-input" type="radio" name="sgRadio" checked />
              <label class="form-check-label" for="sgRadio">Radio</label>
            </div>
            <div class="form-check form-switch">
              <input id="sgSwitch" class="form-check-input" type="checkbox" role="switch" checked />
              <label class="form-check-label" for="sgSwitch">Switch</label>
            </div>
          </div>
          <div class="col-12">
            <label class="form-label" for="sgRange">Range</label>
            <input id="sgRange" type="range" class="form-range" />
          </div>
          <div class="col-md-6">
            <div class="input-group">
              <span class="input-group-text">@</span>
              <input type="text" class="form-control" placeholder="Username" />
              <button class="btn btn-primary" type="button">Invite</button>
            </div>
          </div>
          <div class="col-md-6">
            <input class="form-control is-invalid" placeholder="Invalid field" />
            <div class="invalid-feedback d-block">Validation message</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Badges / pills -->
    <section class="mb-4">
      <h2 class="h5">Badges</h2>
      <div class="card p-3 d-flex flex-wrap gap-2">
        <span class="badge text-bg-primary">Primary</span>
        <span class="badge text-bg-secondary">Secondary</span>
        <span class="badge text-bg-success">Success</span>
        <span class="badge text-bg-danger">Danger</span>
        <span class="badge text-bg-warning">Warning</span>
        <span class="badge text-bg-info">Info</span>
        <span class="badge rounded-pill text-bg-primary">Pill</span>
      </div>
    </section>

    <!-- Cards / table / list -->
    <section class="mb-4">
      <h2 class="h5">Cards, table, list</h2>
      <div class="row g-3">
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-body">
              <div class="text-muted small">KPI</div>
              <div class="fs-4 fw-semibold">42</div>
              <div class="small text-muted">Teams</div>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <div class="card h-100">
            <div class="card-header">Card header</div>
            <div class="card-body">
              <p class="card-text mb-2">Card body with a <a href="#">link</a>.</p>
              <button type="button" class="btn btn-sm btn-outline-primary">Action</button>
            </div>
          </div>
        </div>
        <div class="col-md-4">
          <ul class="list-group">
            <li class="list-group-item active" aria-current="true">Active item</li>
            <li class="list-group-item">Default item</li>
            <li class="list-group-item disabled">Disabled item</li>
          </ul>
        </div>
        <div class="col-12">
          <div class="table-responsive">
            <table class="table table-sm table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Ada Lovelace</td>
                  <td>Admin</td>
                  <td><span class="badge text-bg-success">Active</span></td>
                  <td><button type="button" class="btn btn-sm btn-outline-primary">Edit</button></td>
                </tr>
                <tr>
                  <td>Alan Turing</td>
                  <td>User</td>
                  <td><span class="badge text-bg-secondary">Invited</span></td>
                  <td><button type="button" class="btn btn-sm btn-outline-primary">Edit</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>

    <!-- Nav patterns -->
    <section class="mb-4">
      <h2 class="h5">Nav patterns</h2>
      <div class="card p-3">
        <ul class="nav nav-tabs mb-3">
          <li class="nav-item"><a class="nav-link active" href="#">Active</a></li>
          <li class="nav-item"><a class="nav-link" href="#">Link</a></li>
          <li class="nav-item"><a class="nav-link disabled" href="#">Disabled</a></li>
        </ul>
        <ul class="nav nav-pills mb-3">
          <li class="nav-item"><a class="nav-link active" href="#">Active</a></li>
          <li class="nav-item"><a class="nav-link" href="#">Link</a></li>
        </ul>
        <div class="progress" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100">
          <div class="progress-bar bg-primary" style="width: 45%">45%</div>
        </div>
      </div>
    </section>

    <!-- Typography -->
    <section class="mb-4">
      <h2 class="h5">Typography &amp; text utilities</h2>
      <div class="card p-3">
        <p class="fs-4 mb-1">fs-4 heading sample</p>
        <p>Body text with <strong>strong</strong>, <em>emphasis</em>, and <code>code</code>.</p>
        <p class="text-muted mb-1">text-muted</p>
        <p class="text-primary mb-1">text-primary <span class="text-muted small">(dark: lightened — never deep Cardinal on black)</span></p>
        <p class="text-danger mb-1">text-danger</p>
        <p class="text-warning mb-1">text-warning</p>
        <p class="text-success mb-0">text-success</p>
      </div>
    </section>

    <!-- Spinners -->
    <section class="mb-2">
      <h2 class="h5">Spinners</h2>
      <div class="card p-3 d-flex flex-row gap-3 align-items-center">
        <div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading</span></div>
        <div class="spinner-border spinner-border-sm text-primary" role="status" />
        <div class="spinner-grow text-primary" role="status" />
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch, nextTick } from 'vue';
import { useUIStore } from '@/stores/ui';
import { storeToRefs } from 'pinia';
import { Tooltip } from 'bootstrap';

const uiStore = useUIStore();
const { darkMode, themeMode } = storeToRefs(uiStore);

const tooltipInstances = ref([]);

function disposeTooltips() {
  tooltipInstances.value.forEach((t) => t.dispose());
  tooltipInstances.value = [];
}

function initTooltips() {
  disposeTooltips();
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach((el) => {
    tooltipInstances.value.push(
      new Tooltip(el, {
        placement: el.getAttribute('data-bs-placement') || 'top',
        trigger: 'hover focus',
        container: 'body',
      })
    );
  });
}

/** Resolve a CSS color (var or hex) to a computed hex for display. */
function cssColorToHex(value) {
  if (!value) return '';
  const probe = document.createElement('div');
  probe.style.color = value;
  document.body.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!m) return value;
  const hex = [m[1], m[2], m[3]]
    .map((n) => Number(n).toString(16).padStart(2, '0'))
    .join('');
  return `#${hex}`;
}

const swatchDefs = [
  { name: 'Cardinal', token: '--w4h-cardinal', css: 'var(--w4h-cardinal)', fallback: '#990000' },
  { name: 'Cardinal hover', token: '--w4h-cardinal-hover', css: 'var(--w4h-cardinal-hover)', fallback: '#7a0000' },
  { name: 'Gold', token: '--w4h-gold', css: 'var(--w4h-gold)', fallback: '#ffcc00' },
  { name: 'Nav bg', token: '--w4h-nav-bg', css: 'var(--w4h-nav-bg)', fallback: '#630000' },
  { name: 'Muted text', token: '--w4h-muted', css: 'var(--w4h-muted)', fallback: '#595959' },
  { name: 'Accent', token: '--w4h-accent', css: 'var(--w4h-accent)', fallback: '#990000' },
  { name: 'Link', token: '--bs-link-color', css: 'var(--bs-link-color)', fallback: '#990000' },
  { name: 'Primary', token: '--bs-primary', css: 'var(--bs-primary)', fallback: '#990000' },
  { name: 'Tooltip bg', token: '--w4h-tooltip-bg', css: 'var(--w4h-tooltip-bg)', fallback: '#212529' },
  { name: 'Tooltip text', token: '--w4h-tooltip-fg', css: 'var(--w4h-tooltip-fg)', fallback: '#ffffff' },
];

const resolvedHex = ref({});

function refreshHex() {
  const next = {};
  for (const s of swatchDefs) {
    try {
      next[s.token] = cssColorToHex(s.css) || s.fallback;
    } catch {
      next[s.token] = s.fallback;
    }
  }
  resolvedHex.value = next;
}

const swatches = computed(() =>
  swatchDefs.map((s) => ({
    ...s,
    hex: resolvedHex.value[s.token] || s.fallback,
  }))
);

const tooltipSwatches = computed(() =>
  swatches.value.filter((s) => s.token.includes('tooltip'))
);

onMounted(() => {
  refreshHex();
  nextTick(() => initTooltips());
});

onBeforeUnmount(() => {
  disposeTooltips();
});

watch(darkMode, () => {
  requestAnimationFrame(refreshHex);
});

function setThemeMode(mode) {
  uiStore.setThemeMode(mode);
}
</script>

<style scoped>
.token-swatch {
  height: 48px;
}
</style>
