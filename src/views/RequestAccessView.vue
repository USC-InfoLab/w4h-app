<template>
  <div class="d-flex flex-column align-items-center justify-content-center">
    <form class="form-signin mx-auto" style="max-width: 460px;" @submit.prevent="onSubmit">
      <img class="login-mark login-mark-hero mt-5 mx-auto d-block" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
      <div class="logotype mb-4 text-center">{{ APP_NAME }}</div>

      <div class="card">
        <div class="card-body">
          <h5 class="card-title text-center mb-3">Request access</h5>

          <template v-if="submitted">
            <div class="alert alert-success mb-3" role="status">{{ confirmation }}</div>
            <button type="button" class="btn btn-link w-100" @click="goLogin">Back to sign in</button>
          </template>

          <template v-else>
            <p class="text-muted small">
              {{ APP_NAME }} is open to <strong>USC researchers</strong> for now. Use your USC email
              address — we will send a link to confirm it. A person reviews each request and, if approved,
              sends you an invitation to set up your team.
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
            <button type="button" class="btn btn-link mt-2 w-100" @click="goLogin">Back to sign in</button>
          </template>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { api } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

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
