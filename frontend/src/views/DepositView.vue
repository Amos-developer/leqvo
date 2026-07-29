<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { createDeposit } from "../utils/api";

const assets = [
  {
    label: "USDT",
    value: "usdt",
    name: "Tether USD",
    networks: [
      { label: "TRC20", value: "trc20", fee: "Fast" },
      { label: "BEP20", value: "bep20", fee: "Low fee" }
    ]
  },
  {
    label: "USDC",
    value: "usdc",
    name: "USD Coin",
    networks: [{ label: "BEP20", value: "bep20", fee: "Low fee" }]
  },
  {
    label: "BNB",
    value: "bnb",
    name: "BNB Smart Chain",
    networks: [{ label: "BEP20", value: "bep20", fee: "Native" }]
  }
];

const selectedAsset = ref(assets[0]);
const selectedNetwork = ref(selectedAsset.value.networks[0]);
const amount = ref("");
const MINIMUM_DEPOSIT = 30;
const router = useRouter();
const isGenerating = ref(false);
const errorMessage = ref("");

const availableNetworks = computed(() => selectedAsset.value.networks);
const isMinimumMet = computed(() => Number(amount.value) >= MINIMUM_DEPOSIT);
const canGenerate = computed(() => isMinimumMet.value && selectedAsset.value && selectedNetwork.value);

const formattedAmount = computed(() => {
  return Number(amount.value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
});

const generateAddress = async () => {
  if (!canGenerate.value) {
    return;
  }

  const user = JSON.parse(localStorage.getItem("leqvoUser") || "{}");

  isGenerating.value = true;
  errorMessage.value = "";

  try {
    const result = await createDeposit({
      userId: user.id,
      asset: selectedAsset.value.value,
      network: selectedNetwork.value.value,
      amount: Number(amount.value)
    });

    localStorage.setItem(
      "leqvoDepositRequest",
      JSON.stringify({
        asset: result.data.asset,
        network: result.data.network,
        amount: Number(result.data.priceAmount || amount.value).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        payAmount: result.data.payAmount,
        address: result.data.payAddress,
        qrCode: result.data.qrCode,
        paymentId: result.data.paymentId,
        status: result.data.status
      })
    );

    router.push("/deposit/address");
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isGenerating.value = false;
  }
};

watch(selectedAsset, (asset) => {
  selectedNetwork.value = asset.networks[0];
});
</script>

<template>
  <section class="phone-shell page-enter app-page deposit-page">
    <header class="deposit-header">
      <RouterLink to="/" class="back-button" aria-label="Go back">&larr;</RouterLink>
      <div>
        <h1>Deposit</h1>
      </div>
    </header>

    <section class="deposit-card deposit-hero">
      <div>
        <span>Funding asset</span>
        <strong>{{ selectedAsset.label }}</strong>
        <p>Select an asset and network, enter the amount, then generate a deposit address.</p>
      </div>
      <div class="minimum-pill">
        <span>Minimum</span>
        <strong>$30</strong>
      </div>
    </section>

    <section class="deposit-card">
      <h2>Select asset</h2>
      <div class="asset-grid">
        <button
          v-for="asset in assets"
          :key="asset.value"
          :class="{ active: selectedAsset.value === asset.value }"
          @click="selectedAsset = asset"
        >
          <strong>{{ asset.label }}</strong>
          <span>{{ asset.name }}</span>
        </button>
      </div>
    </section>

    <section class="deposit-card">
      <h2>Select network</h2>
      <div class="network-grid">
        <button
          v-for="network in availableNetworks"
          :key="network.value"
          :class="{ active: selectedNetwork.value === network.value }"
          @click="selectedNetwork = network"
        >
          <strong>{{ network.label }}</strong>
          <span>{{ selectedAsset.label }} - {{ network.fee }}</span>
        </button>
      </div>
    </section>

    <section class="deposit-card">
      <label class="amount-field">
        Amount
        <div>
          <input v-model="amount" type="number" min="1" step="0.01" placeholder="50.00" />
          <span>{{ selectedAsset.label }}</span>
        </div>
      </label>
      <p v-if="amount && !isMinimumMet" class="minimum-note">Minimum deposit amount is $30.</p>
      <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>

      <button class="primary-button" :disabled="!canGenerate || isGenerating" @click="generateAddress">
        {{ isGenerating ? "Requesting address..." : "Generate address" }}
      </button>
    </section>

    <section class="deposit-warning">
      <span class="warning-icon">!</span>
      <div>
        <strong>Minimum deposit warning</strong>
        <p>Sending an amount less than $30 may result in permanent loss of funds.</p>
      </div>
    </section>

    <section class="deposit-guide" aria-labelledby="deposit-guide-title">
      <div class="guide-heading">
        <span>Guide</span>
        <h2 id="deposit-guide-title">How to deposit</h2>
      </div>

      <div class="guide-steps">
        <article>
          <span class="guide-step-icon">1</span>
          <div>
            <strong>Choose asset and network</strong>
            <p>Select the coin you want to deposit, then choose the matching blockchain network.</p>
          </div>
        </article>
        <article>
          <span class="guide-step-icon">2</span>
          <div>
            <strong>Enter your amount</strong>
            <p>Type an amount of at least $30, then generate your deposit address.</p>
          </div>
        </article>
        <article>
          <span class="guide-step-icon">3</span>
          <div>
            <strong>Send to the address</strong>
            <p>Scan the QR code or copy the address, then send only through the selected network.</p>
          </div>
        </article>
        <article>
          <span class="guide-step-icon">4</span>
          <div>
            <strong>Wait for confirmation</strong>
            <p>Your balance updates after the blockchain payment is confirmed and verified.</p>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
