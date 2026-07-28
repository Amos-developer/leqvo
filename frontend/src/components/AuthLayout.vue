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
