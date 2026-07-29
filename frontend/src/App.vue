<template>
  <div :class="{ 'admin-route-shell': route.name === 'admin' }">
    <RouterView />
    <AppFooter v-if="showFooter" />
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppFooter from "./components/AppFooter.vue";

const route = useRoute();
const showFooter = computed(() => route.meta.requiresAuth && !route.meta.hideFooter);
</script>
