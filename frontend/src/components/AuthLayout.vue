<script setup>
import { computed, useSlots } from "vue";

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

const slots = useSlots();
const hasVisual = computed(() => Boolean(slots.visual));
</script>

<template>
  <section class="auth-page page-enter" :class="{ 'has-auth-visual': hasVisual }">
    <div class="auth-panel">
      <div class="auth-copy">
        <p class="eyebrow">Signal trading platform</p>
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </div>
      <slot />
    </div>
    <slot name="visual" />
  </section>
</template>
