<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getMyWithdrawals } from "../utils/api";

const router = useRouter();
const withdrawals = ref([]);
const activeFilter = ref("all");
const isLoading = ref(false);
const errorMessage = ref("");

const filters = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Completed", value: "completed" }
];

const completedStatuses = ["approved", "completed", "paid", "finished"];
const pendingStatuses = ["pending", "reviewing", "processing"];

const filteredWithdrawals = computed(() => {
  if (activeFilter.value === "all") {
    return withdrawals.value;
  }

  return withdrawals.value.filter((withdrawal) => {
    const status = String(withdrawal.status || "").toLowerCase();

    if (activeFilter.value === "completed") {
      return completedStatuses.includes(status) || Boolean(withdrawal.processedAt);
    }

    return pendingStatuses.includes(status) && !withdrawal.processedAt;
  });
});

const summary = computed(() => {
  const completed = withdrawals.value.filter((withdrawal) => {
    return completedStatuses.includes(String(withdrawal.status || "").toLowerCase()) || Boolean(withdrawal.processedAt);
  });
  const pending = withdrawals.value.filter((withdrawal) => {
    return pendingStatuses.includes(String(withdrawal.status || "").toLowerCase()) && !withdrawal.processedAt;
  });

  return {
    total: withdrawals.value.length,
    pending: pending.length,
    completed: completed.length,
    completedAmount: completed.reduce((total, withdrawal) => total + Number(withdrawal.amount || 0), 0)
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

const maskAddress = (address) => {
  if (!address) {
    return "No address";
  }

  return address.length > 16 ? `${address.slice(0, 8)}...${address.slice(-6)}` : address;
};

const statusClass = (withdrawal) => {
  const status = String(withdrawal.status || "").toLowerCase();

  if (completedStatuses.includes(status) || withdrawal.processedAt) {
    return "completed";
  }

  if (status === "rejected" || status === "failed") {
    return "failed";
  }

  return "pending";
};

const loadWithdrawals = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await getMyWithdrawals();
    withdrawals.value = result.data || [];
  } catch (error) {
    errorMessage.value = error.message || "Could not load withdrawal history.";
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadWithdrawals);
</script>

<template>
  <section class="withdrawal-history-page phone-shell page-enter app-page">
    <header class="withdrawal-history-header">
      <div>
        <p>Payout records</p>
        <h1>Withdrawal History</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="withdrawal-history-hero">
      <div>
        <span>Total completed</span>
        <strong>{{ money(summary.completedAmount) }}</strong>
        <p>{{ summary.completed }} completed withdrawals from {{ summary.total }} total records.</p>
      </div>
      <div class="withdrawal-history-orb">
        <span>{{ summary.pending }}</span>
        <small>Pending</small>
      </div>
    </section>

    <section class="withdrawal-history-filters">
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

    <p v-if="errorMessage" class="withdrawal-history-message error">{{ errorMessage }}</p>
    <p v-if="isLoading" class="withdrawal-history-message info">Loading withdrawal history...</p>

    <section class="withdrawal-history-list">
      <article v-if="!isLoading && !filteredWithdrawals.length" class="withdrawal-history-empty">
        <strong>No withdrawals found</strong>
        <p>Your {{ activeFilter }} withdrawal records will appear here.</p>
      </article>

      <article v-for="withdrawal in filteredWithdrawals" :key="withdrawal.id" class="withdrawal-history-card">
        <div class="withdrawal-history-card-head">
          <div>
            <span>{{ withdrawal.asset }} / {{ withdrawal.network }}</span>
            <strong>{{ money(withdrawal.amount) }}</strong>
          </div>
          <b :class="statusClass(withdrawal)">{{ withdrawal.processedAt ? "completed" : withdrawal.status }}</b>
        </div>

        <div class="withdrawal-history-grid">
          <div>
            <span>Fee</span>
            <strong>{{ money(withdrawal.feeAmount) }}</strong>
          </div>
          <div>
            <span>Receive</span>
            <strong>{{ money(Number(withdrawal.amount || 0) - Number(withdrawal.feeAmount || 0)) }}</strong>
          </div>
          <div>
            <span>Requested</span>
            <strong>{{ formatDate(withdrawal.requestedAt) }}</strong>
          </div>
          <div>
            <span>Processed</span>
            <strong>{{ formatDate(withdrawal.processedAt) }}</strong>
          </div>
        </div>

        <div class="withdrawal-history-footer">
          <span>{{ maskAddress(withdrawal.address) }}</span>
          <small>#{{ withdrawal.id }}</small>
        </div>
      </article>
    </section>
  </section>
</template>
