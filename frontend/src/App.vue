<template>
  <RouterView />
  <AppFooter v-if="showFooter" />
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppFooter from "./components/AppFooter.vue";

const route = useRoute();
const showFooter = computed(() => route.meta.requiresAuth);
</script>
