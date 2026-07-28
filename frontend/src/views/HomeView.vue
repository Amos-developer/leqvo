<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getPopularCrypto, getUserById } from "../utils/api";
import { createBinanceMarketSocket, createInitialBinanceMarkets } from "../utils/binanceMarketSocket";

const router = useRouter();
const storedUser = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const user = ref(storedUser);
const isLoadingUser = ref(false);
const userError = ref("");
const cryptoMarkets = ref(createInitialBinanceMarkets());
const isLoadingMarkets = ref(true);
const marketError = ref("");
const marketSocketStatus = ref("Connecting to Binance live");
const activeMarketTab = ref("all");
const cryptoSearch = ref("");
let marketSocket = null;

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

const formatPrice = (price) => {
  return Number(price || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: price < 1 ? 6 : 2
  });
};

const formatChange = (change) => {
  const value = Number(change || 0);
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
};

const filteredMarkets = computed(() => {
  const search = cryptoSearch.value.trim().toLowerCase();

  return cryptoMarkets.value.filter((coin) => {
    const matchesSearch =
      !search ||
      coin.name.toLowerCase().includes(search) ||
      coin.symbol.toLowerCase().includes(search);

    const matchesTab =
      activeMarketTab.value === "all" ||
      (activeMarketTab.value === "gainers" && coin.change24h >= 0) ||
      (activeMarketTab.value === "losers" && coin.change24h < 0);

    return matchesSearch && matchesTab;
  });
});

const getTradeRoute = (coin) => {
  return {
    name: "trades",
    query: { pair: coin.pair || `${coin.symbol}USDT` }
  };
};

const fetchMarkets = async () => {
  marketError.value = "";

  try {
    const result = await getPopularCrypto();
    cryptoMarkets.value = result.data.map((coin) => ({
      ...coin,
      pair: `${coin.symbol}USDT`,
      lastUpdated: new Date().toISOString()
    }));
  } catch (error) {
    marketError.value = "Could not load backup market prices";
  } finally {
    isLoadingMarkets.value = false;
  }
};

const startMarketStream = () => {
  marketSocket = createBinanceMarketSocket({
    onOpen: () => {
      marketSocketStatus.value = "See More";
      marketError.value = "";
    },
    onUpdate: (updatedMarket) => {
      cryptoMarkets.value = cryptoMarkets.value.map((market) => {
        return market.pair === updatedMarket.pair ? updatedMarket : market;
      });
      isLoadingMarkets.value = false;
    },
    onError: () => {
      marketSocketStatus.value = "Backup prices";
      marketError.value = "Binance live stream is unavailable on this network";
      fetchMarkets();
    },
    onClose: () => {
      if (marketSocketStatus.value === "Binance live") {
        marketSocketStatus.value = "Reconnecting...";
      }
    }
  });
};

const handleLogout = () => {
  localStorage.removeItem("leqvoUser");
  router.push("/login");
};

onMounted(() => {
  refreshUser();
  startMarketStream();
});

onUnmounted(() => {
  marketSocket?.close();
});
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
        <RouterLink to="/deposit"><span class="action-icon pink"><i class="line-icon icon-deposit"></i></span>Deposit</RouterLink>
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
        <RouterLink to="/markets">{{ marketSocketStatus }}</RouterLink>
      </div>
      <div class="search-row">
        <label>
          <span class="icon-search"></span>
          <input v-model="cryptoSearch" type="search" placeholder="Search crypto..." />
        </label>
        <button class="filter-button" aria-label="Filter"><span class="icon-filter"></span></button>
      </div>
      <div class="tabs">
        <button :class="{ active: activeMarketTab === 'all' }" @click="activeMarketTab = 'all'">All</button>
        <button :class="{ active: activeMarketTab === 'gainers' }" @click="activeMarketTab = 'gainers'">
          <span class="dot green"></span>Gainers
        </button>
        <button :class="{ active: activeMarketTab === 'losers' }" @click="activeMarketTab = 'losers'">
          <span class="dot pink-dot"></span>Losers
        </button>
      </div>
      <div class="crypto-list">
        <article v-if="isLoadingMarkets" class="market-state">
          <strong>Loading live markets...</strong>
        </article>
        <article v-else-if="marketError" class="market-state">
          <strong>{{ marketError }}</strong>
          <button @click="fetchMarkets">Retry</button>
        </article>
        <article v-else-if="!filteredMarkets.length" class="market-state">
          <strong>No crypto found</strong>
        </article>
        <template v-else>
          <RouterLink v-for="coin in filteredMarkets" :key="coin.id" :to="getTradeRoute(coin)" class="crypto-trade-link">
            <img class="crypto-logo" :src="coin.image" :alt="coin.name" />
            <div>
              <strong>{{ coin.name }}</strong>
              <p>{{ coin.symbol }} / USDT - Rank #{{ coin.marketCapRank }}</p>
            </div>
            <div class="crypto-price">
              <strong>{{ formatPrice(coin.price) }}</strong>
              <span class="market-change" :class="coin.change24h >= 0 ? 'up' : 'down'">
                {{ formatChange(coin.change24h) }}
              </span>
            </div>
          </RouterLink>
        </template>
      </div>
    </section>
  </section>
</template>
