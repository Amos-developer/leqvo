<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const admin = JSON.parse(localStorage.getItem("leqvoUser") || "{}");

const menuItems = [
  "Dashboard",
  "Copy Signals",
  "Telegram Signals",
  "Users",
  "Balance Tracking",
  "Refund Audit",
  "Leaders",
  "Demo Users",
  "Deposits",
  "Withdrawals",
  "KYC"
];

const stats = [
  { label: "Total Users", value: "1,248", note: "24 joined today", tone: "pink" },
  { label: "Total Deposit", value: "42,846.58 USDT", note: "18 awaiting confirmation", tone: "blue" },
  { label: "Total Withdraw", value: "9,630.44 USDT", note: "7 pending review", tone: "green" },
  { label: "Pending KYC", value: "12", note: "1,236 verified accounts", tone: "amber" }
];

const volumeBars = [
  { day: "Thu", value: "665.20", height: 64 },
  { day: "Fri", value: "200.00", height: 24 },
  { day: "Sat", value: "700.09", height: 68 },
  { day: "Sun", value: "802.09", height: 82 },
  { day: "Mon", value: "120.00", height: 15 },
  { day: "Tue", value: "200.00", height: 24 },
  { day: "Wed", value: "400.99", height: 48 }
];

const balances = [
  { asset: "USDT", note: "Available balance", amount: "36,794.14" },
  { asset: "USDC", note: "Settlement balance", amount: "8,210.00" },
  { asset: "BNB", note: "Network reserve", amount: "42.36" }
];

const adminName = computed(() => admin.username || "Administrator");
const nowLabel = computed(() => {
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date());
});

const handleLogout = () => {
  localStorage.removeItem("leqvoUser");
  router.push("/login");
};
</script>

<template>
  <main class="admin-shell page-enter">
    <aside class="admin-sidebar">
      <div class="admin-brand-row">
        <div class="admin-brand-mark">LQ</div>
        <div>
          <strong>Leqvo Admin</strong>
          <span>Control Panel</span>
        </div>
      </div>

      <nav class="admin-nav" aria-label="Admin management">
        <p>Management</p>
        <button
          v-for="item in menuItems"
          :key="item"
          type="button"
          :class="{ active: item === 'Dashboard' }"
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
          <p>Admin Workspace</p>
          <h1>Dashboard</h1>
        </div>

        <div class="admin-top-actions">
          <div class="admin-clock">
            <span aria-hidden="true"></span>
            <div>
              <strong>17:17:48</strong>
              <small>{{ nowLabel }} · UTC</small>
            </div>
          </div>
          <button class="admin-user-chip" type="button" @click="handleLogout">
            <span>{{ adminName.charAt(0).toUpperCase() }}</span>
            <div>
              <strong>{{ adminName }}</strong>
              <small>Administrator</small>
            </div>
          </button>
        </div>
      </header>

      <nav class="admin-mobile-nav" aria-label="Admin shortcuts">
        <button v-for="item in menuItems.slice(0, 6)" :key="item" type="button" :class="{ active: item === 'Dashboard' }">
          {{ item }}
        </button>
      </nav>

      <section class="admin-foundation">
        <div>
          <p>Admin Foundation</p>
          <h2>Leqvo admin workspace is live.</h2>
          <span>Monitor accounts, deposits, withdrawals, verification activity, platform balances, and system operations from one secure control panel.</span>
        </div>
        <div class="admin-hero-actions">
          <button type="button">Review Users</button>
          <button type="button">Review Withdrawals</button>
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
            <button type="button">View All</button>
          </div>

          <div class="admin-chart-bars">
            <div v-for="bar in volumeBars" :key="bar.day" class="admin-chart-column">
              <span>{{ bar.value }}</span>
              <i :style="{ height: `${bar.height}%` }"></i>
              <strong>{{ bar.day }}</strong>
            </div>
          </div>
        </article>

        <article class="admin-panel admin-balance-panel">
          <div class="admin-panel-head">
            <div>
              <h2>Platform Balances</h2>
              <p>Available user funds grouped by asset</p>
            </div>
          </div>

          <div class="admin-balance-list">
            <div v-for="balance in balances" :key="balance.asset" class="admin-balance-row">
              <div class="admin-asset-icon">{{ balance.asset.charAt(0) }}</div>
              <div>
                <strong>{{ balance.asset }}</strong>
                <span>{{ balance.note }}</span>
              </div>
              <b>{{ balance.amount }}</b>
            </div>
          </div>
        </article>
      </section>
    </section>
  </main>
</template>
