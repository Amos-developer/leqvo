<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getMyRewards } from "../utils/api";

const router = useRouter();
const isLoading = ref(true);
const errorMessage = ref("");
const summary = ref({
  total: 0,
  totalAmount: 0,
  luckyBoxAmount: 0,
  dailySpinAmount: 0,
  leadershipAmount: 0,
  referralDepositBonusAmount: 0,
  tradeCommissionAmount: 0
});
const rewards = ref([]);
const activeFilter = ref("all");

const filters = [
  { label: "All", value: "all" },
  { label: "Lucky Box", value: "lucky_box" },
  { label: "Daily Spin", value: "daily_spin" },
  { label: "Leadership", value: "leadership" },
  { label: "Referral Bonus", value: "referral_first_deposit_bonus" },
  { label: "Trade Commission", value: "trade_commission" }
];

const cards = computed(() => [
  { label: "Total Rewards", value: money(summary.value.totalAmount), tone: "pink" },
  { label: "Lucky Box", value: money(summary.value.luckyBoxAmount), tone: "violet" },
  { label: "Daily Spin", value: money(summary.value.dailySpinAmount), tone: "amber" },
  { label: "Leadership", value: money(summary.value.leadershipAmount), tone: "green" },
  { label: "Referral Bonus", value: money(summary.value.referralDepositBonusAmount), tone: "pink" },
  { label: "Trade Commission", value: money(summary.value.tradeCommissionAmount), tone: "violet" }
]);

const filteredRewards = computed(() => {
  if (activeFilter.value === "all") {
    return rewards.value;
  }

  return rewards.value.filter((reward) => reward.source === activeFilter.value);
});

const money = (value) => Number(value || 0).toLocaleString("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});

const formatDate = (value) => {
  if (!value) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};

const sourceLabel = (source) => {
  const labels = {
    lucky_box: "Lucky Box",
    daily_spin: "Daily Spin",
    leadership: "Leadership",
    referral_first_deposit_bonus: "Referral Bonus",
    trade_commission: "Trade Commission",
    first_deposit_bonus: "First Deposit Bonus"
  };

  return labels[source] || "Reward";
};

const loadRewards = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const result = await getMyRewards();
    summary.value = result.data.summary;
    rewards.value = result.data.rewards;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadRewards);
</script>

<template>
  <section class="rewards-page phone-shell page-enter">
    <header class="rewards-header">
      <div>
        <p>Reward center</p>
        <h1>Rewards</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="rewards-hero">
      <div>
        <span>Total credited</span>
        <strong>{{ money(summary.totalAmount) }}</strong>
        <p>Track every prize, spin reward, and leadership payout credited to your account.</p>
      </div>
      <div class="reward-orb" aria-hidden="true">
        <span></span>
        <span></span>
      </div>
    </section>

    <section class="reward-summary-grid">
      <article v-for="card in cards" :key="card.label" :class="`is-${card.tone}`">
        <span>{{ card.label }}</span>
        <strong>{{ card.value }}</strong>
      </article>
    </section>

    <section class="reward-history-card">
      <div class="reward-card-head">
        <div>
          <p>History</p>
          <h2>Reward Records</h2>
        </div>
        <button type="button" @click="loadRewards">Refresh</button>
      </div>

      <div class="reward-filter-row">
        <button
          v-for="filter in filters"
          :key="filter.value"
          type="button"
          :class="{ active: activeFilter === filter.value }"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>

      <p v-if="errorMessage" class="form-message error">{{ errorMessage }}</p>
      <article v-if="isLoading" class="reward-state">Loading rewards...</article>
      <article v-else-if="!filteredRewards.length" class="reward-state">No rewards found.</article>

      <div v-else class="reward-list">
        <article v-for="reward in filteredRewards" :key="reward.id" class="reward-row">
          <div class="reward-icon" :class="reward.source">
            <span></span>
          </div>
          <div>
            <strong>{{ reward.title }}</strong>
            <p>{{ sourceLabel(reward.source) }} · {{ formatDate(reward.awardedAt) }}</p>
          </div>
          <b>{{ money(reward.amount) }}</b>
        </article>
      </div>
    </section>
  </section>
</template>
