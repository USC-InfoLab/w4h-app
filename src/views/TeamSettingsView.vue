<template>
  <main class="container-fluid">
    <h5 class="mb-3">
      <i class="bi bi-stars me-1"></i>
      Team settings
    </h5>
    <p v-if="!teamId" class="text-muted">
      Select a project so we know which lab (team) to configure.
    </p>
    <TeamAiSettings
      v-else
      :team-id="teamId"
      :can-edit="canEdit"
    />
  </main>
</template>

<script setup>
import { computed } from 'vue';
import { useTeamContext } from '@/composables/useTeamContext';
import TeamAiSettings from '@/components/TeamAiSettings.vue';

const { activeTeamId, isActiveTeamAdmin } = useTeamContext();
const teamId = computed(() => activeTeamId.value || '');
const canEdit = computed(() => !!isActiveTeamAdmin.value);
</script>
