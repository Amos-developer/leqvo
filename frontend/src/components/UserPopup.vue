<script setup>
import { useUserPopup } from "../composables/useUserPopup";

const { popupState, closeUserPopup } = useUserPopup();

const handlePrimary = () => {
  const callback = popupState.onConfirm;
  closeUserPopup();

  if (typeof callback === "function") {
    callback();
  }
};

const handleSecondary = () => {
  const callback = popupState.onSecondary;
  closeUserPopup();

  if (typeof callback === "function") {
    callback();
  }
};
</script>

<template>
  <div v-if="popupState.visible" class="user-popup-backdrop" role="dialog" aria-modal="true" aria-labelledby="user-popup-title">
    <div class="user-popup-card" :class="popupState.tone">
      <span class="user-popup-pill">{{ popupState.tone === "success" ? "Success" : "Notice" }}</span>
      <strong id="user-popup-title">{{ popupState.title }}</strong>
      <p>{{ popupState.message }}</p>
      <div class="user-popup-actions">
        <button v-if="popupState.secondaryLabel" type="button" class="secondary" @click="handleSecondary">
          {{ popupState.secondaryLabel }}
        </button>
        <button type="button" @click="handlePrimary">
          {{ popupState.buttonLabel }}
        </button>
      </div>
    </div>
  </div>
</template>
