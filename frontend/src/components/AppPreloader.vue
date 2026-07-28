<script setup>
import AppLogo from "./AppLogo.vue";
</script>

<template>
  <div class="preloader" role="status" aria-live="polite">
    <div class="preloader-card">
      <AppLogo />
      <div class="loader-track">
        <span></span>
      </div>
      <p>Preparing your trading workspace</p>
    </div>
  </div>
</template>
