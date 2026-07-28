<script setup>
import { computed, ref } from "vue";

const copied = ref(false);
const request = computed(() => {
  return JSON.parse(localStorage.getItem("leqvoDepositRequest") || "{}");
});

const qrCells = computed(() => {
  return Array.from({ length: 81 }, (_, index) => {
    return index % 2 === 0 || index % 5 === 0 || index % 13 === 0;
  });
});

const copyAddress = async () => {
  if (!request.value.address) {
    return;
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(request.value.address);
  } else {
    const input = document.createElement("input");
    input.value = request.value.address;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }

  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 1400);
};
</script>

<template>
  <section class="phone-shell page-enter app-page deposit-address-page">
    <header class="deposit-header">
      <RouterLink to="/deposit" class="back-button" aria-label="Go back">&larr;</RouterLink>
      <div>
        <h1>Scan to pay</h1>
      </div>
    </header>

    <section v-if="request.address" class="scan-card">
      <div class="scan-summary">
        <span>Send exactly</span>
        <strong>{{ request.amount }} {{ request.asset }}</strong>
        <p>{{ request.network }} network</p>
      </div>

      <div class="scan-qr-shell">
        <div class="scan-qr">
          <span v-for="(dark, index) in qrCells" :key="index" :class="{ dark }"></span>
        </div>
      </div>

      <div class="scan-address">
        <span>Deposit address</span>
        <strong>{{ request.address }}</strong>
        <button @click="copyAddress">
          <i class="copy-icon dark"></i>
          {{ copied ? "Copied" : "Copy address" }}
        </button>
      </div>

      <RouterLink to="/" class="send-money-button">I have sent the money</RouterLink>
    </section>

    <section v-else class="deposit-card empty-deposit">
      <strong>No deposit address generated</strong>
      <p>Go back and generate a new deposit address first.</p>
      <RouterLink to="/deposit" class="primary-button">Generate address</RouterLink>
    </section>

    <section class="deposit-warning">
      <span class="warning-icon">!</span>
      <div>
        <strong>Network warning</strong>
        <p>Send only the selected asset through the selected network. Wrong deposits may be lost.</p>
      </div>
    </section>
  </section>
</template>
