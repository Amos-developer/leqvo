<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const admin = JSON.parse(localStorage.getItem("leqvoUser") || "{}");

const menuItems = [
  "Overview",
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
  { label: "Users", value: "1,248", note: "24 joined today", tone: "pink" },
  { label: "Deposits", value: "42,846.58 USDT", note: "18 awaiting confirmation", tone: "blue" },
  { label: "Withdrawals", value: "9,630.44 USDT", note: "7 pending review", tone: "green" },
  { label: "KYC Queue", value: "12", note: "1,236 verified accounts", tone: "amber" }
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
  { name: "Amos", email: "amos@example.com", id: "LEQ-482917", joined: "Today" },
  { name: "Sabir", email: "sabir@example.com", id: "LEQ-639204", joined: "Today" },
  { name: "Mariam", email: "mariam@example.com", id: "LEQ-104825", joined: "Yesterday" }
];

const reviewItems = [
  { title: "Deposit confirmations", status: "18 open", accent: "blue" },
  { title: "Withdrawal approvals", status: "7 urgent", accent: "pink" },
  { title: "Verification checks", status: "12 waiting", accent: "amber" }
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
          :class="{ active: item === 'Overview' }"
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
          <h1>Overview</h1>
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
              <small>Operator</small>
            </div>
          </button>
        </div>
      </header>

      <nav class="admin-mobile-nav" aria-label="Admin shortcuts">
        <button v-for="item in menuItems.slice(0, 6)" :key="item" type="button" :class="{ active: item === 'Overview' }">
          {{ item }}
        </button>
      </nav>

      <section class="admin-foundation">
        <div>
          <p>Live Control</p>
          <h2>Keep Leqvo operations moving with one clear command center.</h2>
          <span>Review user activity, payment queues, platform balances, and verification flow from a secure workspace built for fast decisions.</span>
        </div>
        <div class="admin-hero-actions">
          <button type="button">Review Users</button>
          <button type="button">Open Queue</button>
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

        <article class="admin-panel admin-users-panel">
          <div class="admin-panel-head">
            <div>
              <h2>Recently Joined</h2>
              <p>Latest user accounts created on Leqvo</p>
            </div>
          </div>

          <div class="admin-user-list">
            <div v-for="user in balances" :key="user.id" class="admin-user-row">
              <div class="admin-user-mini">{{ user.name.charAt(0) }}</div>
              <div>
                <strong>{{ user.name }}</strong>
                <span>{{ user.email }}</span>
              </div>
              <b>{{ user.joined }}</b>
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
  </main>
</template>
