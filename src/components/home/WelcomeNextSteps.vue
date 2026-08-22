<script setup>
defineProps({
  title: { type: String, default: 'Next steps' },
  subtitle: { type: String, default: '' },
  cards: { type: Array, required: true },
  dismissable: { type: Boolean, default: false },
});

const emit = defineEmits(['dismiss']);
</script>

<template>
  <div class="w4h-callout mb-3 mt-2" role="status">
    <h5 class="alert-heading mb-1">{{ title }}</h5>
    <p v-if="subtitle" class="mb-3 small">{{ subtitle }}</p>
    <div class="row g-2">
      <div v-for="card in cards" :key="card.title" class="col-12 col-sm-6 col-xl-3">
        <div class="card h-100">
          <div class="card-body d-flex flex-column">
            <h6 class="card-title">{{ card.title }}</h6>
            <p class="card-text small text-muted flex-grow-1 mb-2">{{ card.text }}</p>
            <router-link v-if="card.to" :to="card.to" class="btn btn-sm btn-primary align-self-start">
              {{ card.label || 'Open' }}
            </router-link>
          </div>
        </div>
      </div>
    </div>
    <button v-if="dismissable" type="button" class="btn btn-sm btn-outline-primary mt-3" @click="emit('dismiss')">
      Got it — hide this guide
    </button>
  </div>
</template>
