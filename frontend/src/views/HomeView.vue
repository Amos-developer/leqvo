<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BottomNavigation from "../components/BottomNavigation.vue";
import { getUserById } from "../utils/api";

const router = useRouter();
const storedUser = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const user = ref(storedUser);
const isLoadingUser = ref(false);
const userError = ref("");

const username = computed(() => user.value.username || "Member");
const balance = computed(() => {
  const userBalance = Number(user.value.balance || 0);

  return userBalance.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
});

const refreshUser = async () => {
  if (!storedUser.id) {
    handleLogout();
    return;
  }

  isLoadingUser.value = true;
  userError.value = "";

  try {
    const result = await getUserById(storedUser.id);

    user.value = result.data;
    localStorage.setItem("leqvoUser", JSON.stringify(result.data));
  } catch (error) {
    userError.value = "Could not refresh account details";
  } finally {
    isLoadingUser.value = false;
  }
};

const handleLogout = () => {
  localStorage.removeItem("leqvoUser");
  router.push("/login");
};

onMounted(refreshUser);
</script>

<template>
  <section class="phone-shell page-enter">
    <div class="app-toolbar">
      <button class="icon-button" aria-label="Menu"><span class="icon-menu"></span></button>
      <button class="icon-button logout-button" aria-label="Logout" @click="handleLogout">
        <span class="icon-logout"></span>
      </button>
    </div>

    <section class="balance-card">
      <div class="balance-copy">
        <h1>Hi {{ username }} <span>Waving</span></h1>
        <p>Welcome back to your account</p>
        <span class="muted-label">Total Balance</span>
        <strong>{{ isLoadingUser ? "Loading..." : balance }}</strong>
        <span class="account-id">ID: {{ user.id }}</span>
        <span v-if="userError" class="account-id error">{{ userError }}</span>
      </div>
      <div class="hero-asset" aria-hidden="true">
        <div class="sparkle one"></div>
        <div class="sparkle two"></div>
        <div class="money-bag"><span>$</span></div>
        <div class="coin-stack"><i></i><i></i><i></i></div>
        <div class="piggy"></div>
      </div>
    </section>

    <section class="quick-actions" aria-label="Quick actions">
      <button><span class="action-icon pink">&uarr;</span>Send</button>
      <button><span class="action-icon green">&darr;</span>Receive</button>
      <button><span class="action-icon amber">$</span>Loan</button>
      <button><span class="action-icon blue">+</span>Top Up</button>
    </section>

    <section class="summary-grid">
      <article class="summary-card income">
        <span class="mini-icon"></span>
        <p>Income</p>
        <strong>+$2,450.00</strong>
        <div class="sparkline"></div>
      </article>
      <article class="summary-card expense">
        <span class="mini-icon"></span>
        <p>Expense</p>
        <strong>-$930.00</strong>
        <div class="sparkline"></div>
      </article>
      <article class="summary-card savings">
        <span class="mini-icon"></span>
        <p>Savings</p>
        <strong>{{ isLoadingUser ? "Loading..." : balance }}</strong>
        <div class="sparkline"></div>
      </article>
    </section>

    <section class="transactions">
      <div class="section-heading">
        <h2>Recent Transaction</h2>
        <a href="#">See all</a>
      </div>
      <div class="search-row">
        <label>
          <span class="icon-search"></span>
          <input type="search" placeholder="Search transactions..." />
        </label>
        <button class="filter-button" aria-label="Filter"><span class="icon-filter"></span></button>
      </div>
      <div class="tabs">
        <button class="active">All</button>
        <button><span class="dot green"></span>Income</button>
        <button><span class="dot pink-dot"></span>Expense</button>
      </div>
      <div class="transaction-list">
        <article>
          <span class="transaction-icon up">&uarr;</span>
          <div>
            <strong>Signal profit</strong>
            <p>Today, 9:24 AM</p>
          </div>
          <b>+$420.00</b>
        </article>
        <article>
          <span class="transaction-icon down">&darr;</span>
          <div>
            <strong>Wallet top up</strong>
            <p>Yesterday, 4:18 PM</p>
          </div>
          <b>+$180.00</b>
        </article>
      </div>
    </section>

    <BottomNavigation active-item="home" />
  </section>
</template>
