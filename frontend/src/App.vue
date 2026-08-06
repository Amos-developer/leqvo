<template>
  <div :class="{ 'admin-route-shell': route.name === 'admin' }">
    <RouterView />
    <AppFooter v-if="showFooter" />
    <UserPopup v-if="route.name !== 'admin'" />
    <div v-if="showSessionWarning" class="session-modal" role="dialog" aria-modal="true" aria-labelledby="session-title">
      <div class="session-modal-card">
        <div class="session-warning-icon">!</div>
        <div>
          <strong id="session-title">Your session will expire soon</strong>
          <p>You have been inactive. Tap continue before the countdown ends to keep your account active.</p>
        </div>
        <div class="session-countdown" aria-label="Session countdown">
          <span>{{ countdownSeconds }}</span>
          <small>seconds left</small>
        </div>
        <button type="button" class="session-continue-button" @click="continueSession">Continue session</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppFooter from "./components/AppFooter.vue";
import UserPopup from "./components/UserPopup.vue";

const route = useRoute();
const router = useRouter();
const showFooter = computed(() => route.meta.requiresAuth && !route.meta.hideFooter);
const showSessionWarning = ref(false);
const countdownSeconds = ref(60);

const SESSION_TIMEOUT_MS = 60 * 60 * 1000;
const SESSION_WARNING_MS = 59 * 60 * 1000;
const SESSION_WARNING_SECONDS = Math.ceil((SESSION_TIMEOUT_MS - SESSION_WARNING_MS) / 1000);
const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"];
let warningTimer = null;
let logoutTimer = null;
let countdownTimer = null;

const hasActiveSession = () => {
  return Boolean(localStorage.getItem("leqvoUser") && localStorage.getItem("leqvoToken"));
};

const clearSessionTimers = () => {
  window.clearTimeout(warningTimer);
  window.clearTimeout(logoutTimer);
  window.clearInterval(countdownTimer);
};

const expireSession = () => {
  clearSessionTimers();
  showSessionWarning.value = false;
  countdownSeconds.value = SESSION_WARNING_SECONDS;
  localStorage.removeItem("leqvoUser");
  localStorage.removeItem("leqvoToken");
  router.push("/login");
};

const resetSessionTimer = () => {
  if (showSessionWarning.value) {
    return;
  }

  clearSessionTimers();
  showSessionWarning.value = false;

  if (!route.meta.requiresAuth || !hasActiveSession()) {
    return;
  }

  warningTimer = window.setTimeout(() => {
    countdownSeconds.value = SESSION_WARNING_SECONDS;
    showSessionWarning.value = true;
    countdownTimer = window.setInterval(() => {
      countdownSeconds.value = Math.max(countdownSeconds.value - 1, 0);
    }, 1000);
  }, SESSION_WARNING_MS);

  logoutTimer = window.setTimeout(expireSession, SESSION_TIMEOUT_MS);
};

const continueSession = () => {
  clearSessionTimers();
  showSessionWarning.value = false;
  countdownSeconds.value = SESSION_WARNING_SECONDS;
  resetSessionTimer();
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
