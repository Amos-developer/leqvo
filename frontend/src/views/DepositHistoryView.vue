<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getMyDeposits, refreshDepositStatus } from "../utils/api";

const router = useRouter();
const deposits = ref([]);
const activeFilter = ref("all");
const isLoading = ref(false);
const refreshingId = ref("");
const errorMessage = ref("");

const filters = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" }
];

const completedStatuses = ["finished", "confirmed", "credited"];
const pendingStatuses = ["waiting", "confirming", "pending"];

const filteredDeposits = computed(() => {
  if (activeFilter.value === "all") {
    return deposits.value;
  }

  return deposits.value.filter((deposit) => {
    const status = String(deposit.status || "").toLowerCase();

    if (activeFilter.value === "completed") {
      return completedStatuses.includes(status) || Boolean(deposit.creditedAt);
    }

    return pendingStatuses.includes(status) && !deposit.creditedAt;
  });
});

const summary = computed(() => {
  const completed = deposits.value.filter((deposit) => {
    return completedStatuses.includes(String(deposit.status || "").toLowerCase()) || Boolean(deposit.creditedAt);
  });
  const pending = deposits.value.filter((deposit) => {
    return pendingStatuses.includes(String(deposit.status || "").toLowerCase()) && !deposit.creditedAt;
  });

  return {
    total: deposits.value.length,
    pending: pending.length,
    completed: completed.length,
    creditedAmount: completed.reduce((total, deposit) => total + Number(deposit.priceAmount || 0), 0)
  };
});

const money = (value) => {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
};

const formatDate = (date) => {
  if (!date) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
};

const statusClass = (deposit) => {
  const status = String(deposit.status || "").toLowerCase();

  if (completedStatuses.includes(status) || deposit.creditedAt) {
    return "completed";
  }

  if (status === "failed" || status === "expired") {
    return "failed";
  }

  return "pending";
};

const loadDeposits = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await getMyDeposits();
    deposits.value = result.data || [];
  } catch (error) {
    errorMessage.value = error.message || "Could not load deposit history.";
  } finally {
    isLoading.value = false;
  }
};

const refreshDeposit = async (deposit) => {
  refreshingId.value = deposit.paymentId;
  errorMessage.value = "";

  try {
    await refreshDepositStatus(deposit.paymentId);
    await loadDeposits();
  } catch (error) {
    errorMessage.value = error.message || "Could not refresh deposit status.";
  } finally {
    refreshingId.value = "";
  }
};

onMounted(loadDeposits);
</script>

<template>
  <section class="deposit-history-page phone-shell page-enter app-page">
    <header class="deposit-history-header">
      <div>
        <p>Funding records</p>
        <h1>Deposit History</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="deposit-history-hero">
      <div>
        <span>Total credited</span>
        <strong>{{ money(summary.creditedAmount) }}</strong>
        <p>{{ summary.completed }} completed deposits from {{ summary.total }} total records.</p>
      </div>
      <div class="deposit-history-orb">
        <span>{{ summary.pending }}</span>
        <small>Pending</small>
      </div>
    </section>

    <section class="deposit-history-filters">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        :class="{ active: activeFilter === filter.value }"
        @click="activeFilter = filter.value"
      >
        {{ filter.label }}
      </button>
    </section>

    <p v-if="errorMessage" class="deposit-history-message error">{{ errorMessage }}</p>
    <p v-if="isLoading" class="deposit-history-message info">Loading deposit history...</p>

    <section class="deposit-history-list">
      <article v-if="!isLoading && !filteredDeposits.length" class="deposit-history-empty">
        <strong>No deposits found</strong>
        <p>Your {{ activeFilter }} deposit records will appear here.</p>
      </article>

      <article v-for="deposit in filteredDeposits" :key="deposit.id" class="deposit-history-card">
        <div class="deposit-history-card-head">
          <div>
            <span>{{ deposit.payCurrency }}</span>
            <strong>{{ money(deposit.priceAmount) }}</strong>
          </div>
          <b :class="statusClass(deposit)">{{ deposit.creditedAt ? "completed" : deposit.status }}</b>
        </div>

        <div class="deposit-history-grid">
          <div>
            <span>Network</span>
            <strong>{{ deposit.payNetwork }}</strong>
          </div>
          <div>
            <span>Pay amount</span>
            <strong>{{ Number(deposit.payAmount || 0).toFixed(6) }}</strong>
          </div>
          <div>
            <span>Actually paid</span>
            <strong>{{ Number(deposit.actuallyPaid || 0).toFixed(6) }}</strong>
          </div>
          <div>
            <span>Created</span>
            <strong>{{ formatDate(deposit.createdAt) }}</strong>
          </div>
        </div>

        <div class="deposit-history-footer">
          <span>ID: {{ deposit.paymentId }}</span>
          <button
            v-if="statusClass(deposit) === 'pending'"
            type="button"
            :disabled="refreshingId === deposit.paymentId"
            @click="refreshDeposit(deposit)"
          >
            {{ refreshingId === deposit.paymentId ? "Checking..." : "Refresh" }}
          </button>
        </div>
      </article>
    </section>
  </section>
</template>
