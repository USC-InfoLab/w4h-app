<template>
  <main role="main" class="container" style="max-width: 560px;">
    <h5 class="mt-4 mb-2">
      <i class="bi bi-people-fill me-1"></i>
      {{ firstTeam ? 'Create your team' : 'New team' }}
    </h5>
    <p class="text-muted small">
      <template v-if="firstTeam">
        Welcome to {{ APP_NAME }}. A <strong>team</strong> is your lab or study group — the boundary for
        your people, datasets and projects. You are its Admin and can add further teams later.
      </template>
      <template v-else>
        Add a team for another study or group. You become its Admin; nobody needs to approve it.
      </template>
    </p>

    <form class="card card-body" @submit.prevent="onSubmit">
      <div class="mb-3">
        <label class="form-label" for="team-name">Team name</label>
        <input id="team-name" v-model.trim="name" class="form-control" maxlength="120"
          placeholder="e.g. Smith Lab" required />
      </div>
      <div v-if="error" class="alert alert-danger py-2 small" role="alert">{{ error }}</div>
      <div class="d-flex gap-2">
        <button class="btn btn-primary" type="submit" :disabled="busy || !name">
          {{ busy ? 'Creating…' : 'Create team' }}
        </button>
        <button v-if="!firstTeam" type="button" class="btn btn-link" @click="router.back()">Cancel</button>
      </div>
    </form>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { api, authHeaders } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';
import { useUserStore } from '@/stores/user';
import { isSuperAdmin } from '@/utils/roles';

const router = useRouter();
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const name = ref('');
const busy = ref(false);
const error = ref('');

const firstTeam = computed(() => !(user.value?.team_memberships || []).length);

onMounted(() => {
  // Super admins approve access requests; they never create teams.
  if (isSuperAdmin(user.value?.role)) router.replace({ name: 'adminHome' });
});

async function onSubmit() {
  busy.value = true;
  error.value = '';
  try {
    await api.post('teams', { name: name.value }, authHeaders());
    // Pick up the new membership and capabilities.
    const session = await api.get('users/me/session', authHeaders());
    await userStore.setUser({ ...user.value, ...session.data });
    router.push({ name: 'home' });
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not create the team.';
  } finally {
    busy.value = false;
  }
}
</script>
