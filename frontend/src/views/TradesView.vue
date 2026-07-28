<script setup>
import { computed, onMounted, onUnmounted, ref } from "vue";
import { createBinanceMarketSocket, createInitialBinanceMarkets } from "../utils/binanceMarketSocket";

const storedUser = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const userBalance = ref(Number(storedUser.balance || 0));
const markets = ref(createInitialBinanceMarkets());
const selectedSymbol = ref("BTC");
const signalCode = ref("");
const selectedPercent = ref(20);
const tradeStatus = ref("");
const tradeError = ref("");
let marketSocket = null;

const percentages = [20, 40, 50, 60, 100];

const selectedMarket = computed(() => {
  return markets.value.find((market) => market.symbol === selectedSymbol.value) || markets.value[0];
});

const investmentAmount = computed(() => {
  return (userBalance.value * selectedPercent.value) / 100;
});

const formatCurrency = (value, compact = false) => {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: value < 1 ? 6 : 2
  });
};

const formatChange = (value) => {
  const numberValue = Number(value || 0);
  const sign = numberValue > 0 ? "+" : "";

  return `${sign}${numberValue.toFixed(2)}%`;
};

const candles = computed(() => {
  const change = Number(selectedMarket.value?.change24h || 0);

  return Array.from({ length: 28 }, (_, index) => {
    const wave = Math.sin(index * 0.78) * 18;
    const pulse = Math.cos(index * 0.42 + change) * 11;
    const height = Math.max(22, Math.min(92, 54 + wave + pulse + change * 1.6));
    const isUp = index % 3 !== 0 || change >= 0;

    return { height, isUp };
  });
});

const completeTrade = () => {
  tradeError.value = "";
  tradeStatus.value = "";

  if (!signalCode.value.trim()) {
    tradeError.value = "Enter your signal code to continue.";
    return;
  }

  if (investmentAmount.value <= 0) {
    tradeError.value = "Your available investment balance is too low.";
    return;
  }

  tradeStatus.value = `${selectedMarket.value.symbol}/USDT trade submitted with ${selectedPercent.value}% allocation.`;
};

const startMarketStream = () => {
  marketSocket = createBinanceMarketSocket({
    onUpdate: (updatedMarket) => {
      markets.value = markets.value.map((market) => {
        return market.pair === updatedMarket.pair ? updatedMarket : market;
      });
    }
  });
};

onMounted(startMarketStream);

onUnmounted(() => {
  marketSocket?.close();
});
</script>

<template>
  <section class="phone-shell page-enter app-page trade-page">
    <header class="trade-header">
      <div>
        <p>Spot signal</p>
        <h1>Trades</h1>
      </div>
      <div class="trade-badge">USDT</div>
    </header>

    <section class="trade-market-card">
      <div class="trade-market-top">
        <div>
          <span>{{ selectedMarket.symbol }}/USDT</span>
          <strong>{{ formatCurrency(selectedMarket.price) }}</strong>
        </div>
        <div class="trade-change" :class="selectedMarket.change24h >= 0 ? 'up' : 'down'">
          {{ formatChange(selectedMarket.change24h) }}
        </div>
      </div>

      <div class="trade-pair-strip" aria-label="Select market pair">
        <button
          v-for="market in markets.slice(0, 5)"
          :key="market.id"
          :class="{ active: selectedSymbol === market.symbol }"
          @click="selectedSymbol = market.symbol"
        >
          {{ market.symbol }}
        </button>
      </div>

      <div class="trade-chart" aria-label="Live chart preview">
        <div class="chart-grid"></div>
        <div class="chart-line"></div>
        <div class="candle-row">
          <span
            v-for="(candle, index) in candles"
            :key="index"
            :class="candle.isUp ? 'up' : 'down'"
            :style="{ height: `${candle.height}%` }"
          ></span>
        </div>
      </div>

      <div class="trade-stats">
        <div>
          <span>24h High</span>
          <strong>{{ formatCurrency(selectedMarket.high24h) }}</strong>
        </div>
        <div>
          <span>24h Low</span>
          <strong>{{ formatCurrency(selectedMarket.low24h) }}</strong>
        </div>
        <div>
          <span>Volume</span>
          <strong>{{ formatCurrency(selectedMarket.volume24h, true) }}</strong>
        </div>
      </div>
    </section>

    <section class="trade-ticket">
      <div class="ticket-heading">
        <div>
          <p>Signal entry</p>
          <h2>Complete Trade</h2>
        </div>
        <span>{{ selectedPercent }}%</span>
      </div>

      <label class="trade-field">
        <span>Signal Code</span>
        <input v-model.trim="signalCode" type="text" placeholder="Enter provided signal code" />
      </label>

      <div class="allocation-panel">
        <div class="allocation-copy">
          <span>Available investment</span>
          <strong>{{ formatCurrency(userBalance) }}</strong>
        </div>
        <div class="allocation-copy right">
          <span>Trade amount</span>
          <strong>{{ formatCurrency(investmentAmount) }}</strong>
        </div>
      </div>

      <div class="percent-grid" aria-label="Select investment percentage">
        <button
          v-for="percent in percentages"
          :key="percent"
          :class="{ active: selectedPercent === percent }"
          @click="selectedPercent = percent"
        >
          {{ percent }}%
        </button>
      </div>

      <button class="complete-trade-button" @click="completeTrade">Complete Trade</button>

      <p v-if="tradeError" class="trade-message error">{{ tradeError }}</p>
      <p v-if="tradeStatus" class="trade-message success">{{ tradeStatus }}</p>
    </section>
  </section>
</template>
