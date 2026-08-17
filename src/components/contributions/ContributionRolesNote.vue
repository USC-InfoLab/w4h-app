<template>
  <div class="alert alert-secondary small mb-3">
    <p v-if="isAdmin" class="mb-0">
      Link datasets on the project, then <strong>adapt an ingest notebook</strong> from this catalog
      for your export. Importer repos also ship a <strong>CLI</strong> for scheduled and incremental
      updates. Do not ingest the Samples sandbox. Use a personal API key; never commit it.
    </p>
    <p v-else class="mb-0">
      Browse analysis tools against <strong>loaded</strong> datasets (tables on the overview).
      You cannot add datasets or edit raw tables — ask an Admin if data is missing.
    </p>
  </div>
</template>

<script setup>
import { useTeamContext } from '@/composables/useTeamContext';

const { isActiveProjectAdmin } = useTeamContext();
const isAdmin = isActiveProjectAdmin;
</script>
