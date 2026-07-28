<script setup>
defineProps({
  activeItem: {
    type: String,
    default: "home"
  }
});

const items = [
  { key: "home", label: "Home", to: "/", icon: "home" },
  { key: "wallet", label: "Wallet", to: "/", icon: "wallet" },
  { key: "analytics", label: "Analytics", to: "/", icon: "chart" },
  { key: "profile", label: "Profile", to: "/login", icon: "user" }
];
</script>

<template>
  <nav class="bottom-nav" aria-label="Main navigation">
    <RouterLink
      v-for="item in items"
      :key="item.key"
      class="nav-item"
      :class="{ active: activeItem === item.key }"
      :to="item.to"
    >
      <span class="nav-icon" :class="`icon-${item.icon}`"></span>
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>
