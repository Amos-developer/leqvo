<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { getMyWithdrawalAddress, requestWithdrawalAddressCode, submitWithdrawalAddress } from "../utils/api";

const router = useRouter();
const assets = [
  { label: "USDT", value: "USDT", networks: ["TRC20", "BEP20"] },
  { label: "USDC", value: "USDC", networks: ["BEP20"] },
  { label: "BNB", value: "BNB", networks: ["BEP20"] }
];
const form = ref({
  asset: "USDT",
  network: "TRC20",
  address: "",
  code: ""
});
const currentAddress = ref(null);
const isLoading = ref(false);
const isRequestingCode = ref(false);
const isSubmitting = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const codeMessage = ref("");
const codeRequested = ref(false);

const availableNetworks = computed(() => assets.find((asset) => asset.value === form.value.asset)?.networks || []);

const validateAddress = () => {
  const address = form.value.address.trim();

  if (!availableNetworks.value.includes(form.value.network)) {
    return "Choose a valid network for this asset.";
  }

  if (form.value.network === "TRC20" && !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    return "TRC20 address must start with T and be a valid TRON address.";
  }

  if (form.value.network === "BEP20" && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return "BEP20 address must be a valid 0x wallet address.";
  }

  return "";
};

const formatDate = (date) => {
  if (!date) return "Pending";

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
};

const loadAddress = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await getMyWithdrawalAddress();
    currentAddress.value = result.data;
  } catch (error) {
    errorMessage.value = error.message || "Could not load withdrawal address.";
  } finally {
    isLoading.value = false;
  }
};

const submitAddress = async () => {
  errorMessage.value = "";
  successMessage.value = "";

  const validationError = validateAddress();

  if (validationError) {
    errorMessage.value = validationError;
    return;
  }

  if (!codeRequested.value) {
    errorMessage.value = "Request an email code first.";
    return;
  }

  if (!/^\d{6}$/.test(form.value.code.trim())) {
    errorMessage.value = "Email code must be exactly 6 numbers.";
    return;
  }

  isSubmitting.value = true;

  try {
    const result = await submitWithdrawalAddress({
      asset: form.value.asset,
      network: form.value.network,
      address: form.value.address.trim(),
      code: form.value.code.trim()
    });
    currentAddress.value = result.data;
    form.value.address = "";
    form.value.code = "";
    codeRequested.value = false;
    codeMessage.value = "";
    successMessage.value = "Withdrawal address submitted for admin approval.";
  } catch (error) {
    errorMessage.value = error.message || "Could not submit withdrawal address.";
  } finally {
    isSubmitting.value = false;
  }
};

const requestCode = async () => {
  errorMessage.value = "";
  successMessage.value = "";
  codeMessage.value = "";
  isRequestingCode.value = true;

  try {
    const result = await requestWithdrawalAddressCode();
    codeRequested.value = true;
    codeMessage.value = result.data?.code
      ? `Code requested. Test code: ${result.data.code}`
      : "Email code requested.";
  } catch (error) {
    errorMessage.value = error.message || "Could not request email code.";
  } finally {
    isRequestingCode.value = false;
  }
};

watch(
  () => form.value.asset,
  () => {
    form.value.network = availableNetworks.value[0] || "";
  }
);

onMounted(loadAddress);
</script>

<template>
  <section class="withdrawal-address-page phone-shell page-enter app-page">
    <header class="withdrawal-address-header">
      <div>
        <p>Payout wallet</p>
        <h1>{{ currentAddress ? "Change Address" : "Set Address" }}</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="withdrawal-address-hero">
      <div>
        <span>Status</span>
        <strong>{{ currentAddress?.status || "Not set" }}</strong>
        <p>Submit the correct asset, network, and wallet address. Admin approval is required before payouts.</p>
      </div>
    </section>

    <section v-if="currentAddress" class="withdrawal-address-status" :class="currentAddress.status">
      <strong>{{ currentAddress.asset }} / {{ currentAddress.network }}</strong>
      <p>{{ currentAddress.address }}</p>
      <span>Submitted {{ formatDate(currentAddress.submittedAt) }}</span>
      <span v-if="currentAddress.reviewedAt">Reviewed {{ formatDate(currentAddress.reviewedAt) }}</span>
      <small v-if="currentAddress.note">{{ currentAddress.note }}</small>
    </section>

    <section v-if="currentAddress?.status !== 'pending'" class="withdrawal-address-card">
      <div class="withdrawal-address-selects">
        <label>
          <span>Asset</span>
          <select v-model="form.asset">
            <option v-for="asset in assets" :key="asset.value" :value="asset.value">{{ asset.label }}</option>
          </select>
        </label>
        <label>
          <span>Network</span>
          <select v-model="form.network">
            <option v-for="network in availableNetworks" :key="network" :value="network">{{ network }}</option>
          </select>
        </label>
      </div>

      <label class="withdrawal-address-field">
        <span>Wallet address</span>
        <input v-model.trim="form.address" type="text" placeholder="Enter wallet address" />
      </label>

      <div class="withdrawal-address-code-row">
        <label class="withdrawal-address-field">
          <span>Email code</span>
          <input v-model.trim="form.code" type="text" maxlength="6" inputmode="numeric" placeholder="Enter email code" />
        </label>
        <button type="button" :disabled="isRequestingCode" @click="requestCode">
          {{ isRequestingCode ? "Sending..." : codeRequested ? "Resend" : "Get Code" }}
        </button>
      </div>

      <p v-if="codeMessage" class="withdrawal-address-message info">{{ codeMessage }}</p>

      <button class="withdrawal-address-submit" type="button" :disabled="isSubmitting" @click="submitAddress">
        {{ isSubmitting ? "Submitting..." : "Submit for Approval" }}
      </button>
    </section>

    <section class="withdrawal-address-guide">
      <div>
        <span>Safety guide</span>
        <h2>Check before submitting</h2>
      </div>
      <article>
        <strong>Match network exactly</strong>
        <p>USDT supports TRC20 and BEP20. USDC and BNB support BEP20 here.</p>
      </article>
      <article>
        <strong>Validate address format</strong>
        <p>TRC20 starts with T. BEP20 starts with 0x and has 40 hexadecimal characters.</p>
      </article>
      <article>
        <strong>Wait for admin approval</strong>
        <p>Pending addresses cannot be used until admin reviews and approves them.</p>
      </article>
    </section>

    <p v-if="errorMessage" class="withdrawal-address-message error">{{ errorMessage }}</p>
    <p v-if="successMessage" class="withdrawal-address-message success">{{ successMessage }}</p>
    <p v-if="isLoading" class="withdrawal-address-message info">Loading address status...</p>
  </section>
</template>
