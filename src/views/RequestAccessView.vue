<template>
  <GuestAuthLayout>
    <form class="card text-start" @submit.prevent="onSubmit">
      <div class="card-body p-4">
          <h2 class="h4 mb-1">Request access</h2>

          <template v-if="submitted">
            <div class="alert alert-success mb-0" role="status">{{ confirmation }}</div>
          </template>

          <template v-else>
            <p class="text-muted small">
              Open to <strong>USC researchers</strong> for now. We email a confirmation link to your USC
              address. After a person approves the request you get an invitation and create your own team.
            </p>

            <div class="mb-3">
              <label class="form-label" for="ra-name">Name</label>
              <input id="ra-name" v-model.trim="form.name" class="form-control" maxlength="120"
                autocomplete="name" required />
            </div>
            <div class="mb-3">
              <label class="form-label" for="ra-email">USC email</label>
              <input id="ra-email" v-model.trim="form.email" type="email" class="form-control"
                placeholder="name@usc.edu" autocomplete="email" required />
            </div>
            <div class="mb-3">
              <label class="form-label" for="ra-affiliation">Lab / department</label>
              <input id="ra-affiliation" v-model.trim="form.affiliation" class="form-control" maxlength="200"
                required />
            </div>
            <div class="mb-3">
              <label class="form-label" for="ra-purpose">What will you use it for?</label>
              <textarea id="ra-purpose" v-model.trim="form.purpose" class="form-control" rows="3"
                maxlength="1000" required></textarea>
              <div class="form-text">Briefly. Do not include patient or study data.</div>
            </div>

            <!-- Honeypot: hidden from people, filled in by bots. -->
            <div class="visually-hidden" aria-hidden="true">
              <label for="ra-website">Website</label>
              <input id="ra-website" v-model="form.website" tabindex="-1" autocomplete="off" />
            </div>

            <div v-if="error" class="alert alert-danger py-2 small" role="alert">{{ error }}</div>

            <button class="w-100 btn btn-lg btn-primary" type="submit" :disabled="busy">
              {{ busy ? 'Sending…' : 'Send request' }}
            </button>
          </template>
      </div>
      <div class="card-footer bg-transparent text-center py-3">
        <button type="button" class="btn btn-link btn-sm" @click="goLogin">Back to sign in</button>
      </div>
    </form>
  </GuestAuthLayout>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/utils/api';
import GuestAuthLayout from '@/components/GuestAuthLayout.vue';

const router = useRouter();
const form = reactive({ name: '', email: '', affiliation: '', purpose: '', website: '' });
const busy = ref(false);
const error = ref('');
const submitted = ref(false);
const confirmation = ref('');

function goLogin() {
  router.push({ name: 'login' });
}

async function onSubmit() {
  busy.value = true;
  error.value = '';
  try {
    const res = await api.post('access-requests', { ...form });
    confirmation.value =
      res.data?.message || 'Thanks — check your USC inbox for a verification link.';
    submitted.value = true;
  } catch (e) {
    error.value = e.response?.data?.error || 'Could not send your request. Please try again later.';
  } finally {
    busy.value = false;
  }
}
</script>
