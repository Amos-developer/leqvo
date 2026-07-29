<script setup>
import preloaderLogo from "../assets/icons/leqvo-wordmark.svg";
</script>

<template>
  <div class="preloader" role="status" aria-live="polite">
    <div class="preloader-card">
      <img class="preloader-logo-image" :src="preloaderLogo" alt="Leqvo logo" />
      <div class="loader-track">
        <span></span>
      </div>
      <p>Preparing your trading workspace</p>
    </div>
  </div>
</template>
