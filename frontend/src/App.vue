<template>
  <div :class="{ 'admin-route-shell': route.name === 'admin' }">
    <RouterView />
    <AppFooter v-if="showFooter" />
    <div v-if="showSessionWarning" class="session-modal" role="dialog" aria-modal="true" aria-labelledby="session-title">
      <div class="session-modal-card">
        <div class="session-warning-icon">!</div>
        <div>
          <strong id="session-title">Your session will expire soon</strong>
          <p>You have been inactive. Tap continue or move anywhere to keep your account active.</p>
        </div>
        <button type="button" class="session-continue-button" @click="resetSessionTimer">Continue session</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppFooter from "./components/AppFooter.vue";

const route = useRoute();
const router = useRouter();
const showFooter = computed(() => route.meta.requiresAuth && !route.meta.hideFooter);
const showSessionWarning = ref(false);

const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const SESSION_WARNING_MS = 4 * 60 * 1000;
const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"];
let warningTimer = null;
let logoutTimer = null;

const hasActiveSession = () => {
  return Boolean(localStorage.getItem("leqvoUser") && localStorage.getItem("leqvoToken"));
};

const clearSessionTimers = () => {
  window.clearTimeout(warningTimer);
  window.clearTimeout(logoutTimer);
};

const expireSession = () => {
  clearSessionTimers();
  showSessionWarning.value = false;
  localStorage.removeItem("leqvoUser");
  localStorage.removeItem("leqvoToken");
  router.push("/login");
};

const resetSessionTimer = () => {
  clearSessionTimers();
  showSessionWarning.value = false;

  if (!route.meta.requiresAuth || !hasActiveSession()) {
    return;
  }

  warningTimer = window.setTimeout(() => {
    showSessionWarning.value = true;
  }, SESSION_WARNING_MS);

  logoutTimer = window.setTimeout(expireSession, SESSION_TIMEOUT_MS);
};

onMounted(() => {
  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, resetSessionTimer, { passive: true });
  });
  resetSessionTimer();
});

onUnmounted(() => {
  activityEvents.forEach((eventName) => {
    window.removeEventListener(eventName, resetSessionTimer);
  });
  clearSessionTimers();
});

watch(() => route.fullPath, resetSessionTimer);
</script>
