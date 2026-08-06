<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { showUserPopup } from "../composables/useUserPopup";
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
const user = ref(JSON.parse(localStorage.getItem("leqvoUser") || "{}"));

const form = ref({
  slotKey: "first",
  allocationPercent: 20
});

const slotOptions = [
  { value: "first", label: "First trade", note: "Open to funded trading accounts. Minimum execution amount is 30 USDT." },
  { value: "second", label: "Second trade", note: "Open to funded trading accounts. Minimum execution amount is 30 USDT." },
  { value: "third", label: "Third trade", note: "Requires a credited deposit of 100 USDT or an eligible direct referral deposit of 100 USDT or above." },
  { value: "fourth", label: "Fourth trade", note: "Requires a credited deposit of 500 USDT or an eligible direct referral deposit of 500 USDT or above." }
];

const selectedSlot = computed(() => {
  return slotOptions.find((slot) => slot.value === form.value.slotKey) || slotOptions[0];
});

const completedAutomations = computed(() => {
  return automations.value.filter((automation) => ["win", "loose"].includes(automation.latestTradeStatus));
});

const pendingAutomations = computed(() => {
  return automations.value.filter((automation) => !["win", "loose"].includes(automation.latestTradeStatus));
});

const tradingBalance = computed(() => {
  return Number(user.value.tradingBalance || 0);
});

const estimatedExecutionAmount = computed(() => {
  return Number(((tradingBalance.value * Number(form.value.allocationPercent || 0)) / 100).toFixed(2));
});

const selectedSlotMinimumDeposit = computed(() => {
  if (form.value.slotKey === "third") {
    return 100;
  }

  if (form.value.slotKey === "fourth") {
    return 500;
  }

  return 0;
});

const projectedExecutionReady = computed(() => estimatedExecutionAmount.value >= 30 && estimatedExecutionAmount.value <= tradingBalance.value);

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

const formatResultLabel = (value) => {
  if (value === "executed") return "Completed";
  if (value === "failed") return "Failed";
  if (value === "skipped") return "Skipped";
  if (value === "idle") return "Waiting";
  if (value === "active") return "Ongoing";
  if (value === "win") return "Completed";
  if (value === "loose") return "Finished";

  return value || "Waiting";
};

const sessionEligibilityMessage = computed(() => {
  if (!projectedExecutionReady.value) {
    return `Your selected allocation must produce at least 30 USDT. Current estimate: ${formatCurrency(estimatedExecutionAmount.value)}.`;
  }

  if (selectedSlotMinimumDeposit.value >= 100) {
    return `This session requires a credited deposit of ${selectedSlotMinimumDeposit.value} USDT or an eligible direct referral deposit of ${selectedSlotMinimumDeposit.value} USDT or above. Final eligibility is checked automatically when you save.`;
  }

  if (selectedSlotMinimumDeposit.value > 0) {
    return `This session requires a credited deposit of ${selectedSlotMinimumDeposit.value} USDT or above. Final eligibility is checked automatically when you save.`;
  }

  return selectedSlot.note;
});

const loadAutomations = async () => {
  isLoading.value = true;

  try {
    const result = await getMyTradeAutomations();
    automations.value = result.data || [];
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Automation unavailable",
      message: error.message || "Could not load automations."
    });
  } finally {
    isLoading.value = false;
  }
};

const createAutomationRule = async () => {
  isSaving.value = true;

  try {
    const result = await createTradeAutomation({
      slotKey: form.value.slotKey,
      allocationPercent: Number(form.value.allocationPercent)
    });

    const createdItems = Array.isArray(result.data) ? result.data : [result.data];
    automations.value = [...createdItems.filter(Boolean), ...automations.value];
    showUserPopup({
      tone: "success",
      title: "Automation saved",
      message: "Automation created successfully."
    });
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Save failed",
      message: error.message || "Could not create automation."
    });
  } finally {
    isSaving.value = false;
  }
};

const createAllAutomationRules = async () => {
  isSaving.value = true;

  try {
    const result = await createTradeAutomation({
      slotKey: "all",
      allocationPercent: Number(form.value.allocationPercent)
    });

    const createdItems = Array.isArray(result.data) ? result.data : [];
    const existingIds = new Set(automations.value.map((item) => item.id));
    automations.value = [
      ...createdItems.filter((item) => !existingIds.has(item.id)),
      ...automations.value
    ];

    showUserPopup({
      tone: "success",
      title: "All upcoming trades automated",
      message: result.message || "Automation rules were created for all upcoming trade sessions."
    });
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Bulk save failed",
      message: error.message || "Could not automate all upcoming trade sessions."
    });
  } finally {
    isSaving.value = false;
  }
};

const toggleAutomation = async (automation) => {
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

    showUserPopup({
      tone: "success",
      title: "Automation updated",
      message: `Automation ${result.data.automation.isEnabled ? "enabled" : "paused"} successfully.`
    });
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Update failed",
      message: error.message || "Could not update automation."
    });
  }
};

const removeAutomation = async (automation) => {
  showUserPopup({
    tone: "error",
    title: "Delete automation",
    message: `Delete automation for ${automation.slotKey.replace("_", " ")} session?`,
    buttonLabel: "Delete",
    secondaryLabel: "Cancel",
    onConfirm: async () => {
      try {
        await deleteTradeAutomation(automation.id);
        automations.value = automations.value.filter((item) => item.id !== automation.id);
        showUserPopup({
          tone: "success",
          title: "Automation deleted",
          message: "Automation deleted successfully."
        });
      } catch (error) {
        showUserPopup({
          tone: "error",
          title: "Delete failed",
          message: error.message || "Could not delete automation."
        });
      }
    }
  });
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
        <p>{{ sessionEligibilityMessage }}</p>
      </div>
      <button
        class="automation-submit"
        type="button"
        :disabled="isSaving || !projectedExecutionReady"
        @click="createAutomationRule"
      >
        {{ isSaving ? "Saving..." : "Save automation" }}
      </button>
      <button
        class="automation-submit automation-submit-secondary"
        type="button"
        :disabled="isSaving || !projectedExecutionReady"
        @click="createAllAutomationRules"
      >
        {{ isSaving ? "Saving..." : "Automate all upcoming trades" }}
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
          <h2>Automation Center</h2>
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

      <div v-else class="automation-record-groups">
        <section class="automation-record-group">
          <div class="automation-subhead">
            <div>
              <span>Live rules</span>
              <h3>Active and pending</h3>
            </div>
            <b>{{ pendingAutomations.length }}</b>
          </div>

          <div v-if="!pendingAutomations.length" class="automation-empty-state compact">
            <strong>No pending automation rules</strong>
            <p>Your next saved session will appear here.</p>
          </div>

          <div v-else class="automation-list">
            <article v-for="automation in pendingAutomations" :key="automation.id" class="automation-card">
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
                  <span>Status</span>
                  <strong>{{ formatResultLabel(automation.latestTradeStatus || automation.lastResult) }}</strong>
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

        <section class="automation-record-group">
          <div class="automation-subhead">
            <div>
              <span>Trade history</span>
              <h3>Completed automated trades</h3>
            </div>
            <b>{{ completedAutomations.length }}</b>
          </div>

          <div v-if="!completedAutomations.length" class="automation-empty-state compact">
            <strong>No completed automated trades yet</strong>
            <p>Completed automated sessions will be stored here in a shorter history list.</p>
          </div>

          <div v-else class="automation-history-list">
            <article v-for="automation in completedAutomations" :key="automation.id" class="automation-card completed">
              <div class="automation-card-top">
                <div>
                  <span>Completed session</span>
                  <strong>{{ slotOptions.find((slot) => slot.value === automation.slotKey)?.label || automation.slotKey }}</strong>
                </div>
                <b class="completed">Completed</b>
              </div>

              <div class="automation-card-grid compact">
                <div>
                  <span>Allocation</span>
                  <strong>{{ Number(automation.allocationPercent).toFixed(0) }}%</strong>
                </div>
                <div>
                  <span>Signal</span>
                  <strong>{{ automation.latestTradeSignalCode || automation.lastSignalCode || "None" }}</strong>
                </div>
                <div>
                  <span>Completed at</span>
                  <strong>{{ formatDateTime(automation.latestTradeClosedAt || automation.lastRunAt) }}</strong>
                </div>
                <div>
                  <span>Result</span>
                  <strong>{{ formatResultLabel(automation.latestTradeStatus || automation.lastResult) }}</strong>
                </div>
              </div>

              <p class="automation-card-message">{{ automation.latestTradeClosedAt ? `Automated trade closed ${formatDateTime(automation.latestTradeClosedAt)}.` : (automation.lastMessage || "Automated trade completed successfully.") }}</p>
            </article>
          </div>
        </section>
      </div>
    </section>
  </section>
</template>
