<template>
  <div class="docs-sidebar-nav">
    <div v-if="isAdminUI" class="d-flex flex-column gap-1">
      <button class="btn btn-primary btn-sm" @click="$emit('new-doc')" :disabled="editMode">
        <i class="bi bi-plus-lg"></i> New Doc
      </button>
    </div>

    <div v-if="isAdminUI" class="py-1 px-2 border-bottom my-0"></div>

    <RouterLink :to="{ name: 'docs', params: { slug: 'home' } }" custom v-slot="{ navigate, href }">
      <a :href="href" @click.prevent="onNavigate(navigate)" class="sidebar-link mb-1" :class="[
        (activeSlug === 'home' || !activeSlug) ? 'active-link' : '',
        { 'is-disabled': editMode }
      ]">
        🏠 Home
      </a>
    </RouterLink>

    <RouterLink :to="{ name: 'docs', params: { slug: 'search' } }" custom v-slot="{ navigate, href }">
      <a :href="href" @click.prevent="onNavigate(navigate)" class="sidebar-link mb-0" :class="[
        activeSlug === 'search' ? 'active-link' : '',
        { 'is-disabled': editMode }
      ]">
        🔍 Search
      </a>
    </RouterLink>

    <div class="py-1 px-2 border-bottom my-0"></div>

    <ul class="list-unstyled mb-3">
      <li v-for="(docs, type) in groupedDocs" :key="type" class="mb-2">
        <div v-if="type !== 'top'" class="fw-bold text-uppercase small text-muted mb-1">
          {{ formatDocType(type) }}
        </div>

        <ul class="list-unstyled">
          <li v-for="doc in docs" :key="doc.slug">
            <div>
              <a href="#" @click.prevent="onDocClick(doc)" class="text-decoration-none" :class="[
                activeSlug === doc.slug ? 'fw-bold text-decoration-none' : '',
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
                      <a :href="href" @click.prevent="onNavigate(navigate)"
                        class="text-decoration-none d-block toc-link" :class="{ 'is-disabled': editMode }">
                        {{ stripHTML(item.title) }}
                      </a>
                    </router-link>
                  </li>
                </template>
                <li v-else>
                  <router-link :to="{ name: 'docs', params: { slug: doc.slug }, hash: '#top' }"
                    custom v-slot="{ navigate, href }">
                    <a :href="href" @click.prevent="onNavigate(navigate)" class="text-decoration-none d-block">
                      <i class="bi bi-file-earmark-text"></i> Open Document
                    </a>
                  </router-link>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { stripHTML } from '@/utils/toc';
import { docsHeadingHashId } from '@/utils/docsHeadingId';
import { useDocTypes } from '@/composables/useDocTypes';

const { formatDocTypeLabel } = useDocTypes();
const router = useRouter();

const props = defineProps({
  isAdminUI: { type: Boolean, default: false },
  editMode: { type: Boolean, default: false },
  groupedDocs: { type: Object, required: true },
  opendocs: { type: Array, required: true },
  activeSlug: { type: String, default: '' },
});

const emit = defineEmits(['navigated', 'new-doc', 'toggle-doc']);

function formatDocType(type) {
  return formatDocTypeLabel(type);
}

function onNavigate(navigate) {
  if (props.editMode) return;
  navigate();
  emit('navigated');
}

function onDocClick(doc) {
  if (props.editMode) return;
  if (doc.toc && doc.toc.length) {
    emit('toggle-doc', doc.slug);
  } else {
    router.push({ name: 'docs', params: { slug: doc.slug }, hash: '#top' });
    emit('navigated');
  }
}
</script>

<style scoped>
.sidebar-link,
.list-unstyled a {
  color: var(--bs-link-color);
  text-decoration: none;
  display: block;
  padding: 2px 0;
  transition: color 0.2s;
}

.active-link,
.list-unstyled a.fw-bold {
  color: var(--bs-primary) !important;
  font-weight: 700 !important;
}

.sidebar-link:hover,
.list-unstyled a:hover {
  color: var(--bs-link-hover-color);
}

.toc-link {
  transition: color 0.2s ease;
  cursor: pointer;
}

.toc-link.is-disabled,
.docs-sidebar-nav a.is-disabled {
  color: #adb5bd !important;
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  pointer-events: auto !important;
}
</style>
