<template>
  <GuestAuthLayout>
    <div class="card text-start">
      <div class="card-body p-4 text-center">
          <h2 class="h4 mb-3">Confirm your request</h2>

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
  </GuestAuthLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '@/utils/api';
import GuestAuthLayout from '@/components/GuestAuthLayout.vue';

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
