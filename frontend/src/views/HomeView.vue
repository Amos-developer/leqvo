<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
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
    <!-- <div class="app-toolbar">
      <button class="icon-button" aria-label="Menu"><span class="icon-menu"></span></button>
      <button class="icon-button logout-button" aria-label="Logout" @click="handleLogout">
        <span class="icon-logout"></span>
      </button>
    </div> -->

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

    <section class="quick-link-section" aria-labelledby="quick-link-heading">
      <h2 id="quick-link-heading">Quick link</h2>
      <div class="quick-actions">
        <button><span class="action-icon pink"><i class="line-icon icon-deposit"></i></span>Deposit</button>
        <button><span class="action-icon green"><i class="line-icon icon-withdrawal"></i></span>Withdrawal</button>
        <button><span class="action-icon amber"><i class="line-icon icon-invite"></i></span>Invite</button>
        <button><span class="action-icon blue"><i class="line-icon icon-team"></i></span>Team</button>
        <button><span class="action-icon violet"><i class="line-icon icon-box"></i></span>Lucky-box</button>
        <button><span class="action-icon teal"><i class="line-icon icon-leadership"></i></span>Leadership</button>
        <button><span class="action-icon rose"><i class="line-icon icon-rewards"></i></span>Rewards</button>
        <button><span class="action-icon indigo"><i class="line-icon icon-spin"></i></span>Daily-spin</button>
      </div>
    </section>

    <!-- <section class="summary-grid">
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
    </section> -->

    <section class="transactions">
      <div class="section-heading">
        <h2>Popular Crypto</h2>
        <RouterLink to="/markets">See all</RouterLink>
      </div>
      <div class="search-row">
        <label>
          <span class="icon-search"></span>
          <input type="search" placeholder="Search crypto..." />
        </label>
        <button class="filter-button" aria-label="Filter"><span class="icon-filter"></span></button>
      </div>
      <div class="tabs">
        <button class="active">All</button>
        <button><span class="dot green"></span>Gainers</button>
        <button><span class="dot pink-dot"></span>Losers</button>
      </div>
      <div class="crypto-list">
        <article>
          <span class="crypto-icon btc">BTC</span>
          <div>
            <strong>Bitcoin</strong>
            <p>BTC / USDT</p>
          </div>
          <div class="crypto-price">
            <strong>$67,420.00</strong>
            <span class="market-change up">+2.41%</span>
          </div>
        </article>
        <article>
          <span class="crypto-icon eth">ETH</span>
          <div>
            <strong>Ethereum</strong>
            <p>ETH / USDT</p>
          </div>
          <div class="crypto-price">
            <strong>$3,520.18</strong>
            <span class="market-change up">+1.18%</span>
          </div>
        </article>
        <article>
          <span class="crypto-icon bnb">BNB</span>
          <div>
            <strong>BNB</strong>
            <p>BNB / USDT</p>
          </div>
          <div class="crypto-price">
            <strong>$612.40</strong>
            <span class="market-change down">-0.64%</span>
          </div>
        </article>
        <article>
          <span class="crypto-icon sol">SOL</span>
          <div>
            <strong>Solana</strong>
            <p>SOL / USDT</p>
          </div>
          <div class="crypto-price">
            <strong>$148.72</strong>
            <span class="market-change up">+4.08%</span>
          </div>
        </article>
        <article>
          <span class="crypto-icon xrp">XRP</span>
          <div>
            <strong>XRP</strong>
            <p>XRP / USDT</p>
          </div>
          <div class="crypto-price">
            <strong>$0.58</strong>
            <span class="market-change down">-1.22%</span>
          </div>
        </article>
      </div>
    </section>
  </section>
</template>
