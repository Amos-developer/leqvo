<script setup>
import { computed, useSlots } from "vue";
import authLogo from "../assets/icons/leqvo-wordmark.svg";

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
      <div class="auth-topbar">
        <RouterLink class="auth-wordmark" to="/login" aria-label="Leqvo">
          <img :src="authLogo" alt="Leqvo" />
        </RouterLink>
        <button class="auth-language-button" type="button" aria-label="Change language">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18" />
            <path d="M12 3c2.4 2.5 3.6 5.5 3.6 9s-1.2 6.5-3.6 9" />
            <path d="M12 3c-2.4 2.5-3.6 5.5-3.6 9s1.2 6.5 3.6 9" />
          </svg>
          <span>ENG</span>
        </button>
      </div>
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
