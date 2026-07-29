<script setup>
import { computed, ref } from "vue";
import { useRoute } from "vue-router";
import { getStoredTrades } from "../utils/tradeHistory";

const route = useRoute();
const activeTab = ref(String(route.query.tab || "all"));
const trades = ref(getStoredTrades());

const tabs = [
  { label: "All", value: "all" },
  { label: "Active", value: "active" },
  { label: "Win", value: "win" },
  { label: "Loose", value: "loose" }
];

const filteredTrades = computed(() => {
  if (activeTab.value === "all") {
    return trades.value;
  }

  return trades.value.filter((trade) => trade.status === activeTab.value);
});

const tradeCounts = computed(() => ({
  all: trades.value.length,
  active: trades.value.filter((trade) => trade.status === "active").length,
  win: trades.value.filter((trade) => trade.status === "win").length,
  loose: trades.value.filter((trade) => trade.status === "loose").length
}));

const totalActiveAmount = computed(() => {
  return trades.value
    .filter((trade) => trade.status === "active")
    .reduce((total, trade) => total + Number(trade.amount || 0), 0);
});

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

const statusLabel = (status) => {
  const labels = {
    active: "Active",
    win: "Win",
    loose: "Loose"
  };

  return labels[status] || "Active";
};
</script>

<template>
  <section class="phone-shell page-enter app-page history-page">
    <header class="history-header">
      <div>
        <p>Trade records</p>
        <h1>History</h1>
      </div>
      <RouterLink to="/trade" class="history-action">Trade</RouterLink>
    </header>

    <section class="history-summary">
      <div>
        <span>Active capital</span>
        <strong>{{ formatCurrency(totalActiveAmount) }}</strong>
      </div>
      <div class="summary-signal">
        <span>Open trades</span>
        <strong>{{ tradeCounts.active }}</strong>
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
      <article v-if="!filteredTrades.length" class="history-empty">
        <span class="empty-icon"></span>
        <strong>No {{ activeTab === "all" ? "" : activeTab }} trades yet</strong>
        <p>Your completed signal trades will appear here.</p>
      </article>

      <article v-for="trade in filteredTrades" v-else :key="trade.id" class="trade-history-card">
        <div class="trade-history-top">
          <div>
            <span class="history-pair">{{ trade.pair }}</span>
            <strong>{{ formatCurrency(trade.amount) }}</strong>
          </div>
          <span class="history-status" :class="trade.status">{{ statusLabel(trade.status) }}</span>
        </div>

        <div class="history-meta-grid">
          <div>
            <span>Signal</span>
            <strong>{{ trade.signalCode }}</strong>
          </div>
          <div>
            <span>Allocation</span>
            <strong>{{ trade.allocationPercent }}%</strong>
          </div>
          <div>
            <span>Entry</span>
            <strong>{{ formatCurrency(trade.entryPrice) }}</strong>
          </div>
          <div>
            <span>Opened</span>
            <strong>{{ formatDate(trade.createdAt) }}</strong>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
