<template>
  <div class="p-3 mt-4">
    <div class="input-group mb-4">
      <span class="input-group-text"><i class="bi bi-search"></i></span>
      <input type="text" class="form-control" placeholder="Search by title or content..." v-model="searchTerm" />
    </div>

    <small>{{ filteredDocs.length }} results</small>

    <ul class="list-group">

      <!-- Loading / searching -->
      <li v-if="isSearching" class="list-group-item text-center text-muted">
        Searching…
      </li>

      <!-- Results -->
      <li v-for="doc in filteredDocs" :key="doc.slug"
        class="list-group-item d-flex justify-content-between align-items-center p-3">
        <div class="me-3 w-100">
          <div class="d-flex align-items-center mb-1">
            <h5 class="mb-0 text-primary">{{ doc.title }}</h5>
            <span
              class="badge rounded-pill bg-info-subtle text-info-emphasis border border-info-subtle ms-2 px-2 py-1 small">
              <i class="bi bi-info-circle me-1"></i>
              {{ doc.doc_type || 'general' }}
            </span>
          </div>

          <div v-if="doc.snippet" class="mb-1 text-muted small">
            <span v-html="'...' + cleanSnippet(doc.snippet) + '...'"></span>
          </div>

          <div class="text-muted" style="font-size: 0.75rem;">
            Updated {{ new Date(doc.updated_at).toLocaleDateString() }}
          </div>
        </div>

        <a :href="router.resolve({ name: 'docs', params: { slug: doc.slug } }).href" target="_blank"
          class="btn btn-sm btn-outline-primary d-flex align-items-center">
          View
          <i class="bi bi-box-arrow-up-right ms-2" style="font-size: 0.8rem;"></i>
        </a>
      </li>

    </ul>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue';
import { api, authHeaders } from '../utils/api'; // your existing API helper
import { useRouter } from 'vue-router'; // Assuming you need this for the button

const router = useRouter(); // Initialize router for the template

// --- Debounce Helper Function ---
// This function takes a function and a delay, and returns a new function
// that executes the original function only after the specified delay has passed
// without any new calls.
const debounce = (fn, delay) => {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
};

function cleanSnippet(text) {
  if (!text) return '';

  return text
    // 1. Remove complete and unclosed curly brace attributes: {target="...
    .replace(/\{[^}]+\}/g, '') // Complete: {attr}
    .replace(/\{[^}\s]*/g, '')  // Unclosed/Cut-off: {target="...

    // 2. Remove standard Markdown links: [Label](url) -> Label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    
    // 3. Remove cut-off Markdown links: [Label](http... -> Label
    .replace(/\[([^\]]+)\]\([^)\s]*/g, '$1')
    
    // 4. Remove any stray brackets [ or ] left over
    .replace(/[\[\]]/g, '')
    
    // 5. Remove structural MD (#, ##, **, _, `) but keep <b> tags
    // This lookahead ensures we don't accidentally match the 'b' in <b>
    .replace(/(?<!<|\/)[#*`_~]+(?![^<>]*>)/g, '')
    
    // 6. Consolidate whitespace and trim
    .replace(/\s+/g, ' ')
    .trim();
}

// --- Search & list state ---
const searchTerm = ref('');
const allDocs = ref([]);       // Full list from backend
const filteredDocs = ref([]);  // List shown in search results
const isSearching = ref(false);

// --- Existing form state (omitted for brevity) ---
const form = reactive({ /* ... */ });
const showForm = ref(false);

// --- API Search Function ---
// This is the core logic that makes the API call.
async function performSearch(q) {
  // 🎯 CHANGE 1: If query is empty, clear results and stop
  if (!q) {
    filteredDocs.value = [];
    isSearching.value = false;
    return;
  }

  isSearching.value = true;
  try {
    const res = await api.get(
      `/docs/search?term=${encodeURIComponent(q)}`,
      authHeaders()
    );
    filteredDocs.value = res.data;
  } catch (err) {
    console.error('Search failed:', err);
  } finally {
    isSearching.value = false;
  }
}

// async function performSearch(q) {
//   if (!q) {
//     filteredDocs.value = allDocs.value;
//     return;
//   }

//   isSearching.value = true;

//   try {
//     console.log('Searching docs for:', q);
//     const res = await api.get(
//       `/docs/search?term=${encodeURIComponent(q)}`,
//       authHeaders()
//     );
//     filteredDocs.value = res.data;
//   } catch (err) {
//     console.error('Search failed:', err);
//   } finally {
//     isSearching.value = false;
//   }
// }

// Wrap the API function in the debounce utility (e.g., 300ms delay)
const debouncedSearch = debounce(performSearch, 300);

// --- Live search watcher ---
// watch(searchTerm, (val) => {
//   const q = val.trim();
//   debouncedSearch(q); // Call the debounced function instead of the original
// });

watch(searchTerm, (val) => {
  const q = val.trim();
  
  if (!q) {
    // 🎯 Clear immediately without waiting for debounce
    filteredDocs.value = [];
    isSearching.value = false;
  } else {
    debouncedSearch(q);
  }
});

// 🎯 CHANGE 2: Don't show all docs on initial load
async function fetchDocs() {
  try {
    const res = await api.get('/docs', authHeaders());
    allDocs.value = res.data;
    // filteredDocs.value = res.data; // <--- REMOVE OR COMMENT THIS LINE
    filteredDocs.value = [];         // Initialize as empty
  } catch (err) {
    console.error('Failed to fetch documents:', err);
  }
}


// // --- Fetch all docs on load ---
// async function fetchDocs() {
//   try {
//     const res = await api.get('/docs', authHeaders());
//     allDocs.value = res.data;
//     filteredDocs.value = res.data; // initial view
//   } catch (err) {
//     console.error('Failed to fetch documents:', err);
//   }
// }

// function formatSnippet(text) {
//   if (!text) return '';

//   return text
//     // 1. Remove Markdown headers (###), bold/italic (**, _), and backticks (`)
//     .replace(/[#*`_~]/g, '')
//     // 2. Convert Markdown links [text](url) to just the "text"
//     .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
//     // 3. Remove Markdown images ![alt](url)
//     .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
//     // 4. Clean up any double spaces left over
//     .replace(/\s+/g, ' ')
//     .trim();
// }

onMounted(() => {
  fetchDocs(); // Call this function on mount
});

// --- Existing helpers ---
// function capitalizeType(type) {
//   if (!type) return '';
//   return type.charAt(0).toUpperCase() + type.slice(1);
// }
// </script>

<style scoped>
/* Target the <b> tags inside the snippet to highlight matches */
.text-muted :deep(b) {
  color: var(--bs-emphasis-color);
  background-color: rgba(255, 193, 7, 0.2);
  /* Very subtle yellow tint */
  padding: 0 2px;
  border-radius: 2px;
}

.list-group-item:hover {
  background-color: var(--bs-tertiary-bg);
}

.badge {
  font-weight: 500;
  letter-spacing: 0.02em;
}
</style>