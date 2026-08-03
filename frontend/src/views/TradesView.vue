<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { CandlestickSeries, createChart } from "lightweight-charts";
import { createBinanceKlineSocket, fetchBinanceKlines } from "../utils/binanceKlineSocket";
import { createBinanceMarketSocket, createInitialBinanceMarkets } from "../utils/binanceMarketSocket";
import { createTrade } from "../utils/api";
import { saveTradeRecord } from "../utils/tradeHistory";

const route = useRoute();
const router = useRouter();
const storedUser = JSON.parse(localStorage.getItem("leqvoUser") || "{}");
const userBalance = ref(Number(storedUser.tradingBalance || 0));
const markets = ref(createInitialBinanceMarkets());
const routePair = String(route.query.pair || "BTCUSDT").toUpperCase();
const selectedSymbol = ref(routePair.replace("USDT", "") || "BTC");
const signalCode = ref("");
const selectedPercent = ref(20);
const popupState = ref({
  visible: false,
  tone: "success",
  title: "",
  message: ""
});
const chartContainer = ref(null);
const chartError = ref("");
const isChartLoading = ref(true);
let marketSocket = null;
let chart = null;
let candleSeries = null;
let klineSocket = null;
let resizeObserver = null;

const percentages = [20, 40, 50, 60, 100];

const selectedMarket = computed(() => {
  return markets.value.find((market) => market.symbol === selectedSymbol.value) || markets.value[0];
});

const selectedPair = computed(() => {
  return selectedMarket.value?.pair || `${selectedSymbol.value}USDT`;
});

const selectedPairLabel = computed(() => {
  return selectedPair.value.replace("USDT", "/USDT");
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

const syncUserBalances = (updatedUser) => {
  userBalance.value = Number(updatedUser.tradingBalance || 0);
  localStorage.setItem("leqvoUser", JSON.stringify(updatedUser));
};

const showPopup = ({ tone, title, message }) => {
  popupState.value = {
    visible: true,
    tone,
    title,
    message
  };
};

const closePopup = () => {
  popupState.value.visible = false;
};

const completeTrade = async () => {
  if (!signalCode.value.trim()) {
    showPopup({
      tone: "error",
      title: "Signal required",
      message: "Enter the current signal code to continue."
    });
    return;
  }

  if (investmentAmount.value <= 0) {
    showPopup({
      tone: "error",
      title: "Trading balance needed",
      message: "Transfer funds to your trading account before completing a trade."
    });
    return;
  }

  const tradePayload = {
    pair: selectedPairLabel.value,
    symbol: selectedMarket.value.symbol,
    signalCode: signalCode.value.trim().toUpperCase(),
    allocationPercent: selectedPercent.value,
    amount: Number(investmentAmount.value.toFixed(2)),
    entryPrice: Number(selectedMarket.value.price || 0),
    change24h: Number(selectedMarket.value.change24h || 0)
  };

  try {
    await createTrade(tradePayload);
    saveTradeRecord(tradePayload);
  } catch (error) {
    showPopup({
      tone: "error",
      title: "Trade not accepted",
      message: error.message || "Could not complete trade."
    });
    return;
  }

  showPopup({
    tone: "success",
    title: "Trade accepted",
    message: "Your signal has been confirmed. Tap OK to view it in active trade history."
  });
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

const createTradeChart = () => {
  if (!chartContainer.value || chart) {
    return;
  }

  chart = createChart(chartContainer.value, {
    width: chartContainer.value.clientWidth,
    height: chartContainer.value.clientHeight,
    layout: {
      background: { color: "#121722" },
      textColor: "#9ca3af"
    },
    grid: {
      vertLines: { color: "rgba(255, 255, 255, 0.06)" },
      horzLines: { color: "rgba(255, 255, 255, 0.06)" }
    },
    rightPriceScale: {
      borderColor: "rgba(255, 255, 255, 0.08)"
    },
    timeScale: {
      borderColor: "rgba(255, 255, 255, 0.08)",
      timeVisible: true,
      secondsVisible: false
    },
    crosshair: {
      mode: 1
    }
  });

  candleSeries = chart.addSeries(CandlestickSeries, {
    upColor: "#0ecb81",
    downColor: "#f6465d",
    borderUpColor: "#0ecb81",
    borderDownColor: "#f6465d",
    wickUpColor: "#0ecb81",
    wickDownColor: "#f6465d"
  });

  resizeObserver = new ResizeObserver(() => {
    chart?.applyOptions({
      width: chartContainer.value.clientWidth,
      height: chartContainer.value.clientHeight
    });
  });
  resizeObserver.observe(chartContainer.value);
};

const loadRealChart = async () => {
  if (!candleSeries) {
    return;
  }

  isChartLoading.value = true;
  chartError.value = "";
  klineSocket?.close();

  try {
    const candles = await fetchBinanceKlines(selectedPair.value, "1m", 120);

    if (!candles.length) {
      throw new Error("Binance returned no candle data");
    }

    candleSeries.setData(candles);
    chart.timeScale().fitContent();

    klineSocket = createBinanceKlineSocket({
      pair: selectedPair.value,
      interval: "1m",
      onCandle: (candle) => {
        candleSeries?.update(candle);
      },
      onError: () => {
        chartError.value = "Live candles paused. Check your network.";
      }
    });
  } catch (error) {
    chartError.value = "Could not load real Binance candles.";
  } finally {
    isChartLoading.value = false;
  }
};

onMounted(async () => {
  startMarketStream();
  await nextTick();
  createTradeChart();
  loadRealChart();
});

watch(selectedPair, () => {
  loadRealChart();
});

onUnmounted(() => {
  marketSocket?.close();
  klineSocket?.close();
  resizeObserver?.disconnect();
  chart?.remove();
});
</script>

<template>
  <section class="phone-shell page-enter app-page trade-page">
    <div v-if="popupState.visible" class="trade-modal" role="dialog" aria-modal="true" aria-labelledby="trade-modal-title">
      <div class="trade-modal-card" :class="popupState.tone">
        <span class="trade-modal-pill">{{ popupState.tone === "success" ? "Success" : "Signal check" }}</span>
        <strong id="trade-modal-title">{{ popupState.title }}</strong>
        <p>{{ popupState.message }}</p>
        <button
          type="button"
          @click="
            closePopup();
            if (popupState.tone === 'success') {
              router.push({ name: 'history', query: { tab: 'active' } });
            }
          "
        >
          OK
        </button>
      </div>
    </div>

    <header class="trade-header">
      <div>
        <p>Spot signal</p>
        <h1 class="trade-pair-title">{{ selectedPairLabel }}</h1>
      </div>
      <button class="trade-back-button" type="button" aria-label="Go back" @click="router.back()">&larr;</button>
    </header>

    <section class="trade-market-card">
      <div class="trade-market-top">
        <div>
          <span>{{ selectedPairLabel }}</span>
          <strong>{{ formatCurrency(selectedMarket.price) }}</strong>
        </div>
        <div class="trade-change" :class="selectedMarket.change24h >= 0 ? 'up' : 'down'">
          {{ formatChange(selectedMarket.change24h) }}
        </div>
      </div>

      <div class="trade-chart real-chart" aria-label="Real Binance candlestick chart">
        <div ref="chartContainer" class="chart-container"></div>
        <div v-if="isChartLoading" class="chart-overlay">Loading real candles...</div>
        <div v-else-if="chartError" class="chart-overlay error">{{ chartError }}</div>
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

      <div class="trade-account-panel">
        <div>
          <span>Trading account</span>
          <strong>{{ formatCurrency(userBalance) }}</strong>
        </div>
        <div>
          <span>Selected allocation</span>
          <strong>{{ selectedPercent }}%</strong>
        </div>
      </div>

      <label class="trade-field">
        <span>Signal Code</span>
        <input v-model.trim="signalCode" type="text" placeholder="Enter signal code" />
      </label>

      <div class="allocation-panel">
        <div class="allocation-copy">
          <span>Trading balance</span>
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
    </section>
  </section>
</template>
