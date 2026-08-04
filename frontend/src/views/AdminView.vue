<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  getAdminDeposits,
  refreshAdminDeposit,
  creditAdminDeposit,
  updateAdminDeposit,
  deleteAdminDeposit,
  getAdminLeaders,
  getAdminKyc,
  getAdminOverview,
  getAdminBalanceAudit,
  getAdminUsers,
  getAdminTrades,
  getAdminWithdrawalAddresses,
  getAdminWithdrawals,
  grantAdminLeadershipReward,
  deleteAdminKyc,
  createAdminCopySignal,
  getAdminCopySignals,
  updateAdminKycStatus,
  updateAdminWithdrawalAddressStatus,
  unlockAdminWithdrawalAddress
} from "../utils/api";
import { BINANCE_MARKETS } from "../utils/binanceMarketSocket";
import AdminUsersView from "./admin/AdminUsersView.vue";

const router = useRouter();
const route = useRoute();
const admin = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const isLoading = ref(true);
const errorMessage = ref("");
const overview = ref(null);
const users = ref([]);
const userSummary = ref({ total: 0, active: 0, inactive: 0, verified: 0 });
const deposits = ref([]);
const withdrawals = ref([]);
const depositActionId = ref("");
const userTrades = ref([]);
const userTradeSummary = ref({ users: 0, active: 0, completed: 0, total: 0 });
const withdrawalAddresses = ref([]);
const addressReviewId = ref("");
const leaders = ref([]);
const leaderRewards = ref([]);
const leaderSummary = ref({ total: 0, qualified: 0, totalGranted: 0, topRank: "No rank" });
const rewardLoadingId = ref("");
const kycSubmissions = ref([]);
const kycReviewId = ref("");
const previewDocument = ref(null);
const rejectingKyc = ref(null);
const rejectionNote = ref("");
const deletingKycId = ref("");
const copySignals = ref([]);
const signalForm = ref({
  pair: "BTC/USDT",
  validDate: new Date().toISOString().slice(0, 10),
  validFromTime: "14:00",
  validToTime: "14:40",
  profitPercent: "1.09"
});
const createdSignal = ref(null);
const isCreatingSignal = ref(false);
const copiedSignal = ref(false);
const balanceAudit = ref(null);
const balanceAuditSearch = ref("");
const balanceAuditUserId = ref("");
const balanceAuditFilter = ref("all");
const isLoadingBalanceAudit = ref(false);

const menuItems = [
  "Overview",
  "Users",
  "Deposits",
  "Withdrawals",
  "Withdrawal Addresses",
  "KYC",
  "Copy Signals",
  "Users Signals",
  "Balance Tracking",
  "Refund Audit",
  "Leaders"
];

const tabToSlug = (tab) => tab.toLowerCase().replace(/\s+/g, "-");
const slugToTab = (slug) => {
  return menuItems.find((item) => tabToSlug(item) === slug) || "Overview";
};
const activeTab = ref(slugToTab(route.params.section));

const switchTab = (tab) => {
  activeTab.value = tab;
  router.push(tab === "Overview" ? "/admin" : `/admin/${tabToSlug(tab)}`);
};

const adminName = computed(() => admin.username || "Administrator");

const money = (value) => Number(value || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatDate = (date) => {
  if (!date) {
    return "Pending";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(date));
};

const formatDateTime = (date) => {
  if (!date) {
    return "Not recorded";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
};

const nowLabel = computed(() => formatDate(new Date()));

const stats = computed(() => {
  const data = overview.value;

  return [
    {
      label: "Users",
      value: data?.users?.total || 0,
      note: `${data?.users?.today || 0} joined today`,
      tone: "pink"
    },
    {
      label: "Deposits",
      value: `${money(data?.deposits?.credited_total)} USDT`,
      note: `${data?.deposits?.pending || 0} awaiting confirmation`,
      tone: "blue"
    },
    {
      label: "Withdrawals",
      value: `${money(data?.withdrawals?.approved_total)} USDT`,
      note: `${data?.withdrawals?.pending || 0} pending review`,
      tone: "green"
    },
    {
      label: "KYC Queue",
      value: kycSubmissions.value.filter((item) => item.status === "pending").length,
      note: `${kycSubmissions.value.length} submissions`,
      tone: "amber"
    }
  ];
});

const volumeBars = computed(() => overview.value?.depositVolume || []);
const recentUsers = computed(() => overview.value?.recentUsers || []);

const reviewItems = computed(() => [
  { title: "Deposit confirmations", status: `${overview.value?.deposits?.pending || 0} open`, accent: "blue" },
  { title: "Withdrawal approvals", status: `${overview.value?.withdrawals?.pending || 0} urgent`, accent: "pink" },
  { title: "Registered users", status: `${overview.value?.users?.total || 0} accounts`, accent: "amber" }
]);

const leaderCards = computed(() => [
  { label: "Tracked Leaders", value: leaderSummary.value.total || 0, note: "Leadership records" },
  { label: "Qualified", value: leaderSummary.value.qualified || 0, note: "Unlocked ranks" },
  { label: "Rewards Granted", value: `${money(leaderSummary.value.totalGranted)} USDT`, note: "Total paid" },
  { label: "Top Rank", value: leaderSummary.value.topRank || "No rank", note: "Highest current tier" }
]);

const copySignalCards = computed(() => [
  {
    label: "Total Trades",
    value: overview.value?.trades?.total || 0,
    note: "All user trade records",
    icon: "chart"
  },
  {
    label: "Active Trades",
    value: overview.value?.trades?.active || 0,
    note: "Currently running",
    icon: "pulse"
  },
  {
    label: "Finished Trades",
    value: overview.value?.trades?.finished || 0,
    note: "Wins and losses closed",
    icon: "check"
  },
  {
    label: "Users Traded",
    value: overview.value?.trades?.users || 0,
    note: "Unique trading users",
    icon: "users"
  }
]);

const userSignalCards = computed(() => [
  {
    label: "Users Traded",
    value: userTradeSummary.value.users || 0,
    note: "Users who performed trades",
    tone: "indigo"
  },
  {
    label: "Active Trades",
    value: userTradeSummary.value.active || 0,
    note: "Signals still running",
    tone: "cyan"
  },
  {
    label: "Completed",
    value: userTradeSummary.value.completed || 0,
    note: "Finished trade records",
    tone: "emerald"
  },
  {
    label: "All Trades",
    value: userTradeSummary.value.total || 0,
    note: "Total user trades",
    tone: "amber"
  }
]);

const availableSignalPairs = computed(() => {
  return BINANCE_MARKETS.map((market) => ({
    value: `${market.symbol}/USDT`,
    label: `${market.symbol}/USDT - ${market.name}`
  }));
});

const signalTimeSlots = [
  { start: "10:00", end: "10:40", label: "First trade" },
  { start: "11:00", end: "11:40", label: "Second trade" },
  { start: "13:00", end: "13:40", label: "Third trade" },
  { start: "14:00", end: "14:40", label: "Fourth trade" },
  { start: "15:00", end: "15:40", label: "Fifth bonus trade" }
];

const availableSignalEndTimes = computed(() => {
  const selectedSlot = signalTimeSlots.find((slot) => slot.start === signalForm.value.validFromTime);

  return selectedSlot ? [{ value: selectedSlot.end, label: `${selectedSlot.end} UTC` }] : [];
});

watch(
  () => signalForm.value.validFromTime,
  (startTime) => {
    const selectedSlot = signalTimeSlots.find((slot) => slot.start === startTime);

    if (selectedSlot) {
      signalForm.value.validToTime = selectedSlot.end;
    }
  }
);

const balanceAuditUsers = computed(() => {
  const search = balanceAuditSearch.value.trim().toLowerCase();

  return users.value
    .filter((user) => {
      return !search ||
        user.username.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.id.toLowerCase().includes(search);
    })
    .slice(0, 8);
});

const balanceAuditCards = computed(() => {
  const audit = balanceAudit.value;

  return [
    { label: "Main Balance", value: `${money(audit?.user?.balance)} USDT`, note: "Current account balance" },
    { label: "Trading Balance", value: `${money(audit?.user?.tradingBalance)} USDT`, note: "Current trading funds" },
    { label: "Total Deposit", value: `${money(audit?.totals?.totalDeposit)} USDT`, note: `${audit?.totals?.depositCount || 0} deposit records` },
    { label: "Total Withdrawal", value: `${money(audit?.totals?.totalWithdrawal)} USDT`, note: `${audit?.totals?.withdrawalCount || 0} withdrawal records` },
    { label: "Trade Amount", value: `${money(audit?.totals?.totalTradeAmount)} USDT`, note: `${audit?.totals?.tradeCount || 0} user trades` },
    { label: "Team Earnings", value: `${money(audit?.totals?.teamEarnings)} USDT`, note: "Leadership/team rewards" }
  ];
});

const balanceAuditActivities = computed(() => {
  const items = balanceAudit.value?.activities || [];

  if (balanceAuditFilter.value === "all") {
    return items;
  }

  return items.filter((item) => item.category === balanceAuditFilter.value);
});

const trackSearchedBalanceUser = () => {
  const matchedUser = balanceAuditUsers.value[0];

  if (matchedUser) {
    loadBalanceAudit(matchedUser.id);
  }
};

const loadBalanceAudit = async (userId = balanceAuditUserId.value) => {
  if (!userId) {
    return;
  }

  balanceAuditUserId.value = userId;
  isLoadingBalanceAudit.value = true;
  errorMessage.value = "";

  try {
    const result = await getAdminBalanceAudit(userId);
    balanceAudit.value = result.data;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoadingBalanceAudit.value = false;
  }
};

const loadAdminData = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const [overviewResult, usersResult, depositsResult, withdrawalsResult, tradesResult, leadersResult, kycResult, addressesResult, signalsResult] = await Promise.all([
      getAdminOverview(),
      getAdminUsers(),
      getAdminDeposits(),
      getAdminWithdrawals(),
      getAdminTrades(),
      getAdminLeaders(),
      getAdminKyc(),
      getAdminWithdrawalAddresses(),
      getAdminCopySignals()
    ]);

    overview.value = overviewResult.data;
    users.value = usersResult.data.users;
    userSummary.value = usersResult.data.summary;
    deposits.value = depositsResult.data;
    withdrawals.value = withdrawalsResult.data;
    userTrades.value = tradesResult.data.trades;
    userTradeSummary.value = tradesResult.data.summary;
    leaders.value = leadersResult.data.leaders;
    leaderRewards.value = leadersResult.data.rewards;
    leaderSummary.value = leadersResult.data.summary;
    kycSubmissions.value = kycResult.data;
    withdrawalAddresses.value = addressesResult.data;
    copySignals.value = signalsResult.data;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

const refreshDepositRecord = async (deposit) => {
  depositActionId.value = `${deposit.id}-refresh`;
  errorMessage.value = "";

  try {
    await refreshAdminDeposit(deposit.id);
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    depositActionId.value = "";
  }
};

const creditDepositRecord = async (deposit) => {
  depositActionId.value = `${deposit.id}-credit`;
  errorMessage.value = "";

  try {
    await creditAdminDeposit(deposit.id);
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    depositActionId.value = "";
  }
};

const editDepositRecord = async (deposit) => {
  const priceAmount = window.prompt("Edit deposit amount (USD)", String(deposit.priceAmount ?? ""));

  if (priceAmount === null) {
    return;
  }

  const payAddress = window.prompt("Edit deposit address", deposit.payAddress || "");

  if (payAddress === null) {
    return;
  }

  const status = window.prompt("Edit deposit status", deposit.status || "");

  if (status === null) {
    return;
  }

  depositActionId.value = `${deposit.id}-edit`;
  errorMessage.value = "";

  try {
    await updateAdminDeposit(deposit.id, {
      priceAmount: Number(priceAmount),
      payAddress: payAddress.trim(),
      status: status.trim().toLowerCase()
    });
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    depositActionId.value = "";
  }
};

const deleteDepositRecord = async (deposit) => {
  if (!window.confirm(`Delete deposit ${deposit.paymentId} for ${deposit.username}?`)) {
    return;
  }

  depositActionId.value = `${deposit.id}-delete`;
  errorMessage.value = "";

  try {
    await deleteAdminDeposit(deposit.id);
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    depositActionId.value = "";
  }
};

const buildSignalDates = () => {
  const validFrom = new Date(`${signalForm.value.validDate}T${signalForm.value.validFromTime}:00Z`);
  const validTo = new Date(`${signalForm.value.validDate}T${signalForm.value.validToTime}:00Z`);

  return { validFrom, validTo };
};

const formatSignalTime = (date) => {
  return new Intl.DateTimeFormat("en", {
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    day: "2-digit"
  }).format(new Date(date));
};

const getSignalMessage = (signal = createdSignal.value) => {
  if (!signal) return "";

  return [
    "LEQVO COPY SIGNAL",
    `Pair: ${signal.pair}`,
    `Currency: ${signal.currency}`,
    `Signal Code: ${signal.signalCode}`,
    `Profit: ${Number(signal.profitPercent).toFixed(2)}%`,
    `Valid: ${formatSignalTime(signal.validFrom)} - ${formatSignalTime(signal.validTo)}`,
    Number(signal.minDepositRequired || 0) > 0
      ? `Bonus trade: minimum deposit ${money(signal.minDepositRequired)} USDT`
      : "Standard trade",
    "Signal is valid for 40 minutes only."
  ].join("\n");
};

const telegramShareUrl = (signal) => {
  return `https://t.me/share/url?text=${encodeURIComponent(getSignalMessage(signal))}`;
};

const createCopySignal = async () => {
  const { validFrom, validTo } = buildSignalDates();
  isCreatingSignal.value = true;
  errorMessage.value = "";

  try {
    const result = await createAdminCopySignal({
      pair: signalForm.value.pair,
      validFrom: validFrom.toISOString(),
      validTo: validTo.toISOString(),
      profitPercent: Number(signalForm.value.profitPercent)
    });

    createdSignal.value = result.data;
    copySignals.value = [result.data, ...copySignals.value];
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isCreatingSignal.value = false;
  }
};

const copySignalMessage = async (signal) => {
  await navigator.clipboard.writeText(getSignalMessage(signal));
  copiedSignal.value = true;
  setTimeout(() => {
    copiedSignal.value = false;
  }, 1400);
};

const reviewWithdrawalAddress = async (address, status) => {
  addressReviewId.value = `${address.userId}-${status}`;
  errorMessage.value = "";

  try {
    await updateAdminWithdrawalAddressStatus(address.userId, {
      status,
      note: status === "approved" ? "Approved by admin" : "Rejected by admin"
    });
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    addressReviewId.value = "";
  }
};

const unlockWithdrawalAddress = async (address) => {
  addressReviewId.value = `${address.userId}-unlock`;
  errorMessage.value = "";

  try {
    await unlockAdminWithdrawalAddress(address.userId, {
      note: "Unlocked by admin for address update"
    });
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    addressReviewId.value = "";
  }
};

const reviewKyc = async (submission, status) => {
  kycReviewId.value = `${submission.id}-${status}`;
  errorMessage.value = "";

  try {
    await updateAdminKycStatus(submission.id, {
      status,
      note: status === "approved" ? "Approved by admin" : "Rejected by admin"
    });
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    kycReviewId.value = "";
  }
};

const startRejectKyc = (submission) => {
  rejectingKyc.value = submission;
  rejectionNote.value = "";
  errorMessage.value = "";
};

const submitKycRejection = async () => {
  if (!rejectionNote.value.trim()) {
    errorMessage.value = "Enter a rejection reason before rejecting KYC.";
    return;
  }

  kycReviewId.value = `${rejectingKyc.value.id}-rejected`;
  errorMessage.value = "";

  try {
    await updateAdminKycStatus(rejectingKyc.value.id, {
      status: "rejected",
      note: rejectionNote.value.trim()
    });
    rejectingKyc.value = null;
    rejectionNote.value = "";
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    kycReviewId.value = "";
  }
};

const deleteKyc = async (submission) => {
  if (!window.confirm(`Delete KYC submission for ${submission.username}?`)) {
    return;
  }

  deletingKycId.value = submission.id;
  errorMessage.value = "";

  try {
    await deleteAdminKyc(submission.id);
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    deletingKycId.value = "";
  }
};

const openKycPreview = (submission, label, image) => {
  previewDocument.value = {
    label,
    image,
    username: submission.username,
    userId: submission.userId
  };
};

const grantLeaderReward = async (leader, rewardType, amount) => {
  rewardLoadingId.value = `${leader.userId}-${rewardType}`;
  errorMessage.value = "";

  try {
    await grantAdminLeadershipReward(leader.userId, {
      rewardType,
      amount,
      note: `${rewardType.replace("_", " ")} granted from admin Leaders panel`
    });
    await loadAdminData();
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    rewardLoadingId.value = "";
  }
};

const handleLogout = () => {
  localStorage.removeItem("leqvoUser");
  localStorage.removeItem("leqvoToken");
  router.push("/login");
};

watch(
  () => route.params.section,
  (section) => {
    activeTab.value = slugToTab(section);
  }
);

onMounted(loadAdminData);
</script>

<template>
  <main class="admin-shell page-enter">
    <aside class="admin-sidebar">
      <div class="admin-brand-row">
        <div class="admin-brand-mark">LQ</div>
        <div>
          <strong>Leqvo</strong>
          <span>Operations</span>
        </div>
      </div>

      <nav class="admin-nav" aria-label="Admin management">
        <p>Management</p>
        <button
          v-for="item in menuItems"
          :key="item"
          type="button"
          :class="{ active: item === activeTab }"
          @click="switchTab(item)"
        >
          <span class="admin-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5zM13 13h6v6h-6z" />
            </svg>
          </span>
          {{ item }}
        </button>
      </nav>

      <div class="admin-sidebar-actions">
        <button type="button" @click="router.push('/')">
          <span class="admin-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" /></svg>
          </span>
          Back To App
        </button>
        <button class="danger" type="button" @click="handleLogout">
          <span class="admin-nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M15 7l5 5-5 5M20 12H9M10 5H5v14h5" /></svg>
          </span>
          Logout
        </button>
      </div>
    </aside>

    <section class="admin-workspace">
      <header class="admin-topbar">
        <div>
          <p>Workspace</p>
          <h1>{{ activeTab }}</h1>
        </div>

        <div class="admin-top-actions">
          <button class="admin-refresh" type="button" @click="loadAdminData">Refresh</button>
          <div class="admin-clock">
            <span aria-hidden="true"></span>
            <div>
              <strong>Live</strong>
              <small>{{ nowLabel }} · UTC</small>
            </div>
          </div>
          <button class="admin-user-chip" type="button" @click="handleLogout">
            <span>{{ adminName.charAt(0).toUpperCase() }}</span>
            <div>
              <strong>{{ adminName }}</strong>
            </div>
          </button>
        </div>
      </header>

      <nav class="admin-mobile-nav" aria-label="Admin shortcuts">
        <button
          v-for="item in menuItems"
          :key="item"
          type="button"
          :class="{ active: item === activeTab }"
          @click="switchTab(item)"
        >
          {{ item }}
        </button>
      </nav>

      <p v-if="errorMessage" class="form-message error admin-error">{{ errorMessage }}</p>

      <section v-if="activeTab === 'Overview'" class="admin-view-stack">
        <section class="admin-foundation">
          <div>
            <p>Live Control</p>
            <h2>Keep Leqvo operations moving with one clear command center.</h2>
            <span>Review user activity, payment queues, deposits, withdrawals, and verification flow from PostgreSQL-backed data.</span>
          </div>
          <div class="admin-hero-actions">
            <button type="button" @click="switchTab('Users')">Review Users</button>
            <button type="button" @click="switchTab('Withdrawals')">Open Queue</button>
          </div>
        </section>

        <section class="admin-metrics" aria-label="Admin metrics">
          <article v-for="stat in stats" :key="stat.label" class="admin-metric-card" :class="`is-${stat.tone}`">
            <div>
              <p>{{ stat.label }}</p>
              <strong>{{ stat.value }}</strong>
              <span>{{ stat.note }}</span>
            </div>
            <i aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M7 11h10M7 15h7M8 7h8M5 21h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2Z" /></svg>
            </i>
          </article>
        </section>

        <section class="admin-grid">
          <article class="admin-panel admin-volume-panel">
            <div class="admin-panel-head">
              <div>
                <h2>Deposit Volume</h2>
                <p>Credited deposits during the last seven days</p>
              </div>
              <button type="button" @click="switchTab('Deposits')">View All</button>
            </div>

            <div class="admin-chart-bars">
              <div v-for="bar in volumeBars" :key="bar.day" class="admin-chart-column">
                <span>{{ bar.value }}</span>
                <i :style="{ height: `${bar.height}%` }"></i>
                <strong>{{ bar.day }}</strong>
              </div>
            </div>
          </article>

          <article class="admin-panel admin-users-panel">
            <div class="admin-panel-head">
              <div>
                <h2>Recently Joined</h2>
                <p>Latest user accounts created on Leqvo</p>
              </div>
            </div>

            <div class="admin-user-list">
              <div v-for="user in recentUsers" :key="user.id" class="admin-user-row">
                <div class="admin-user-mini">{{ user.username.charAt(0).toUpperCase() }}</div>
                <div>
                  <strong>{{ user.username }}</strong>
                  <span>{{ user.email }}</span>
                </div>
                <b>{{ formatDate(user.createdAt) }}</b>
              </div>
            </div>
          </article>
        </section>

        <section class="admin-review-strip" aria-label="Review queue">
          <article v-for="item in reviewItems" :key="item.title" :class="`is-${item.accent}`">
            <div>
              <strong>{{ item.title }}</strong>
              <span>{{ item.status }}</span>
            </div>
            <button type="button">Review</button>
          </article>
        </section>
      </section>

      <AdminUsersView
        v-else-if="activeTab === 'Users'"
        :users="users"
        :summary="userSummary"
        :money="money"
        :format-date="formatDate"
        @refresh="loadAdminData"
        @error="errorMessage = $event"
        @loading="isLoading = $event"
      />

      <section v-else-if="activeTab === 'Deposits'" class="admin-panel admin-table-panel">
        <div class="admin-panel-head">
          <div>
            <h2>Deposits</h2>
            <p>Requested addresses, NOWPayments status, and manual credit controls</p>
          </div>
        </div>

        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Currency</th>
                <th>Address</th>
                <th>Payment</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(deposit, index) in deposits" :key="deposit.id">
                <td>{{ index + 1 }}</td>
                <td>
                  <strong>{{ deposit.username }}</strong>
                  <span>{{ deposit.userId }}</span>
                </td>
                <td>
                  <strong>{{ money(deposit.priceAmount) }}</strong>
                  <span>Target USD</span>
                </td>
                <td>
                  <strong>{{ Number(deposit.actuallyPaid || 0).toFixed(6) }}</strong>
                  <span>Fiat {{ money(deposit.actuallyPaidAtFiat || 0) }}</span>
                </td>
                <td>
                  <strong>{{ deposit.payCurrency }} / {{ deposit.payNetwork }}</strong>
                  <span>{{ Number(deposit.payAmount || 0).toFixed(6) }}</span>
                </td>
                <td>
                  <strong>{{ deposit.payAddress }}</strong>
                </td>
                <td>
                  <strong>{{ deposit.paymentId }}</strong>
                  <span>{{ deposit.creditedAt ? "Credited" : "Pending credit" }}</span>
                </td>
                <td>
                  <strong>{{ deposit.status }}</strong>
                  <span>{{ deposit.creditedAt ? formatDateTime(deposit.creditedAt) : "Not credited" }}</span>
                </td>
                <td>{{ formatDateTime(deposit.createdAt) }}</td>
                <td>
                  <div class="admin-inline-actions">
                    <button
                      type="button"
                      :disabled="depositActionId === `${deposit.id}-refresh`"
                      @click="refreshDepositRecord(deposit)"
                    >
                      {{ depositActionId === `${deposit.id}-refresh` ? "Checking..." : "Check" }}
                    </button>
                    <button
                      type="button"
                      :disabled="Boolean(deposit.creditedAt) || depositActionId === `${deposit.id}-credit`"
                      @click="creditDepositRecord(deposit)"
                    >
                      {{ depositActionId === `${deposit.id}-credit` ? "Crediting..." : "Credit" }}
                    </button>
                    <button
                      type="button"
                      :disabled="depositActionId === `${deposit.id}-edit`"
                      @click="editDepositRecord(deposit)"
                    >
                      {{ depositActionId === `${deposit.id}-edit` ? "Saving..." : "Edit" }}
                    </button>
                    <button
                      type="button"
                      class="danger"
                      :disabled="depositActionId === `${deposit.id}-delete`"
                      @click="deleteDepositRecord(deposit)"
                    >
                      {{ depositActionId === `${deposit.id}-delete` ? "Deleting..." : "Delete" }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="activeTab === 'Withdrawals'" class="admin-panel admin-table-panel">
        <div class="admin-panel-head">
          <div>
            <h2>Withdrawals</h2>
            <p>Withdrawal requests stored in PostgreSQL</p>
          </div>
        </div>

        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Asset</th>
                <th>Status</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(withdrawal, index) in withdrawals" :key="withdrawal.id">
                <td>{{ index + 1 }}</td>
                <td>{{ withdrawal.username }}</td>
                <td>{{ money(withdrawal.amount) }}</td>
                <td>{{ money(withdrawal.feeAmount) }}</td>
                <td>{{ withdrawal.asset }} / {{ withdrawal.network }}</td>
                <td>{{ withdrawal.status }}</td>
                <td>{{ formatDate(withdrawal.requestedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

      </section>

      <section v-else-if="activeTab === 'Withdrawal Addresses'" class="admin-view-stack">
        <section class="admin-panel withdrawal-address-admin-panel">
        <div class="admin-panel-head withdrawal-address-admin-head">
          <div>
            <h2>Withdrawal Addresses</h2>
            <p>Unlock approved address changes and approve pending wallet updates</p>
          </div>
        </div>

        <div class="withdrawal-address-admin-list">
          <article v-if="!withdrawalAddresses.length" class="admin-empty-state">
            <h2>No address submissions</h2>
            <p>User payout wallet requests and locked address records will appear here.</p>
          </article>
          <article v-for="address in withdrawalAddresses" :key="address.userId" class="withdrawal-address-admin-card">
            <div class="withdrawal-address-admin-top">
              <div>
                <strong>{{ address.username }}</strong>
                <span>{{ address.userId }} · {{ address.asset }} / {{ address.network }}</span>
              </div>
              <b :class="address.status">{{ address.status }}</b>
            </div>
            <p>{{ address.address }}</p>
            <small>
              {{
                address.pendingAddress?.submittedAt
                  ? `Submitted ${formatDate(address.pendingAddress.submittedAt)}`
                  : address.locked
                    ? "Approved address locked for user changes"
                    : `Reviewed ${formatDate(address.reviewedAt)}`
              }}
            </small>
            <div v-if="address.activeAddress && !address.pendingAddress" class="withdrawal-address-admin-current">
              <span>Current approved address is protected until admin unlocks it.</span>
            </div>
            <div class="withdrawal-address-admin-actions">
              <button
                v-if="address.activeAddress && address.locked && !address.pendingAddress"
                type="button"
                :disabled="addressReviewId === `${address.userId}-unlock`"
                @click="unlockWithdrawalAddress(address)"
              >
                {{ addressReviewId === `${address.userId}-unlock` ? "Unlocking..." : "Unlock" }}
              </button>
              <button
                v-if="address.pendingAddress"
                type="button"
                :disabled="address.status === 'approved' || addressReviewId === `${address.userId}-approved`"
                @click="reviewWithdrawalAddress(address, 'approved')"
              >
                Approve
              </button>
              <button
                v-if="address.pendingAddress"
                type="button"
                :disabled="address.status === 'rejected' || addressReviewId === `${address.userId}-rejected`"
                @click="reviewWithdrawalAddress(address, 'rejected')"
              >
                Reject
              </button>
            </div>
          </article>
        </div>
        </section>
      </section>

      <section v-else-if="activeTab === 'KYC'" class="admin-view-stack">
        <section class="admin-panel kyc-admin-panel">
          <div class="admin-panel-head">
            <div>
              <h2>KYC Review</h2>
              <p>Approve or reject identity documents submitted by users</p>
            </div>
          </div>

          <article v-if="!kycSubmissions.length" class="admin-empty-state">
            <h2>No KYC submissions</h2>
            <p>New verification requests will appear here.</p>
          </article>

          <div v-else class="kyc-admin-list">
            <article v-for="submission in kycSubmissions" :key="submission.id" class="kyc-admin-card">
              <div class="kyc-admin-head">
                <div class="admin-user-mini">{{ submission.username.charAt(0).toUpperCase() }}</div>
                <div>
                  <strong>{{ submission.username }}</strong>
                  <span>{{ submission.email }} · {{ submission.userId }}</span>
                </div>
                <b :class="submission.status">{{ submission.status }}</b>
              </div>

              <div class="kyc-admin-docs">
                <button type="button" @click="openKycPreview(submission, 'ID Front', submission.idFront)">
                  <span>ID Front</span>
                  <small>Preview document</small>
                </button>
                <button type="button" @click="openKycPreview(submission, 'ID Back', submission.idBack)">
                  <span>ID Back</span>
                  <small>Preview document</small>
                </button>
                <button type="button" @click="openKycPreview(submission, 'Selfie', submission.selfie)">
                  <span>Selfie</span>
                  <small>Preview image</small>
                </button>
              </div>

              <div class="kyc-admin-meta">
                <span>Submitted {{ formatDate(submission.submittedAt) }}</span>
                <span v-if="submission.reviewedAt">Reviewed {{ formatDate(submission.reviewedAt) }}</span>
              </div>

              <div class="kyc-admin-actions">
                <button
                  type="button"
                  :disabled="submission.status === 'approved' || kycReviewId === `${submission.id}-approved`"
                  @click="reviewKyc(submission, 'approved')"
                >
                  Approve
                </button>
                <button
                  type="button"
                  :disabled="submission.status === 'rejected' || kycReviewId === `${submission.id}-rejected`"
                  @click="startRejectKyc(submission)"
                >
                  Reject
                </button>
                <button
                  type="button"
                  :disabled="deletingKycId === submission.id"
                  @click="deleteKyc(submission)"
                >
                  {{ deletingKycId === submission.id ? "Deleting..." : "Delete" }}
                </button>
              </div>
            </article>
          </div>
        </section>
      </section>

      <section v-else-if="activeTab === 'Copy Signals'" class="admin-view-stack copy-signal-admin">
        <section class="copy-signal-hero admin-panel">
          <div>
            <span>Signal Desk</span>
            <h2>Copy trading command center</h2>
            <p>Create timed signals, monitor user trade activity, and publish clean Telegram instructions from one place.</p>
          </div>
          <strong>{{ copySignals.length }} signals</strong>
        </section>

        <section class="copy-signal-metrics" aria-label="Copy signal trade metrics">
          <article v-for="card in copySignalCards" :key="card.label" class="copy-signal-metric-card">
            <i :class="`is-${card.icon}`" aria-hidden="true"></i>
            <div>
              <span>{{ card.label }}</span>
              <strong>{{ card.value }}</strong>
              <p>{{ card.note }}</p>
            </div>
          </article>
        </section>

        <section class="copy-signal-workspace">
          <section class="admin-panel copy-signal-form-panel">
            <div class="admin-panel-head">
              <div>
                <h2>Create Signal</h2>
                <p>Fixed UTC sessions with a 40-minute validity window</p>
              </div>
            </div>

            <div class="copy-signal-form-grid">
              <label>
                Pair
                <select v-model="signalForm.pair">
                  <option v-for="pair in availableSignalPairs" :key="pair.value" :value="pair.value">
                    {{ pair.label }}
                  </option>
                </select>
              </label>
              <label>
                Date
                <input v-model="signalForm.validDate" type="date" />
              </label>
              <label>
                Start time
                <select v-model="signalForm.validFromTime">
                  <option v-for="slot in signalTimeSlots" :key="slot.start" :value="slot.start">
                    {{ slot.label }} - {{ slot.start }} UTC
                  </option>
                </select>
              </label>
              <label>
                End time
                <select v-model="signalForm.validToTime">
                  <option v-for="slot in availableSignalEndTimes" :key="slot.value" :value="slot.value">
                    {{ slot.label }}
                  </option>
                </select>
              </label>
              <label>
                Profit %
                <input v-model="signalForm.profitPercent" type="number" min="0.01" step="0.01" placeholder="1.09" />
              </label>
            </div>

            <div class="copy-signal-window">
              <span>Valid for exactly 40 minutes</span>
              <strong>{{ signalForm.validFromTime }} - {{ signalForm.validToTime }} UTC</strong>
              <small v-if="signalForm.validFromTime === '15:00'">Bonus trade requires user deposit of 300 USDT and above.</small>
            </div>

            <button class="copy-signal-submit" type="button" :disabled="isCreatingSignal" @click="createCopySignal">
              {{ isCreatingSignal ? "Creating..." : "Create Signal" }}
            </button>
          </section>

          <section class="admin-panel copy-signal-share-panel">
            <div class="admin-panel-head">
              <div>
                <h2>Telegram Preview</h2>
                <p>{{ createdSignal ? "Ready to copy or share" : "Create a signal to generate message" }}</p>
              </div>
            </div>
            <pre>{{ createdSignal ? getSignalMessage(createdSignal) : "LEQVO COPY SIGNAL\nPair: waiting\nSignal Code: generated after creation\nValid: selected UTC window" }}</pre>
            <div class="copy-signal-actions">
              <button type="button" :disabled="!createdSignal" @click="copySignalMessage(createdSignal)">
                {{ copiedSignal ? "Copied" : "Copy Message" }}
              </button>
              <a v-if="createdSignal" :href="telegramShareUrl(createdSignal)" target="_blank" rel="noreferrer">Share Telegram</a>
            </div>
          </section>
        </section>

        <section class="admin-panel copy-signal-list-panel">
          <div class="copy-signal-list-head">
            <div>
              <span>Signal History</span>
              <h2>Recent Signals</h2>
            </div>
            <strong>{{ copySignals.length }} total</strong>
          </div>
          <div class="copy-signal-list">
            <article v-for="signal in copySignals" :key="signal.id" class="copy-signal-row">
              <div>
                <strong>{{ signal.pair }}</strong>
                <span>{{ signal.signalCode }} · {{ Number(signal.profitPercent).toFixed(2) }}%</span>
                <span v-if="Number(signal.minDepositRequired || 0) > 0">Bonus · Min {{ money(signal.minDepositRequired) }} USDT</span>
              </div>
              <small>{{ formatSignalTime(signal.validFrom) }} - {{ formatSignalTime(signal.validTo) }}</small>
              <a :href="telegramShareUrl(signal)" target="_blank" rel="noreferrer">Telegram</a>
            </article>
          </div>
        </section>
      </section>

      <section v-else-if="activeTab === 'Users Signals'" class="admin-view-stack user-signals-admin">
        <section class="user-signals-hero admin-panel">
          <div>
            <span>Trade Activity</span>
            <h2>User signal performance</h2>
            <p>Monitor every user who entered a signal trade, including active positions, completed outcomes, allocation, and profit movement.</p>
          </div>
        </section>

        <section class="user-signals-metrics" aria-label="User signal metrics">
          <article v-for="card in userSignalCards" :key="card.label" class="user-signal-metric" :class="`is-${card.tone}`">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <p>{{ card.note }}</p>
          </article>
        </section>

        <section class="admin-panel user-signals-panel">
          <div class="admin-panel-head">
            <div>
              <h2>Trade Records</h2>
              <p>Active and finished trades created from user signal entries</p>
            </div>
          </div>

          <div class="user-signals-list">
            <article v-if="!userTrades.length" class="admin-empty-state">
              <h2>No user trades yet</h2>
              <p>Trades will appear here when users complete signal entries.</p>
            </article>

            <article v-for="trade in userTrades" :key="trade.id" class="user-signal-card">
              <div class="user-signal-main">
                <div class="admin-user-mini">{{ trade.username.charAt(0).toUpperCase() }}</div>
                <div>
                  <strong>{{ trade.username }}</strong>
                  <span>{{ trade.userId }} · {{ trade.email }}</span>
                </div>
                <b :class="trade.status">{{ trade.status }}</b>
              </div>

              <div class="user-signal-grid">
                <div>
                  <span>Pair</span>
                  <strong>{{ trade.pair }}</strong>
                </div>
                <div>
                  <span>Signal Code</span>
                  <strong>{{ trade.signalCode }}</strong>
                </div>
                <div>
                  <span>Amount</span>
                  <strong>{{ money(trade.amount) }} USDT</strong>
                </div>
                <div>
                  <span>Allocation</span>
                  <strong>{{ Number(trade.allocationPercent || 0).toFixed(0) }}%</strong>
                </div>
                <div>
                  <span>Entry</span>
                  <strong>{{ money(trade.entryPrice) }}</strong>
                </div>
                <div>
                  <span>PnL</span>
                  <strong :class="Number(trade.pnlAmount || 0) >= 0 ? 'positive' : 'negative'">
                    {{ money(trade.pnlAmount) }} USDT
                  </strong>
                </div>
              </div>

              <footer>
                <span>Opened {{ formatDate(trade.openedAt) }}</span>
                <span>{{ trade.closedAt ? `Closed ${formatDate(trade.closedAt)}` : "Still active" }}</span>
              </footer>
            </article>
          </div>
        </section>
      </section>

      <section v-else-if="activeTab === 'Balance Tracking'" class="admin-view-stack balance-audit-admin">
        <section class="admin-panel balance-audit-hero">
          <div>
            <span>Balance Audit</span>
            <h2>Track user finance movement</h2>
            <p>Search a user and review deposits, withdrawals, trades, transfers, team earnings, rewards, and recorded account activity.</p>
          </div>
        </section>

        <section class="admin-panel balance-audit-search-panel">
          <div class="balance-audit-search-row">
            <label class="balance-audit-search">
              <span>Search user</span>
              <input
                v-model="balanceAuditSearch"
                type="search"
                placeholder="Search username, email, or user ID"
                @keyup.enter="trackSearchedBalanceUser"
              />
            </label>
            <button type="button" :disabled="!balanceAuditUsers.length || isLoadingBalanceAudit" @click="trackSearchedBalanceUser">
              {{ isLoadingBalanceAudit ? "Tracking..." : "Track User" }}
            </button>
          </div>
        </section>

        <section v-if="balanceAudit" class="balance-audit-profile admin-panel">
          <div class="admin-user-mini">{{ balanceAudit.user.username.charAt(0).toUpperCase() }}</div>
          <div>
            <span>{{ balanceAudit.user.id }}</span>
            <strong>{{ balanceAudit.user.username }}</strong>
            <p>{{ balanceAudit.user.email }} · Joined {{ formatDateTime(balanceAudit.user.createdAt) }}</p>
          </div>
        </section>

        <section v-if="balanceAudit" class="balance-audit-cards">
          <article v-for="card in balanceAuditCards" :key="card.label" class="balance-audit-card">
            <span>{{ card.label }}</span>
            <strong>{{ card.value }}</strong>
            <p>{{ card.note }}</p>
          </article>
        </section>

        <section v-if="balanceAudit" class="admin-panel balance-audit-panel">
          <div class="balance-audit-panel-head">
            <div>
              <h2>Finance Timeline</h2>
              <p>Before/after snapshots show only where the current table stores proof of that value.</p>
            </div>
            <div class="balance-audit-filters">
              <button
                v-for="filter in ['all', 'finance', 'team', 'trades', 'activity']"
                :key="filter"
                type="button"
                :class="{ active: balanceAuditFilter === filter }"
                @click="balanceAuditFilter = filter"
              >
                {{ filter }}
              </button>
            </div>
          </div>

          <div class="balance-audit-list">
            <article v-if="!balanceAuditActivities.length" class="admin-empty-state">
              <h2>No activity found</h2>
              <p>No records match this filter for the selected user.</p>
            </article>

            <article v-for="item in balanceAuditActivities" :key="item.id" class="balance-audit-row" :class="item.category">
              <div class="balance-audit-type">
                <i aria-hidden="true"></i>
                <div>
                  <strong>{{ item.type }}</strong>
                  <span>{{ item.title }}</span>
                </div>
              </div>
              <div>
                <span>Amount</span>
                <strong>{{ money(item.amount) }} USDT</strong>
              </div>
              <div>
                <span>Status / Profit</span>
                <strong>{{ item.profit !== undefined ? `${money(item.profit)} USDT` : item.status }}</strong>
              </div>
              <div>
                <span>Before</span>
                <strong>{{ item.beforeBalance ?? "Snapshot not recorded" }}</strong>
              </div>
              <div>
                <span>After</span>
                <strong>{{ item.afterBalance ?? "Snapshot not recorded" }}</strong>
              </div>
              <time>{{ formatDateTime(item.date) }}</time>
            </article>
          </div>
        </section>

        <section v-else class="admin-panel balance-audit-empty">
          <h2>{{ isLoadingBalanceAudit ? "Loading audit..." : "Select a user to begin" }}</h2>
          <p>Use the search box above to open a complete account audit for any registered user.</p>
        </section>
      </section>

      <section v-else-if="activeTab === 'Leaders'" class="admin-view-stack leaders-admin-view">
        <section class="admin-metrics leader-admin-metrics">
          <article v-for="card in leaderCards" :key="card.label" class="admin-metric-card is-green">
            <div>
              <p>{{ card.label }}</p>
              <strong>{{ card.value }}</strong>
              <span>{{ card.note }}</span>
            </div>
            <i aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM5 6H3v2a3 3 0 0 0 3 3h1M19 6h2v2a3 3 0 0 1-3 3h-1" /></svg>
            </i>
          </article>
        </section>

        <section class="admin-panel leaders-panel">
          <div class="admin-panel-head">
            <div>
              <h2>Leader Performance</h2>
              <p>Rank progress, deposits, qualification status, and reward controls</p>
            </div>
          </div>

          <div class="leader-admin-list">
            <article v-for="leader in leaders" :key="leader.userId" class="leader-admin-card">
              <div class="leader-admin-head">
                <div class="admin-user-mini">{{ leader.username.charAt(0).toUpperCase() }}</div>
                <div>
                  <strong>{{ leader.username }}</strong>
                  <span>{{ leader.userId }} · {{ leader.email }}</span>
                </div>
                <b :class="{ qualified: leader.isQualified }">{{ leader.rankName }}</b>
              </div>

              <div class="leader-admin-grid">
                <div>
                  <span>Active L1</span>
                  <strong>{{ leader.activeLevelOneMembers }}</strong>
                </div>
                <div>
                  <span>L1 Deposit</span>
                  <strong>{{ money(leader.levelOneDeposit) }}</strong>
                </div>
                <div>
                  <span>L2 + L3 Deposit</span>
                  <strong>{{ money(leader.levelTwoThreeDeposit) }}</strong>
                </div>
                <div>
                  <span>Granted</span>
                  <strong>{{ money(leader.totalGranted) }}</strong>
                </div>
              </div>

              <div class="leader-admin-progress">
                <span>Next: {{ leader.nextRankName || "Maximum rank" }}</span>
                <small>{{ leader.membersNeeded }} members · {{ money(leader.levelOneDepositNeeded) }} L1 deposit needed</small>
              </div>

              <div class="leader-admin-actions">
                <button
                  type="button"
                  :disabled="!leader.isQualified || rewardLoadingId === `${leader.userId}-one_time`"
                  @click="grantLeaderReward(leader, 'one_time', Number(leader.oneTimeReward || 0))"
                >
                  Grant One-time {{ money(leader.oneTimeReward) }}
                </button>
                <button
                  type="button"
                  :disabled="!leader.isQualified || rewardLoadingId === `${leader.userId}-weekly`"
                  @click="grantLeaderReward(leader, 'weekly', Number(leader.weeklySalary || 0))"
                >
                  Grant Weekly {{ money(leader.weeklySalary) }}
                </button>
              </div>
            </article>
          </div>
        </section>

        <section class="admin-panel admin-table-panel">
          <div class="admin-panel-head">
            <div>
              <h2>Reward Audit</h2>
              <p>Recently granted leadership rewards</p>
            </div>
          </div>
          <div class="admin-table-scroll">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>User</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Granted By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(reward, index) in leaderRewards" :key="reward.id">
                  <td>{{ index + 1 }}</td>
                  <td>{{ reward.username }}</td>
                  <td>{{ reward.rewardType }}</td>
                  <td>{{ money(reward.amount) }}</td>
                  <td>{{ reward.grantedBy || "System" }}</td>
                  <td>{{ formatDate(reward.grantedAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <section v-else class="admin-panel admin-empty-state">
        <h2>{{ activeTab }}</h2>
        <p>This management section is ready for its next workflow.</p>
      </section>

      <div v-if="isLoading" class="admin-loading">Loading admin data...</div>

      <div v-if="previewDocument" class="kyc-preview-modal" role="dialog" aria-modal="true">
        <div class="kyc-preview-card">
          <div class="kyc-preview-head">
            <div>
              <span>{{ previewDocument.username }} · {{ previewDocument.userId }}</span>
              <strong>{{ previewDocument.label }}</strong>
            </div>
            <button type="button" aria-label="Close preview" @click="previewDocument = null">×</button>
          </div>
          <img :src="previewDocument.image" :alt="previewDocument.label" />
        </div>
      </div>

      <div v-if="rejectingKyc" class="kyc-preview-modal" role="dialog" aria-modal="true">
        <div class="kyc-reject-card">
          <div class="kyc-preview-head">
            <div>
              <span>{{ rejectingKyc.username }} · {{ rejectingKyc.userId }}</span>
              <strong>Reject KYC</strong>
            </div>
            <button type="button" aria-label="Close rejection form" @click="rejectingKyc = null">×</button>
          </div>
          <label>
            <span>Reason for rejection</span>
            <textarea v-model.trim="rejectionNote" rows="5" placeholder="Explain what the user must fix"></textarea>
          </label>
          <div class="kyc-reject-actions">
            <button type="button" @click="rejectingKyc = null">Cancel</button>
            <button
              type="button"
              :disabled="kycReviewId === `${rejectingKyc.id}-rejected`"
              @click="submitKycRejection"
            >
              {{ kycReviewId === `${rejectingKyc.id}-rejected` ? "Rejecting..." : "Reject KYC" }}
            </button>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
