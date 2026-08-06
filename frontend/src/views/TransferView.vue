<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { showUserPopup } from "../composables/useUserPopup";
import { getAccountTransfers, getUserById, transferAccountBalance } from "../utils/api";

const router = useRouter();
const storedUser = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const user = ref(storedUser);
const direction = ref("main-to-trading");
const amount = ref("");
const isLoading = ref(false);
const isSubmitting = ref(false);
const transfers = ref([]);
const eligibility = ref({
  hasTradingEntry: false,
  canMoveTradingToMain: false,
  canWithdraw: false,
  remainingDays: 10
});

const mainBalance = computed(() => Number(user.value.balance || 0));
const tradingBalance = computed(() => Number(user.value.tradingBalance || 0));
const fromAccount = computed(() => (direction.value === "main-to-trading" ? "main" : "trading"));
const toAccount = computed(() => (direction.value === "main-to-trading" ? "trading" : "main"));
const availableBalance = computed(() => (fromAccount.value === "main" ? mainBalance.value : tradingBalance.value));
const isEarlyTradingExit = computed(() => {
  return (
    direction.value === "trading-to-main" &&
    eligibility.value.hasTradingEntry &&
    !eligibility.value.canMoveTradingToMain
  );
});
const earlyExitFee = computed(() => (isEarlyTradingExit.value ? Number(amount.value || 0) * 0.3 : 0));
const netTransferAmount = computed(() => Math.max(Number(amount.value || 0) - earlyExitFee.value, 0));

const money = (value) => {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  });
};

const accountLabel = (account) => {
  return account === "main" ? "Main account" : "Trading account";
};

const syncUser = (updatedUser) => {
  user.value = updatedUser;
  localStorage.setItem("leqvoUser", JSON.stringify(updatedUser));
};

const loadTransferPage = async () => {
  if (!storedUser.id) {
    router.push("/login");
    return;
  }

  isLoading.value = true;

  try {
    const [userResult, transferResult] = await Promise.all([
      getUserById(storedUser.id),
      getAccountTransfers()
    ]);

    syncUser(userResult.data);
    transfers.value = transferResult.data?.transfers || [];
    eligibility.value = transferResult.data?.eligibility || eligibility.value;
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Transfer unavailable",
      message: error.message || "Could not load transfer details."
    });
  } finally {
    isLoading.value = false;
  }
};

const setMaxAmount = () => {
  amount.value = Number(availableBalance.value.toFixed(2));
};

const submitTransfer = async () => {
  const transferAmount = Number(amount.value);

  if (!Number.isFinite(transferAmount) || transferAmount <= 0) {
    showUserPopup({
      tone: "error",
      title: "Invalid amount",
      message: "Enter a valid transfer amount."
    });
    return;
  }

  if (fromAccount.value === "main" && toAccount.value === "trading" && transferAmount < 30) {
    showUserPopup({
      tone: "error",
      title: "Minimum not reached",
      message: "Minimum trading entry is 30 USDT."
    });
    return;
  }

  if (transferAmount > availableBalance.value) {
    showUserPopup({
      tone: "error",
      title: "Balance not enough",
      message: `Your ${accountLabel(fromAccount.value).toLowerCase()} balance is not enough.`
    });
    return;
  }

  isSubmitting.value = true;

  try {
    const result = await transferAccountBalance({
      fromAccount: fromAccount.value,
      toAccount: toAccount.value,
      amount: transferAmount
    });

    syncUser(result.data.user);
    transfers.value = [result.data.transfer, ...transfers.value].slice(0, 30);
    await loadTransferPage();
    amount.value = "";
    showUserPopup({
      tone: "success",
      title: "Transfer completed",
      message: "Transfer completed successfully."
    });
  } catch (error) {
    showUserPopup({
      tone: "error",
      title: "Transfer failed",
      message: error.message || "Transfer failed. Please try again."
    });
  } finally {
    isSubmitting.value = false;
  }
};

onMounted(loadTransferPage);
</script>

<template>
  <section class="transfer-page phone-shell page-enter app-page">
    <header class="transfer-header">
      <div>
        <p>Account transfer</p>
        <h1>Transfer</h1>
      </div>
      <button type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="transfer-hero">
      <div>
        <span>Total available</span>
        <strong>{{ money(mainBalance + tradingBalance) }}</strong>
        <p>Main to trading starts from 30 USDT. Only days with completed trades count toward unlock.</p>
      </div>
      <div class="transfer-orbit" aria-hidden="true">
        <i></i>
        <i></i>
      </div>
    </section>

    <section class="transfer-balance-grid">
      <article>
        <span>Main account</span>
        <strong>{{ money(mainBalance) }}</strong>
        <p>Deposits arrive here by default</p>
      </article>
      <article>
        <span>Trading account</span>
        <strong>{{ money(tradingBalance) }}</strong>
        <p>Used for trade allocations</p>
      </article>
    </section>

    <section class="transfer-card">
      <div class="transfer-card-heading">
        <div>
          <p>Direction</p>
          <h2>Move funds</h2>
        </div>
        <button type="button" @click="loadTransferPage">{{ isLoading ? "Syncing..." : "Refresh" }}</button>
      </div>

      <div class="transfer-direction">
        <button
          type="button"
          :class="{ active: direction === 'main-to-trading' }"
          @click="direction = 'main-to-trading'"
        >
          Main to Trading
        </button>
        <button
          type="button"
          :class="{ active: direction === 'trading-to-main' }"
          @click="direction = 'trading-to-main'"
        >
          Trading to Main
        </button>
      </div>

      <div class="transfer-flow">
        <div>
          <span>From</span>
          <strong>{{ accountLabel(fromAccount) }}</strong>
        </div>
        <b>&rarr;</b>
        <div>
          <span>To</span>
          <strong>{{ accountLabel(toAccount) }}</strong>
        </div>
      </div>

      <label class="transfer-field">
        <span>Amount</span>
        <div>
          <input v-model.number="amount" type="number" inputmode="decimal" min="0" placeholder="Enter amount" />
          <button type="button" @click="setMaxAmount">Max</button>
        </div>
      </label>

      <p class="transfer-available">Available: {{ money(availableBalance) }}</p>
      <p v-if="direction === 'main-to-trading'" class="transfer-rule-note">
        Minimum trading entry is 30 USDT.
      </p>
      <p v-if="isEarlyTradingExit" class="transfer-rule-note locked">
        Early transfer is allowed before 10 completed trading days, but 30% will be deducted. You receive {{ money(netTransferAmount) }}.
      </p>

      <button class="transfer-submit" type="button" :disabled="isSubmitting" @click="submitTransfer">
        {{ isSubmitting ? "Processing..." : "Confirm Transfer" }}
      </button>
    </section>

    <section class="transfer-history">
      <div class="transfer-section-heading">
        <h2>Recent transfers</h2>
        <span>{{ transfers.length }}</span>
      </div>

      <article v-if="isLoading" class="transfer-state">Loading transfers...</article>
      <article v-else-if="!transfers.length" class="transfer-state">No transfer records yet.</article>
      <template v-else>
        <article v-for="transfer in transfers" :key="transfer.id" class="transfer-row">
          <div>
            <strong>{{ accountLabel(transfer.fromAccount) }} to {{ accountLabel(transfer.toAccount) }}</strong>
            <p>
              {{ new Date(transfer.createdAt).toLocaleString() }}
              <span v-if="Number(transfer.feeAmount || 0) > 0">
                - Fee {{ money(transfer.feeAmount) }}, received {{ money(transfer.netAmount) }}
              </span>
            </p>
          </div>
        <span>{{ money(transfer.amount) }}</span>
        </article>
      </template>
    </section>
  </section>
</template>
