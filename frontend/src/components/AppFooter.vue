<script setup>
import accountIcon from "../assets/icons/footer-account.svg";
import historyIcon from "../assets/icons/footer-history.svg";
import homeIcon from "../assets/icons/footer-home.svg";
import marketsIcon from "../assets/icons/footer-markets.svg";
import tradesIcon from "../assets/icons/footer-trades.svg";

const items = [
  { label: "Home", to: "/", icon: homeIcon },
  { label: "Markets", to: "/markets", icon: marketsIcon },
  { label: "Trades", to: "/trades", icon: tradesIcon },
  { label: "History", to: "/history", icon: historyIcon },
  { label: "Account", to: "/account", icon: accountIcon }
];
</script>

<template>
  <footer class="app-footer" aria-label="Main navigation">
    <RouterLink v-for="item in items" :key="item.to" class="footer-link" :to="item.to">
      <span class="footer-icon" aria-hidden="true">
        <img :src="item.icon" :alt="item.label" />
      </span>
      <span>{{ item.label }}</span>
    </RouterLink>
  </footer>
</template>
