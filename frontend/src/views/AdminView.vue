<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  getAdminDeposits,
  getAdminOverview,
  getAdminUsers,
  getAdminWithdrawals
} from "../utils/api";

const router = useRouter();
const admin = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const activeTab = ref("Overview");
const isLoading = ref(true);
const errorMessage = ref("");
const overview = ref(null);
const users = ref([]);
const deposits = ref([]);
const withdrawals = ref([]);

const menuItems = [
  "Overview",
  "Users",
  "Deposits",
  "Withdrawals",
  "KYC",
  "Copy Signals",
  "Telegram Signals",
  "Balance Tracking",
  "Refund Audit",
  "Leaders"
];

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
      value: 0,
      note: "Verification module pending",
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

const loadAdminData = async () => {
  isLoading.value = true;
  errorMessage.value = "";

  try {
    const [overviewResult, usersResult, depositsResult, withdrawalsResult] = await Promise.all([
      getAdminOverview(),
      getAdminUsers(),
      getAdminDeposits(),
      getAdminWithdrawals()
    ]);

    overview.value = overviewResult.data;
    users.value = usersResult.data;
    deposits.value = depositsResult.data;
    withdrawals.value = withdrawalsResult.data;
  } catch (error) {
    errorMessage.value = error.message;
  } finally {
    isLoading.value = false;
  }
};

const handleLogout = () => {
  localStorage.removeItem("leqvoUser");
  router.push("/login");
};

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
          @click="activeTab = item"
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
          v-for="item in menuItems.slice(0, 5)"
          :key="item"
          type="button"
          :class="{ active: item === activeTab }"
          @click="activeTab = item"
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
            <button type="button" @click="activeTab = 'Users'">Review Users</button>
            <button type="button" @click="activeTab = 'Withdrawals'">Open Queue</button>
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
              <button type="button" @click="activeTab = 'Deposits'">View All</button>
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

      <section v-else-if="activeTab === 'Users'" class="admin-panel admin-table-panel">
        <div class="admin-panel-head">
          <div>
            <h2>Manage Users</h2>
            <p>All registered users from the database</p>
          </div>
        </div>

        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>ID</th>
                <th>Balance</th>
                <th>Referral</th>
                <th>Role</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>
                  <strong>{{ user.username }}</strong>
                  <span>{{ user.email }}</span>
                </td>
                <td>{{ user.id }}</td>
                <td>{{ money(user.balance) }}</td>
                <td>{{ user.referralCode }}</td>
                <td>{{ user.isAdmin ? "Admin" : "Member" }}</td>
                <td>{{ formatDate(user.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-else-if="activeTab === 'Deposits'" class="admin-panel admin-table-panel">
        <div class="admin-panel-head">
          <div>
            <h2>Deposits</h2>
            <p>Deposit payments stored in PostgreSQL</p>
          </div>
        </div>

        <div class="admin-table-scroll">
          <table class="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Currency</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="deposit in deposits" :key="deposit.id">
                <td>{{ deposit.username }}</td>
                <td>{{ money(deposit.priceAmount) }}</td>
                <td>{{ money(deposit.actuallyPaid) }}</td>
                <td>{{ deposit.payCurrency }} / {{ deposit.payNetwork }}</td>
                <td>{{ deposit.status }}</td>
                <td>{{ formatDate(deposit.createdAt) }}</td>
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
                <th>User</th>
                <th>Amount</th>
                <th>Fee</th>
                <th>Asset</th>
                <th>Status</th>
                <th>Requested</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="withdrawal in withdrawals" :key="withdrawal.id">
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

      <section v-else class="admin-panel admin-empty-state">
        <h2>{{ activeTab }}</h2>
        <p>This management section is ready for its next workflow.</p>
      </section>

      <div v-if="isLoading" class="admin-loading">Loading admin data...</div>
    </section>
  </main>
</template>
