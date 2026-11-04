<template>
  <div class="guest-shell">
    <aside class="guest-intro" aria-labelledby="guest-intro-heading">
      <img class="guest-intro-mark" src="/w4h-light.svg" :alt="`${APP_NAME} logo`" />
      <p class="guest-kicker">USC · Wearables for Health</p>
      <h1 id="guest-intro-heading" class="guest-intro-title">{{ APP_NAME }}</h1>
      <p class="guest-lede">
        A research platform for ingesting, organizing, and analyzing wearable
        health data — heart rate, movement, sleep, and other time-series — in
        team-owned projects.
      </p>

      <template v-if="panel === 'setup'">
        <p class="guest-lede mb-0">
          First-time setup: connect PostgreSQL, then create the Super admin
          account. After that, researchers request access from this screen.
        </p>
      </template>
      <template v-else>
        <h2 class="guest-section-title">How researchers join</h2>
        <ol class="guest-steps">
          <li>
            <strong>Request access</strong> with a USC email (the form is next to
            sign-in).
          </li>
          <li>
            Confirm the link we send. Until you do, nobody sees the request.
          </li>
          <li>
            After approval you receive an invitation, set a password, and
            <strong>create your own team</strong>.
          </li>
        </ol>
        <p class="guest-note">
          Help, Contributions, and project docs live inside the app after you
          sign in. Until then, the
          <a :href="W4H_PROJECT_URL" target="_blank" rel="noopener noreferrer">
            USC InfoLab project page
          </a>
          is the public overview.
        </p>
      </template>
    </aside>

    <div class="guest-main">
      <div class="guest-main-inner">
        <slot />
        <p v-if="copyright" class="guest-footer text-muted">{{ copyright }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { APP_NAME, W4H_PROJECT_URL } from '@/utils/defs';

defineProps({
  panel: {
    type: String,
    default: 'welcome',
    validator: (v) => v === 'welcome' || v === 'setup',
  },
});

const copyright = import.meta.env.VITE_COPYRIGHT;
</script>

<style scoped>
.guest-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(22rem, 28rem);
}

.guest-intro {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3rem clamp(1.5rem, 4vw, 4rem);
  text-align: left;
  color: #fff;
  background:
    linear-gradient(165deg, rgba(255, 204, 0, 0.14), transparent 42%),
    linear-gradient(180deg, #7a0000 0%, var(--w4h-nav-bg, #630000) 55%, #3d0000 100%);
}

.guest-intro-mark {
  width: 72px;
  height: auto;
  margin-bottom: 1.25rem;
  border-radius: 1.15rem;
  box-shadow: 0 0 0 2px rgba(255, 204, 0, 0.35);
}

.guest-kicker {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--w4h-gold, #ffcc00);
}

.guest-intro-title {
  margin: 0 0 1rem;
  font-size: clamp(1.75rem, 2.4vw, 2.25rem);
  font-weight: 700;
  line-height: 1.2;
}

.guest-lede {
  margin: 0 0 1.5rem;
  max-width: 36rem;
  font-size: 1.05rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
}

.guest-section-title {
  margin: 0 0 0.75rem;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--w4h-gold, #ffcc00);
}

.guest-steps {
  margin: 0 0 1.25rem;
  padding-left: 1.2rem;
  max-width: 36rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.9);
}

.guest-steps li + li {
  margin-top: 0.55rem;
}

.guest-note {
  margin: 0;
  max-width: 36rem;
  font-size: 0.95rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.78);
}

.guest-intro a,
.guest-note a {
  color: var(--w4h-gold, #ffcc00) !important;
  text-underline-offset: 0.15em;
}

.guest-note a:hover {
  text-decoration: underline;
}

.guest-main {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
  background: var(--bs-body-bg);
}

.guest-main-inner {
  width: 100%;
  max-width: 26rem;
}

.guest-footer {
  margin: 1.5rem 0 0;
  font-size: 0.8rem;
  text-align: center;
}

@media (max-width: 991.98px) {
  .guest-shell {
    grid-template-columns: 1fr;
  }

  .guest-intro {
    padding: 2rem 1.25rem 1.75rem;
    min-height: auto;
  }

  .guest-intro-mark {
    width: 56px;
  }
}
</style>
