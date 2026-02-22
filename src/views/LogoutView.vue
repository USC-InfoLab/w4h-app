<template>
  <div class="logout">
    <div class="text-center">
      <img class="mt-5" style="width: 230px" src="/w4h.svg" />
      <div class="logotype">W4H Toolkit</div>
      <div class="mt-4">
        You have been logged off from <router-link :to="{ name: 'login' }">
          W4H Toolkit
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
html,
body {
  height: 100%;
}

.logotype {
  margin: 20px 0;
  font-size: 1.5em;
  font-weight: bolder;
}
</style>
