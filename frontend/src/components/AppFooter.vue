<script setup>
const items = [
  { label: "Home", to: "/", icon: "home" },
  { label: "Markets", to: "/markets", icon: "markets" },
  { label: "Trades", to: "/trades", icon: "trades" },
  { label: "History", to: "/history", icon: "history" },
  { label: "Account", to: "/account", icon: "account" }
];
</script>

<template>
  <footer class="app-footer" aria-label="Main navigation">
    <RouterLink v-for="item in items" :key="item.to" class="footer-link" :to="item.to">
      <span class="footer-icon" :class="`footer-icon-${item.icon}`"></span>
      <span>{{ item.label }}</span>
    </RouterLink>
  </footer>
</template>
