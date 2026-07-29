<script setup>
import { computed, ref } from "vue";
import { refreshDepositStatus } from "../utils/api";

const copied = ref(false);
const isRefreshing = ref(false);
const refreshMessage = ref("");
const request = computed(() => {
  return JSON.parse(localStorage.getItem("leqvoDepositRequest") || "{}");
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

const checkPaymentStatus = async () => {
  if (!request.value.paymentId) {
    return;
  }

  isRefreshing.value = true;
  refreshMessage.value = "";

  try {
    const result = await refreshDepositStatus(request.value.paymentId);
    const updatedRequest = {
      ...request.value,
      status: result.data.status,
      payAmount: result.data.payAmount,
      creditedAt: result.data.creditedAt
    };

    localStorage.setItem("leqvoDepositRequest", JSON.stringify(updatedRequest));
    refreshMessage.value = result.data.creditedAt
      ? "Payment confirmed. Balance updated."
      : `Current status: ${result.data.status}`;
  } catch (error) {
    refreshMessage.value = error.message;
  } finally {
    isRefreshing.value = false;
  }
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
        <strong>{{ request.payAmount || request.amount }} {{ request.asset }}</strong>
        <small>Deposit request: ${{ request.amount }}</small>
        <p>{{ request.network }} network</p>
        <p class="scan-status">Status: {{ request.status || "waiting" }}</p>
      </div>

      <div class="scan-qr-shell">
        <img class="real-qr-code" :src="request.qrCode" alt="Deposit address QR code" />
      </div>

      <div class="scan-address">
        <span>Deposit address</span>
        <strong>{{ request.address }}</strong>
        <button @click="copyAddress">
          <i class="copy-icon dark"></i>
          {{ copied ? "Copied" : "Copy address" }}
        </button>
      </div>

      <button class="send-money-button" :disabled="isRefreshing" @click="checkPaymentStatus">
        {{ isRefreshing ? "Checking..." : "I have sent the money" }}
      </button>
      <p v-if="refreshMessage" class="copy-note">{{ refreshMessage }}</p>
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

    <section class="deposit-guide address-guide" aria-labelledby="address-guide-title">
      <div class="guide-heading">
        <span>Payment guide</span>
        <h2 id="address-guide-title">How this works</h2>
      </div>

      <div class="guide-steps">
        <article>
          <span class="guide-step-icon">1</span>
          <div>
            <strong>Use this exact payment</strong>
            <p>The QR code and address belong to your selected asset, network, and latest amount.</p>
          </div>
        </article>
        <article>
          <span class="guide-step-icon">2</span>
          <div>
            <strong>Copy or scan</strong>
            <p>Open your crypto wallet, paste the address or scan the QR code, then send the exact amount shown.</p>
          </div>
        </article>
        <article>
          <span class="guide-step-icon">3</span>
          <div>
            <strong>Confirm payment</strong>
            <p>After sending, tap “I have sent the money” to refresh the payment status.</p>
          </div>
        </article>
        <article>
          <span class="guide-step-icon">4</span>
          <div>
            <strong>Balance update</strong>
            <p>Your balance updates only after the payment is confirmed and meets the $30 minimum.</p>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
