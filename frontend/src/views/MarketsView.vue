<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { getPopularCrypto } from "../utils/api";
import { createBinanceMarketSocket, createInitialBinanceMarkets } from "../utils/binanceMarketSocket";

const markets = ref(createInitialBinanceMarkets());
const isLoading = ref(true);
const errorMessage = ref("");
const socketStatus = ref("Connecting to Binance");
const search = ref("");
const activeFilter = ref("all");
let marketSocket = null;

const filters = [
  { label: "All", value: "all" },
  { label: "Gainers", value: "gainers" },
  { label: "Losers", value: "losers" },
  { label: "Top", value: "top" }
];

const formatPrice = (price) => {
  return Number(price || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: price < 1 ? 6 : 2
  });
};

const formatVolume = (volume) => {
  const value = Number(volume || 0);

  if (value >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`;
  }

  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }

  return formatPrice(value);
};

const formatChange = (change) => {
  const value = Number(change || 0);
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
};

const filteredMarkets = computed(() => {
  const term = search.value.trim().toLowerCase();

  return markets.value
    .filter((coin) => {
      const matchesSearch =
        !term ||
        coin.name.toLowerCase().includes(term) ||
        coin.symbol.toLowerCase().includes(term);

      const matchesFilter =
        activeFilter.value === "all" ||
        (activeFilter.value === "gainers" && coin.change24h >= 0) ||
        (activeFilter.value === "losers" && coin.change24h < 0) ||
        (activeFilter.value === "top" && coin.marketCapRank <= 5);

      return matchesSearch && matchesFilter;
    })
    .sort((first, second) => {
      if (activeFilter.value === "gainers") {
        return second.change24h - first.change24h;
      }

      if (activeFilter.value === "losers") {
        return first.change24h - second.change24h;
      }

      return first.marketCapRank - second.marketCapRank;
    });
});

const marketLeader = computed(() => {
  return [...markets.value].sort((first, second) => second.change24h - first.change24h)[0];
});

const marketPulse = computed(() => {
  const gainers = markets.value.filter((coin) => coin.change24h >= 0).length;
  const losers = markets.value.length - gainers;

  return {
    gainers,
    losers,
    total: markets.value.length
  };
});

const getTradeRoute = (coin) => {
  return {
    name: "trade",
    query: { pair: coin.pair || `${coin.symbol}USDT` }
  };
};

const loadMarkets = async () => {
  errorMessage.value = "";

  try {
    const result = await getPopularCrypto();
    markets.value = result.data.map((coin) => ({
      ...coin,
      pair: `${coin.symbol}USDT`,
      lastUpdated: new Date().toISOString()
    }));
  } catch (error) {
    errorMessage.value = "Could not load backup market trends";
  } finally {
    isLoading.value = false;
  }
};

const startMarketStream = () => {
  marketSocket = createBinanceMarketSocket({
    onOpen: () => {
      socketStatus.value = "Binance live";
      errorMessage.value = "";
    },
    onUpdate: (updatedMarket) => {
      markets.value = markets.value.map((market) => {
        return market.pair === updatedMarket.pair ? updatedMarket : market;
      });
      isLoading.value = false;
    },
    onError: () => {
      socketStatus.value = "Backup prices";
      errorMessage.value = "Binance live stream is unavailable on this network";
      loadMarkets();
    },
    onClose: () => {
      if (socketStatus.value === "Binance live") {
        socketStatus.value = "Reconnecting...";
      }
    }
  });
};

onMounted(startMarketStream);

onUnmounted(() => {
  marketSocket?.close();
});
</script>

<template>
  <section class="phone-shell page-enter app-page markets-page">
    <header class="market-header">
      <div>
        <h1>Markets</h1>
      </div>
      <RouterLink to="/" class="market-back-button" aria-label="Go back">&larr;</RouterLink>
    </header>

    <section class="market-trend-card">
      <div class="trend-hero-main">
        <div class="trend-live-row">
          <span class="trend-live-dot"></span>
          <span>{{ socketStatus }}</span>
        </div>
        <div class="trend-coin-row">
          <img v-if="marketLeader" :src="marketLeader.image" :alt="marketLeader.name" />
          <div>
            <span>Top mover</span>
            <strong>{{ marketLeader ? marketLeader.symbol + "/USDT" : "..." }}</strong>
            <p>{{ marketLeader ? marketLeader.name : "Loading live market data" }}</p>
          </div>
        </div>
      </div>

      <div class="trend-price-panel">
        <span>Last price</span>
        <strong>{{ marketLeader ? formatPrice(marketLeader.price) : "--" }}</strong>
        <div class="trend-change" :class="marketLeader?.change24h >= 0 ? 'up' : 'down'">
          {{ marketLeader ? formatChange(marketLeader.change24h) : "--" }}
        </div>
      </div>

      <div class="trend-metric-grid">
        <div>
          <span>24h Volume</span>
          <strong>{{ marketLeader ? formatVolume(marketLeader.volume24h) : "--" }}</strong>
        </div>
        <div>
          <span>24h High</span>
          <strong>{{ marketLeader ? formatPrice(marketLeader.high24h) : "--" }}</strong>
        </div>
        <div>
          <span>24h Low</span>
          <strong>{{ marketLeader ? formatPrice(marketLeader.low24h) : "--" }}</strong>
        </div>
      </div>

      <div class="trend-footer-row">
        <div>
          <span>{{ marketPulse.gainers }} gainers</span>
          <span>{{ marketPulse.losers }} losers</span>
        </div>
        <RouterLink v-if="marketLeader" :to="getTradeRoute(marketLeader)">Trade</RouterLink>
      </div>
    </section>

    <section class="market-controls">
      <label class="market-search">
        <span class="icon-search"></span>
        <input v-model="search" type="search" placeholder="Search market" />
      </label>

      <div class="market-filter-row">
        <button
          v-for="filter in filters"
          :key="filter.value"
          :class="{ active: activeFilter === filter.value }"
          @click="activeFilter = filter.value"
        >
          {{ filter.label }}
        </button>
      </div>
    </section>

    <section class="market-list-panel">
      <div class="market-list-heading">
        <h2>Popular Crypto</h2>
        <button @click="loadMarkets">Refresh backup</button>
      </div>

      <div class="market-list">
        <article v-if="isLoading" class="market-row-state">Loading live markets...</article>
        <article v-else-if="errorMessage" class="market-row-state">
          <span>{{ errorMessage }}</span>
          <button @click="loadMarkets">Retry</button>
        </article>
        <article v-else-if="!filteredMarkets.length" class="market-row-state">No market found</article>

        <RouterLink v-for="coin in filteredMarkets" v-else :key="coin.id" :to="getTradeRoute(coin)" class="market-row">
          <img :src="coin.image" :alt="coin.name" />
          <div class="market-identity">
            <strong>{{ coin.name }}</strong>
            <span>{{ coin.symbol }}</span>
          </div>
          <div class="market-price-block">
            <strong>{{ formatPrice(coin.price) }}</strong>
            <span :class="coin.change24h >= 0 ? 'up' : 'down'">{{ formatChange(coin.change24h) }}</span>
          </div>
          <div class="market-volume">
            <span>24h Vol</span>
            <strong>{{ formatVolume(coin.volume24h) }}</strong>
          </div>
        </RouterLink>
      </div>
    </section>
  </section>
</template>
