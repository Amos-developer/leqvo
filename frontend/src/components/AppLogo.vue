<script setup>
defineProps({
  compact: {
    type: Boolean,
    default: false
  }
});
</script>

<template>
  <div class="app-logo" :class="{ compact }" aria-label="Leqvo">
    <svg class="logo-symbol-svg" viewBox="0 0 84 84" role="img" aria-hidden="true">
      <defs>
        <linearGradient id="leqvoLogoGradient" x1="14" y1="18" x2="72" y2="68">
          <stop offset="0" stop-color="#f94fa7" />
          <stop offset="0.52" stop-color="#e447c6" />
          <stop offset="1" stop-color="#8e35f1" />
        </linearGradient>
      </defs>
      <path class="new-logo-bar" d="M24 50V36c0-3 2-5 5-7l9-6c2-1 4 0 4 3v21c0 2-1 4-3 5l-10 6c-2 1-5 0-5-3v-5Z" />
      <path class="new-logo-bar" d="M44 48V25c0-3 2-5 5-7l10-6c2-1 4 0 4 3v34c0 2-1 4-3 5l-10 7c-3 2-6 0-6-4v-9Z" />
      <path class="new-logo-arrow" d="M15 62l24-18 17 16 24-24" />
      <path class="new-logo-arrow-head" d="M66 36l14-3-3 14" />
    </svg>

    <span v-if="!compact" class="logo-text">
      Leq<span>v</span>o
    </span>
  </div>
</template>
