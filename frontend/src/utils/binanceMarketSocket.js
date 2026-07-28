const BINANCE_STREAM_URL = "wss://stream.binance.com:9443/stream";

export const BINANCE_MARKETS = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    pair: "BTCUSDT",
    stream: "btcusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400",
    marketCapRank: 1
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    pair: "ETHUSDT",
    stream: "ethusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628",
    marketCapRank: 2
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    pair: "BNBUSDT",
    stream: "bnbusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1696501970",
    marketCapRank: 4
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    pair: "SOLUSDT",
    stream: "solusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756",
    marketCapRank: 6
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    pair: "XRPUSDT",
    stream: "xrpusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442",
    marketCapRank: 7
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    pair: "ADAUSDT",
    stream: "adausdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/975/large/cardano.png?1696502090",
    marketCapRank: 10
  },
  {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    pair: "DOGEUSDT",
    stream: "dogeusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409",
    marketCapRank: 11
  },
  {
    id: "tron",
    symbol: "TRX",
    name: "TRON",
    pair: "TRXUSDT",
    stream: "trxusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png?1696502193",
    marketCapRank: 12
  }
];

export const createInitialBinanceMarkets = () => {
  return BINANCE_MARKETS.map((market) => ({
    ...market,
    price: 0,
    change24h: 0,
    volume24h: 0,
    high24h: 0,
    low24h: 0,
    lastUpdated: null
  }));
};

export const createBinanceMarketSocket = ({ onUpdate, onOpen, onError, onClose }) => {
  const streams = BINANCE_MARKETS.map((market) => market.stream).join("/");
  const socket = new WebSocket(`${BINANCE_STREAM_URL}?streams=${streams}`);

  socket.addEventListener("open", () => {
    onOpen?.();
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const ticker = message.data;
    const market = BINANCE_MARKETS.find((item) => item.pair === ticker.s);

    if (!market) {
      return;
    }

    onUpdate?.({
      ...market,
      price: Number(ticker.c),
      change24h: Number(ticker.P),
      volume24h: Number(ticker.q),
      high24h: Number(ticker.h),
      low24h: Number(ticker.l),
      lastUpdated: new Date(ticker.E).toISOString()
    });
  });

  socket.addEventListener("error", () => {
    onError?.();
  });

  socket.addEventListener("close", () => {
    onClose?.();
  });

  return socket;
};
