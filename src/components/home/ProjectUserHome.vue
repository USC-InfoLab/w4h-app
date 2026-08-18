<script setup>
import { ref } from 'vue';
import DatasetCatalogCard from '@/components/home/DatasetCatalogCard.vue';
import WelcomeNextSteps from '@/components/home/WelcomeNextSteps.vue';
import {
  dismissUserNextSteps,
  isUserNextStepsDismissed,
  userNextStepCards,
} from '@/components/home/nextStepCards';

defineProps({
  activeProjectId: { type: [String, Number], default: '' },
});

const showUserNextSteps = ref(!isUserNextStepsDismissed());

function hideUserNextSteps() {
  dismissUserNextSteps();
  showUserNextSteps.value = false;
}
</script>

<template>
  <div>
    <WelcomeNextSteps
      v-if="showUserNextSteps"
      title="Welcome — User"
      subtitle="Work in assigned projects. Admins ingest data; you run analytics on loaded tables."
      :cards="userNextStepCards"
      dismissable
      @dismiss="hideUserNextSteps"
    />
    <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
      <div>
        <h5 class="mb-0">Your work</h5>
        <p class="text-muted small mb-0">
          Browse available datasets below. A dataset is loaded only when tables show on the overview.
          Use <strong>Project</strong> in the nav for study info and linked datasets.
          You cannot add datasets or edit raw tables — ask an Admin if you need data loaded.
          If the chat icon is in the nav, you can use it when chat is configured for the team.
        </p>
      </div>
      <router-link
        :to="{ name: 'docs', params: { slug: 'whats-new' } }"
        class="btn btn-sm btn-outline-secondary flex-shrink-0"
      >
        <i class="bi bi-stars me-1"></i>What's New
      </router-link>
    </div>

    <DatasetCatalogCard :show-owned-filter="false" />
  </div>
</template>
