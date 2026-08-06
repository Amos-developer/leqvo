<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { showUserPopup } from "../composables/useUserPopup";
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
const codeRequested = ref(false);

const availableNetworks = computed(() => assets.find((asset) => asset.value === form.value.asset)?.networks || []);
const activeAddress = computed(() => currentAddress.value?.activeAddress || null);
const pendingAddress = computed(() => currentAddress.value?.pendingAddress || null);
const isAddressLocked = computed(() => Boolean(activeAddress.value?.locked));
const hasPendingReview = computed(() => pendingAddress.value?.status === "pending");
const pageTitle = computed(() => (activeAddress.value ? "Change Address" : "Set Address"));
const heroStatus = computed(() => {
  if (hasPendingReview.value) {
    return "Pending review";
  }

  if (activeAddress.value) {
    return "Approved";
  }

  return "Not set";
});

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

  try {
    const result = await getMyWithdrawalAddress();
    currentAddress.value = result.data;

    if (activeAddress.value) {
      form.value.asset = activeAddress.value.asset || form.value.asset;
      form.value.network = activeAddress.value.network || form.value.network;
      form.value.address = activeAddress.value.address || "";
    }
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Address unavailable",
      message: error.message || "Could not load withdrawal address."
    });
  } finally {
    isLoading.value = false;
  }
};

const submitAddress = async () => {
  const validationError = validateAddress();

  if (validationError) {
    showUserPopup({
      tone: "error",
      title: "Check address details",
      message: validationError
    });
    return;
  }

  if (!codeRequested.value) {
    showUserPopup({
      tone: "error",
      title: "Code required",
      message: "Request an email code first."
    });
    return;
  }

  if (!/^\d{6}$/.test(form.value.code.trim())) {
    showUserPopup({
      tone: "error",
      title: "Invalid code",
      message: "Email code must be exactly 6 numbers."
    });
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
    form.value.address = activeAddress.value?.address || "";
    form.value.code = "";
    codeRequested.value = false;
    showUserPopup({
      tone: "success",
      title: "Address submitted",
      message: "Withdrawal address submitted for admin approval."
    });
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Submission failed",
      message: error.message || "Could not submit withdrawal address."
    });
  } finally {
    isSubmitting.value = false;
  }
};

const requestCode = async () => {
  isRequestingCode.value = true;

  try {
    const result = await requestWithdrawalAddressCode();
    codeRequested.value = true;
    showUserPopup({
      tone: "success",
      title: "Code sent",
      message: result.data?.code ? `Testing code: ${result.data.code}` : "Email code requested."
    });
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Code request failed",
      message: error.message || "Could not request email code."
    });
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
        <h1>{{ pageTitle }}</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="withdrawal-address-hero">
      <div>
        <span>Status</span>
        <strong>{{ heroStatus }}</strong>
        <p>Submit the correct asset, network, and wallet address. Admin approval is required before payouts.</p>
      </div>
    </section>

    <section v-if="activeAddress && isAddressLocked" class="withdrawal-address-status locked">
      <span class="withdrawal-address-lock-icon" aria-hidden="true"></span>
      <strong>Address changes are locked</strong>
      <p>Your approved withdrawal address is protected. Send a message to admin/support to request an address-change unlock.</p>
      <small>Once admin unlocks it, you can submit a new wallet for approval.</small>
      <button type="button" class="withdrawal-address-support-button" @click="router.push('/support')">Message Admin</button>
    </section>

    <section v-if="activeAddress" class="withdrawal-address-status approved">
      <strong>{{ activeAddress.asset }} / {{ activeAddress.network }}</strong>
      <p>{{ activeAddress.address }}</p>
      <span>Approved {{ formatDate(activeAddress.reviewedAt || activeAddress.submittedAt) }}</span>
      <small v-if="activeAddress.note">{{ activeAddress.note }}</small>
    </section>

    <section v-if="pendingAddress" class="withdrawal-address-status" :class="pendingAddress.status">
      <strong>{{ pendingAddress.asset }} / {{ pendingAddress.network }}</strong>
      <p>{{ pendingAddress.address }}</p>
      <span>Submitted {{ formatDate(pendingAddress.submittedAt) }}</span>
      <span v-if="pendingAddress.reviewedAt">Reviewed {{ formatDate(pendingAddress.reviewedAt) }}</span>
      <small v-if="pendingAddress.note">{{ pendingAddress.note }}</small>
    </section>

    <section v-if="!hasPendingReview && !isAddressLocked" class="withdrawal-address-card">
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
    <p v-if="isLoading" class="withdrawal-address-message info">Loading address status...</p>
  </section>
</template>
