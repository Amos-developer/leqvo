<template>
  <AppPreloader v-if="isLoading" />
  <template v-else>
    <RouterView />
    <AppFooter v-if="showFooter" />
  </template>
</template>

<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppFooter from "./components/AppFooter.vue";
import AppPreloader from "./components/AppPreloader.vue";

const route = useRoute();
const isLoading = ref(true);
const hasMounted = ref(false);
const showFooter = computed(() => route.meta.requiresAuth && !route.meta.hideFooter);
const PRELOADER_DURATION_MS = 2000;

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false;
    hasMounted.value = true;
  }, PRELOADER_DURATION_MS);
});

watch(
  () => route.fullPath,
  () => {
    if (!hasMounted.value) {
      return;
    }

    isLoading.value = true;
    setTimeout(() => {
      isLoading.value = false;
    }, PRELOADER_DURATION_MS);
  }
);
</script>
