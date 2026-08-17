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
    <div class="mb-3">
      <h5 class="mb-0">Your work</h5>
      <p class="text-muted small mb-0">
        Browse available datasets below. A dataset is loaded only when tables show on the overview.
        Use <strong>Project</strong> in the nav for study info and linked datasets.
        You cannot add datasets or edit raw tables — ask an Admin if you need data loaded.
        If the chat icon is in the nav, you can use it when chat is configured for the team.
      </p>
    </div>

    <DatasetCatalogCard :show-owned-filter="false" />
  </div>
</template>
