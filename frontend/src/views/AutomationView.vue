<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  createTradeAutomation,
  deleteTradeAutomation,
  getMyTradeAutomations,
  updateTradeAutomation
} from "../utils/api";

const router = useRouter();
const automations = ref([]);
const isLoading = ref(true);
const isSaving = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const user = ref(JSON.parse(localStorage.getItem("leqvoUser") || "{}"));

const form = ref({
  slotKey: "first",
  allocationPercent: 20
});

const slotOptions = [
  { value: "first", label: "First trade", note: "Open to funded trading accounts. Minimum execution amount is 30 USDT." },
  { value: "second", label: "Second trade", note: "Open to funded trading accounts. Minimum execution amount is 30 USDT." },
  { value: "third", label: "Third trade", note: "Requires a credited deposit of 100 USDT or above." },
  { value: "fourth", label: "Fourth trade", note: "Standard session for active funded members." },
  { value: "fifth_bonus", label: "Bonus trade", note: "Requires a 300 USDT deposit or a directly invited member with 300 USDT deposit." }
];

const selectedSlot = computed(() => {
  return slotOptions.find((slot) => slot.value === form.value.slotKey) || slotOptions[0];
});

const tradingBalance = computed(() => {
  return Number(user.value.tradingBalance || 0);
});

const estimatedExecutionAmount = computed(() => {
  return Number(((tradingBalance.value * Number(form.value.allocationPercent || 0)) / 100).toFixed(2));
});

const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
};

const formatDateTime = (value) => {
  if (!value) {
    return "Not used yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const loadAutomations = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await getMyTradeAutomations();
    automations.value = result.data || [];
  } catch (error) {
    errorMessage.value = error.message || "Could not load automations.";
  } finally {
    isLoading.value = false;
  }
};

const createAutomationRule = async () => {
  isSaving.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const result = await createTradeAutomation({
      slotKey: form.value.slotKey,
      allocationPercent: Number(form.value.allocationPercent)
    });

    automations.value = [result.data, ...automations.value];
    successMessage.value = "Automation created successfully.";
  } catch (error) {
    errorMessage.value = error.message || "Could not create automation.";
  } finally {
    isSaving.value = false;
  }
};

const toggleAutomation = async (automation) => {
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const result = await updateTradeAutomation(automation.id, {
      isEnabled: !automation.isEnabled
    });

    automations.value = automations.value.map((item) => {
      return item.id === automation.id ? result.data.automation : item;
    });

    if (result.data.user) {
      user.value = result.data.user;
      localStorage.setItem("leqvoUser", JSON.stringify(result.data.user));
    }

    successMessage.value = `Automation ${result.data.automation.isEnabled ? "enabled" : "paused"} successfully.`;
  } catch (error) {
    errorMessage.value = error.message || "Could not update automation.";
  }
};

const removeAutomation = async (automation) => {
  if (!window.confirm(`Delete automation for ${automation.slotKey.replace("_", " ")} session?`)) {
    return;
  }

  errorMessage.value = "";
  successMessage.value = "";

  try {
    await deleteTradeAutomation(automation.id);
    automations.value = automations.value.filter((item) => item.id !== automation.id);
    successMessage.value = "Automation deleted successfully.";
  } catch (error) {
    errorMessage.value = error.message || "Could not delete automation.";
  }
};

onMounted(loadAutomations);
</script>

<template>
  <section class="phone-shell page-enter app-page automation-page">
    <header class="market-header automation-header">
      <div>
        <p>Preferences</p>
        <h1>Automation</h1>
      </div>
      <button class="market-back-button" type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="automation-hero">
      <div>
        <span>Auto execution</span>
        <strong>Automate your preferred session when you cannot stay online.</strong>
        <p>Choose the trading session you may miss. When the admin shares the live signal for that session, Leqvo will enter it automatically and settle capital plus profit after the 40-minute cycle ends.</p>
      </div>
      <div class="automation-hero-badges">
        <span>{{ formatCurrency(tradingBalance) }} trading balance</span>
        <span>{{ estimatedExecutionAmount >= 30 ? "Ready for execution" : "Below 30 USDT minimum" }}</span>
      </div>
    </section>

    <section class="automation-form-card">
      <div class="automation-section-head">
        <div>
          <span>Create rule</span>
          <h2>Automation Setup</h2>
        </div>
      </div>

      <div class="automation-form-grid">
        <label>
          Session
          <select v-model="form.slotKey">
            <option v-for="option in slotOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>

      <div class="automation-allocation-row">
        <button
          v-for="percent in [20, 40, 50, 60, 100]"
          :key="percent"
          type="button"
          :class="{ active: Number(form.allocationPercent) === percent }"
          @click="form.allocationPercent = percent"
        >
          {{ percent }}%
        </button>
      </div>

      <div class="automation-summary-card">
        <div>
          <span>Estimated execution</span>
          <strong>{{ formatCurrency(estimatedExecutionAmount) }}</strong>
        </div>
        <p>{{ selectedSlot.note }}</p>
      </div>

      <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>
      <p v-else-if="successMessage" class="form-message success">{{ successMessage }}</p>

      <button class="automation-submit" type="button" :disabled="isSaving" @click="createAutomationRule">
        {{ isSaving ? "Saving..." : "Save automation" }}
      </button>
    </section>

    <section class="automation-info-grid">
      <article>
        <strong>How it works</strong>
        <p>Automation watches your selected session and enters only once for the active signal code shared by admin during that time window.</p>
      </article>
      <article>
        <strong>Execution rules</strong>
        <p>Automated trades still follow the same eligibility checks, funded trading balance rules, and session timing windows as manual trades.</p>
      </article>
      <article>
        <strong>Settlement</strong>
        <p>Once the automated trade is opened, it closes automatically 40 minutes later and credits the invested capital plus profit back to the trading account.</p>
      </article>
    </section>

    <section class="automation-list-card">
      <div class="automation-section-head">
        <div>
          <span>Saved rules</span>
          <h2>Active Automations</h2>
        </div>
      </div>

      <div v-if="isLoading" class="automation-empty-state">
        <strong>Loading automations...</strong>
        <p>Your saved automation rules are being prepared.</p>
      </div>

      <div v-else-if="!automations.length" class="automation-empty-state">
        <strong>No automation rules yet</strong>
        <p>Create your first automation to let Leqvo execute a session for you when you cannot be active.</p>
      </div>

      <div v-else class="automation-list">
        <article v-for="automation in automations" :key="automation.id" class="automation-card">
          <div class="automation-card-top">
            <div>
              <span>Admin live session</span>
              <strong>{{ slotOptions.find((slot) => slot.value === automation.slotKey)?.label || automation.slotKey }}</strong>
            </div>
            <b :class="automation.isEnabled ? 'enabled' : 'paused'">
              {{ automation.isEnabled ? "Enabled" : "Paused" }}
            </b>
          </div>

          <div class="automation-card-grid">
            <div>
              <span>Allocation</span>
              <strong>{{ Number(automation.allocationPercent).toFixed(0) }}%</strong>
            </div>
            <div>
              <span>Last result</span>
              <strong>{{ automation.lastResult || "idle" }}</strong>
            </div>
            <div>
              <span>Last signal</span>
              <strong>{{ automation.lastSignalCode || "None" }}</strong>
            </div>
            <div>
              <span>Last run</span>
              <strong>{{ formatDateTime(automation.lastRunAt) }}</strong>
            </div>
          </div>

          <p class="automation-card-message">{{ automation.lastMessage || "Waiting for the next matching signal session." }}</p>

          <div class="automation-card-actions">
            <button type="button" @click="toggleAutomation(automation)">
              {{ automation.isEnabled ? "Pause" : "Enable" }}
            </button>
            <button type="button" class="danger" @click="removeAutomation(automation)">
              Delete
            </button>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
