<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getAccountTransfers } from "../utils/api";

const router = useRouter();
const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");

const MINIMUM_WITHDRAWAL = 10;
const WITHDRAWAL_FEE_PERCENT = 5;

const assets = [
  { label: "USDT", value: "USDT", networks: ["TRC20", "BEP20"] },
  { label: "USDC", value: "USDC", networks: ["BEP20"] },
  { label: "BNB", value: "BNB", networks: ["BEP20"] }
];

const selectedAsset = ref(assets[0]);
const selectedNetwork = ref(assets[0].networks[0]);
const amount = ref("");
const address = ref("");
const emailCode = ref("");
const withdrawalPin = ref("");
const codeRequested = ref(false);
const formMessage = ref("");
const formError = ref("");
const eligibility = ref({
  hasTradingEntry: false,
  canWithdraw: false,
  remainingDays: 10
});

const hasWithdrawalPin = computed(() => Boolean(user.withdrawalPinSet || user.hasWithdrawalPin));
const availableBalance = computed(() => Number(user.balance || 0));
const feeAmount = computed(() => (Number(amount.value || 0) * WITHDRAWAL_FEE_PERCENT) / 100);
const receiveAmount = computed(() => Math.max(Number(amount.value || 0) - feeAmount.value, 0));
const isMinimumMet = computed(() => Number(amount.value || 0) >= MINIMUM_WITHDRAWAL);
const canSubmit = computed(() => {
  return (
    eligibility.value.canWithdraw &&
    isMinimumMet.value &&
    address.value.trim() &&
    emailCode.value.trim() &&
    withdrawalPin.value.trim()
  );
});

const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
};

const selectAsset = (asset) => {
  selectedAsset.value = asset;
  selectedNetwork.value = asset.networks[0];
};

const requestEmailCode = () => {
  formError.value = "";
  codeRequested.value = true;
  formMessage.value = `Verification code requested for ${user.email || "your email"}.`;
};

const loadWithdrawalEligibility = async () => {
  try {
    const result = await getAccountTransfers();
    eligibility.value = result.data?.eligibility || eligibility.value;
  } catch (error) {
    formError.value = error.message || "Could not check withdrawal eligibility.";
  }
};

const goToSetPin = () => {
  router.push({ name: "account", query: { section: "withdrawal-pin" } });
};

const submitWithdrawal = () => {
  formError.value = "";
  formMessage.value = "";

  if (!hasWithdrawalPin.value) {
    formError.value = "Set your withdrawal PIN before requesting a withdrawal.";
    return;
  }

  if (!eligibility.value.canWithdraw) {
    formError.value = eligibility.value.hasTradingEntry
      ? `Withdrawal unlocks after ${eligibility.value.remainingDays} more day(s) of trading.`
      : "Transfer at least 30 USDT to your trading account before withdrawal can be unlocked.";
    return;
  }

  if (!canSubmit.value) {
    formError.value = "Complete all withdrawal details first.";
    return;
  }

  formMessage.value = "Withdrawal request submitted for review.";
};

onMounted(loadWithdrawalEligibility);
</script>

<template>
  <section class="phone-shell page-enter app-page withdrawal-page">
    <header class="withdrawal-header">
      <RouterLink to="/" class="withdrawal-back-button" aria-label="Go back">&larr;</RouterLink>
      <div>
        <p>Secure payout</p>
        <h1>Withdrawal</h1>
      </div>
    </header>

    <section class="withdrawal-hero">
      <div>
        <span>Available balance</span>
        <strong>{{ formatCurrency(availableBalance) }}</strong>
        <p>Minimum withdrawal is $10. A 5% processing fee is deducted from each request.</p>
      </div>
      <div class="withdrawal-fee-badge">
        <span>Fee</span>
        <strong>5%</strong>
      </div>
    </section>

    <section v-if="!hasWithdrawalPin" class="pin-alert">
      <span class="pin-alert-icon">!</span>
      <div>
        <strong>Withdrawal PIN required</strong>
        <p>You need to set a withdrawal PIN before you can submit a payout request.</p>
        <button @click="goToSetPin">Set withdrawal PIN</button>
      </div>
    </section>

    <section v-if="!eligibility.canWithdraw" class="withdrawal-limit-card">
      <span class="limit-icon">10</span>
      <div>
        <strong>Trading period required</strong>
        <p v-if="eligibility.hasTradingEntry">
          Withdrawals unlock after {{ eligibility.remainingDays }} more day(s). Trading funds can return to main account
          after 10 trading days.
        </p>
        <p v-else>
          Transfer at least 30 USDT from main account to trading account first. Withdrawals unlock after 10 trading days.
        </p>
        <RouterLink to="/transfer">Go to Transfer</RouterLink>
      </div>
    </section>

    <section class="withdrawal-card withdrawal-asset-card">
      <h2>Select asset</h2>
      <div class="withdrawal-asset-grid">
        <button
          v-for="asset in assets"
          :key="asset.value"
          :class="{ active: selectedAsset.value === asset.value }"
          @click="selectAsset(asset)"
        >
          {{ asset.label }}
        </button>
      </div>
    </section>

    <section class="withdrawal-card withdrawal-network-card">
      <h2>Select network</h2>
      <div class="withdrawal-network-grid">
        <button
          v-for="network in selectedAsset.networks"
          :key="network"
          :class="{ active: selectedNetwork === network }"
          @click="selectedNetwork = network"
        >
          {{ network }}
        </button>
      </div>
    </section>

    <section class="withdrawal-card withdrawal-form-card">
      <label class="withdrawal-field">
        Amount
        <div>
          <input v-model="amount" type="number" min="1" step="0.01" placeholder="Enter amount" />
          <span>{{ selectedAsset.label }}</span>
        </div>
      </label>
      <p v-if="amount && !isMinimumMet" class="withdrawal-note">Minimum withdrawal amount is $10.</p>

      <label class="withdrawal-field">
        Withdrawal address
        <div>
          <input v-model.trim="address" type="text" placeholder="Enter wallet address" />
        </div>
      </label>

      <div class="email-code-row">
        <label class="withdrawal-field">
          Email code
          <div>
            <input v-model.trim="emailCode" type="text" placeholder="Enter email code" />
          </div>
        </label>
        <button @click="requestEmailCode">{{ codeRequested ? "Resend" : "Get code" }}</button>
      </div>

      <label class="withdrawal-field">
        Withdrawal PIN
        <div>
          <input v-model.trim="withdrawalPin" type="password" inputmode="numeric" placeholder="Enter withdrawal PIN" />
        </div>
      </label>

      <div class="withdrawal-breakdown">
        <div>
          <span>Request amount</span>
          <strong>{{ formatCurrency(amount) }}</strong>
        </div>
        <div>
          <span>Fee 5%</span>
          <strong>{{ formatCurrency(feeAmount) }}</strong>
        </div>
        <div>
          <span>You receive</span>
          <strong>{{ formatCurrency(receiveAmount) }}</strong>
        </div>
      </div>

      <button class="withdrawal-submit-button" :disabled="!hasWithdrawalPin || !canSubmit" @click="submitWithdrawal">
        Submit withdrawal
      </button>

      <p v-if="formError" class="withdrawal-message error">{{ formError }}</p>
      <p v-if="formMessage" class="withdrawal-message success">{{ formMessage }}</p>
    </section>

    <section class="withdrawal-guide" aria-labelledby="withdrawal-guide-title">
      <div class="withdrawal-guide-heading">
        <span>Guide</span>
        <h2 id="withdrawal-guide-title">How withdrawal works</h2>
      </div>
      <div class="withdrawal-guide-steps">
        <article>
          <span>1</span>
          <div>
            <strong>Enter payout details</strong>
            <p>Choose the asset, network, amount, and paste your correct wallet address.</p>
          </div>
        </article>
        <article>
          <span>2</span>
          <div>
            <strong>Verify by email and PIN</strong>
            <p>Request an email code, enter the code, then confirm with your withdrawal PIN.</p>
          </div>
        </article>
        <article>
          <span>3</span>
          <div>
            <strong>Fee is deducted</strong>
            <p>The 5% withdrawal fee is deducted before the final amount is sent.</p>
          </div>
        </article>
        <article>
          <span>4</span>
          <div>
            <strong>Processing starts</strong>
            <p>Your request is reviewed and processed to the selected network if all details are valid.</p>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
