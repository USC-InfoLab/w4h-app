<template>
  <div class="d-flex flex-column align-items-center justify-content-center">
    <div class="form-signin mx-auto" style="max-width: 420px;">
      <img class="login-mark login-mark-hero mt-5 mx-auto d-block" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
      <div class="logotype mb-4 text-center">{{ APP_NAME }}</div>

      <div class="card">
        <div class="card-body text-center">
          <h5 class="card-title mb-3">Confirm your request</h5>

          <div v-if="loading" class="py-4">
            <div class="spinner-border text-primary" role="status"></div>
            <p class="text-muted mt-2 mb-0">Confirming…</p>
          </div>
          <div v-else-if="error" class="alert alert-danger mb-3" role="alert">{{ error }}</div>
          <div v-else class="alert alert-success mb-3" role="status">{{ message }}</div>

          <button v-if="!loading" type="button" class="btn btn-link w-100" @click="router.push({ name: 'login' })">
            Back to sign in
          </button>
          <router-link v-if="!loading && error" :to="{ name: 'requestAccess' }" class="btn btn-link w-100">
            Submit a new request
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/utils/api';
import { APP_NAME } from '@/utils/defs';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const error = ref('');
const message = ref('');

// POST (not GET) so mail scanners that prefetch links cannot consume the token.
onMounted(async () => {
  const token = String(route.query.token || '');
  if (!token) {
    error.value = 'This confirmation link is incomplete.';
    loading.value = false;
    return;
  }
  try {
    const res = await api.post('access-requests/verify', { token });
    message.value = res.data?.message || 'Your request is confirmed and waiting for review.';
  } catch (e) {
    error.value = e.response?.data?.error || 'This link is invalid or has expired.';
  } finally {
    loading.value = false;
  }
});
</script>
