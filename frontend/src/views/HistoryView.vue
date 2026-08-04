<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getMyTrades } from "../utils/api";

const route = useRoute();
const router = useRouter();
const activeTab = ref(String(route.query.tab || "all"));
const trades = ref([]);
const isLoading = ref(true);
const errorMessage = ref("");
const now = ref(Date.now());
let countdownTimer = null;

const tabs = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Win", value: "win" },
  { label: "Loose/Failed", value: "loose" }
];

const signalSlotLabel = (dateValue) => {
  const date = new Date(dateValue);
  const hour = date.getUTCHours();

  if (hour === 10) return "First";
  if (hour === 11) return "Second";
  if (hour === 13) return "Third";
  if (hour === 14) return "Fourth";
  if (hour === 15) return "Fifth";

  return "Signal";
};

const formatCurrency = (value) => {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
};

const formatDate = (value) => {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const getDisplayStatus = (trade) => {
  if (trade.status === "win") return "completed";
  if (trade.status === "loose") return "finished";

  const settlesAt = new Date(trade.settlesAt).getTime();
  if (Number.isFinite(settlesAt) && settlesAt > now.value) {
    return "ongoing";
  }

  return "completed";
};

const getCountdown = (trade) => {
  const settlesAt = new Date(trade.settlesAt).getTime();
  const remainingMs = settlesAt - now.value;

  if (!Number.isFinite(settlesAt) || remainingMs <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const normalizedTrades = computed(() => {
  return trades.value.map((trade) => {
    const invested = Number(trade.amount || 0);
    const profitAmount =
      trade.status === "win"
        ? Number(trade.pnlAmount || 0)
        : Number(((invested * Number(trade.targetProfitPercent || 0)) / 100).toFixed(2));
    const amountGained = trade.status === "win" ? invested + Number(trade.pnlAmount || 0) : invested + profitAmount;

    return {
      ...trade,
      signalSlot: signalSlotLabel(trade.createdAt || trade.openedAt),
      invested,
      profitAmount,
      amountGained,
      displayStatus: getDisplayStatus(trade),
      countdown: getCountdown(trade)
    };
  });
});

const filteredTrades = computed(() => {
  if (activeTab.value === "all") {
    return normalizedTrades.value;
  }

  if (activeTab.value === "completed") {
    return normalizedTrades.value.filter((trade) => trade.status === "win" || trade.status === "loose");
  }

  return normalizedTrades.value.filter((trade) => trade.status === activeTab.value);
});

const tradeCounts = computed(() => ({
  all: normalizedTrades.value.length,
  completed: normalizedTrades.value.filter((trade) => trade.status === "win" || trade.status === "loose").length,
  win: normalizedTrades.value.filter((trade) => trade.status === "win").length,
  loose: normalizedTrades.value.filter((trade) => trade.status === "loose").length
}));

const ongoingCount = computed(() => {
  return normalizedTrades.value.filter((trade) => trade.displayStatus === "ongoing").length;
});

const totalInvested = computed(() => {
  return normalizedTrades.value.reduce((total, trade) => total + Number(trade.invested || 0), 0);
});

const loadTrades = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await getMyTrades();
    trades.value = result.data || [];
  } catch (error) {
    errorMessage.value = error.message || "Could not load trade history.";
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => activeTab.value,
  (value) => {
    router.replace({ name: "history", query: value === "all" ? {} : { tab: value } });
  }
);

onMounted(() => {
  loadTrades();
  countdownTimer = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onBeforeUnmount(() => {
  window.clearInterval(countdownTimer);
});
</script>

<template>
  <section class="phone-shell page-enter app-page history-page">
    <header class="history-header">
      <div>
        <p>Trade records</p>
        <h1>History</h1>
      </div>
      <button class="history-action" type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="history-summary">
      <div>
        <span>Total invested</span>
        <strong>{{ formatCurrency(totalInvested) }}</strong>
      </div>
      <div class="summary-signal">
        <span>Ongoing</span>
        <strong>{{ ongoingCount }}</strong>
      </div>
    </section>

    <nav class="history-tabs" aria-label="Trade history filters">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        :class="{ active: activeTab === tab.value }"
        @click="activeTab = tab.value"
      >
        {{ tab.label }}
        <span>{{ tradeCounts[tab.value] }}</span>
      </button>
    </nav>

    <section class="history-list">
      <article v-if="isLoading" class="history-empty">
        <span class="empty-icon"></span>
        <strong>Loading trade history...</strong>
        <p>Your trade records are being prepared.</p>
      </article>

      <article v-else-if="errorMessage" class="history-empty">
        <span class="empty-icon"></span>
        <strong>Could not load history</strong>
        <p>{{ errorMessage }}</p>
      </article>

      <article v-else-if="!filteredTrades.length" class="history-empty">
        <span class="empty-icon"></span>
        <strong>No {{ activeTab === "all" ? "" : activeTab }} trades yet</strong>
        <p>Your trade records will appear here after you complete a signal session.</p>
      </article>

      <article v-for="trade in filteredTrades" v-else :key="trade.id" class="trade-history-card">
        <div class="trade-history-top">
          <div>
            <span class="history-pair">{{ trade.pair }}</span>
            <strong>{{ trade.signalSlot }} Signal</strong>
          </div>
          <div class="history-status-wrap">
            <span class="history-status" :class="trade.displayStatus">{{ trade.displayStatus }}</span>
            <small v-if="trade.displayStatus === 'ongoing'">{{ trade.countdown }}</small>
          </div>
        </div>

        <div class="history-meta-grid">
          <div>
            <span>Code</span>
            <strong>{{ trade.signalCode }}</strong>
          </div>
          <div>
            <span>Entry</span>
            <strong>{{ formatCurrency(trade.entryPrice) }}</strong>
          </div>
          <div>
            <span>Amount invested</span>
            <strong>{{ formatCurrency(trade.invested) }}</strong>
          </div>
          <div>
            <span>Profit gained</span>
            <strong>{{ formatCurrency(trade.profitAmount) }}</strong>
          </div>
          <div>
            <span>Amount gained</span>
            <strong>{{ formatCurrency(trade.amountGained) }}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong class="history-status-text">{{ trade.displayStatus }}</strong>
          </div>
        </div>

        <div class="history-card-footer">
          <span>Opened {{ formatDate(trade.openedAt || trade.createdAt) }}</span>
          <span v-if="trade.closedAt">Closed {{ formatDate(trade.closedAt) }}</span>
        </div>
      </article>
    </section>
  </section>
</template>
