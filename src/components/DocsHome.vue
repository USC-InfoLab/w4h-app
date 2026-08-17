<template>
  <div class="p-3">
    <p class="fs-4">Welcome to <strong>W4H Toolkit</strong>!</p>

    <p>If you are not familiar with W4H Toolkit, you may want to keep reading. If you just want to get going
      with ingesting, and analysing your wearable and clinical data, head to the
      <router-link :to="{ name: 'docs', params: { slug: 'quick-start' } }">⚡️ Quick Start <i
          class="bi bi-box-arrow-up-right"></i></router-link> guide.
      Open <strong>PHI-safe AI chat</strong> (<kbd>⌘J</kbd>) for import, processing, and IRB questions.
    </p>

    <h2>Key Concepts (Data)</h2>

    <p>W4H is a platform that stores and indexes your wearable data and provides analytical modules:</p>

    <ul>
      <li>
        <router-link :to="{ name: 'contributions' }">Contributions <i
            class="bi bi-box-arrow-up-right"></i></router-link>
        for curated notebooks, CLI, scripts, and Postgres extensions.
      </li>
    </ul>

    <h2>Pick Your Learning Path</h2>

    <p>Everyone learns differently. Choose the path that suits you best - although we do recommend going over all
      of the content, if possible!</p>

    <div class="container mt-2 mb-5">
      <div class="row g-3">
        <div class="col-md-6">
          <div class="alert alert-success rounded shadow-sm p-3 h-100">
            <div class="fw-bold fs-5 mb-2">Read the guide</div>
            The guide walks you through every aspect of the platform in full detail
          </div>
        </div>
        <div class="col-md-6">
          <div class="alert alert-success rounded shadow-sm p-3 h-100">
            <div class="fw-bold fs-5 mb-2">Try the tutorials</div>
            For those who prefer to learn things hands-on
          </div>
        </div>
      </div>
    </div>

    <h2>Still Got Questions?</h2>

    <p>Check out our
      <router-link :to="{ name: 'docs', params: { slug: 'faq' } }">FAQ <i
          class="bi bi-box-arrow-up-right"></i></router-link>
      for answers to common questions.
    </p>
  </div>
</template>

<script setup>
// const props = defineProps({
//   city: {
//     type: Object,
//     required: true
//   }
// });
</script>
