<template>
  <nav aria-label="On this page">
    <ul class="list-unstyled mb-0">
      <li v-for="item in toc" :key="item.id" class="mb-1"
        :style="{ marginLeft: Math.max(0, item.level - 2) * 0.75 + 'rem' }">
        <router-link
          :to="{ name: 'docs', params: { slug }, hash: '#' + (item.id || docsHeadingHashId(item.title)) }"
          custom v-slot="{ navigate, href }">
          <a :href="href" @click.prevent="onNavigate(navigate)" class="toc-page-link text-decoration-none d-block"
            :class="{ 'is-disabled': editMode }">
            {{ stripHTML(item.title) }}
          </a>
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { stripHTML } from '@/utils/toc';
import { docsHeadingHashId } from '@/utils/docsHeadingId';

const props = defineProps({
  toc: { type: Array, required: true },
  slug: { type: String, required: true },
  editMode: { type: Boolean, default: false },
});

const emit = defineEmits(['navigated']);

function onNavigate(navigate) {
  if (props.editMode) return;
  navigate();
  emit('navigated');
}
</script>

<style scoped>
.toc-page-link {
  color: var(--bs-link-color);
  padding: 0.25rem 0;
  transition: color 0.2s ease;
}

.toc-page-link:hover {
  color: var(--bs-link-hover-color);
}

.toc-page-link.is-disabled {
  color: #adb5bd !important;
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}
</style>
