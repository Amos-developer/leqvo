<script setup>
defineProps({
  title: {
    type: String,
    required: true
  },
  subtitle: {
    type: String,
    required: true
  }
});
</script>

<template>
  <section class="auth-page page-enter">
    <div class="auth-visual">
      <RouterLink to="/" class="brand-mark" aria-label="Go to home">L</RouterLink>
      <span class="auth-ring ring-one"></span>
      <span class="auth-ring ring-two"></span>
      <span class="auth-chip chip-income">+$420</span>
      <span class="auth-chip chip-signal">Live signal</span>
      <div class="orbital-card">
        <div class="signal-mark">
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div>
          <p>Leqvo Signals</p>
          <strong>Trade smarter</strong>
        </div>
      </div>
    </div>

    <div class="auth-panel">
      <div class="auth-copy">
        <p class="eyebrow">Signal trading platform</p>
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
      <slot />
    </div>
  </section>
</template>
