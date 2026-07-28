<script setup>
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

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

const availableNetworks = computed(() => selectedAsset.value.networks);
const isMinimumMet = computed(() => Number(amount.value) >= MINIMUM_DEPOSIT);
const canGenerate = computed(() => isMinimumMet.value && selectedAsset.value && selectedNetwork.value);

const formattedAmount = computed(() => {
  return Number(amount.value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
});

const generateAddress = () => {
  if (!canGenerate.value) {
    return;
  }

  const assetPrefix = selectedAsset.value.label;
  const networkPrefix = selectedNetwork.value.value.toUpperCase();
  const seed = `${assetPrefix}${networkPrefix}${Date.now().toString(36)}`.replace(/[^A-Z0-9]/g, "");

  localStorage.setItem(
    "leqvoDepositRequest",
    JSON.stringify({
      asset: selectedAsset.value.label,
      network: selectedNetwork.value.label,
      amount: formattedAmount.value,
      address: `NOW-${assetPrefix}-${networkPrefix}-${seed.slice(-10)}-LEQVO`
    })
  );

  router.push("/deposit/address");
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

      <button class="primary-button" :disabled="!canGenerate" @click="generateAddress">
        Generate address
      </button>
    </section>

    <section class="deposit-warning">
      <span class="warning-icon">!</span>
      <div>
        <strong>Minimum deposit warning</strong>
        <p>Sending an amount less than $30 may result in permanent loss of funds.</p>
      </div>
    </section>
  </section>
</template>
