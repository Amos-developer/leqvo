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
  },
  {
    id: "avalanche-2",
    symbol: "AVAX",
    name: "Avalanche",
    pair: "AVAXUSDT",
    stream: "avaxusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png?1696512369",
    marketCapRank: 13
  },
  {
    id: "chainlink",
    symbol: "LINK",
    name: "Chainlink",
    pair: "LINKUSDT",
    stream: "linkusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/877/large/chainlink-new-logo.png?1696502009",
    marketCapRank: 14
  },
  {
    id: "polkadot",
    symbol: "DOT",
    name: "Polkadot",
    pair: "DOTUSDT",
    stream: "dotusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/12171/large/polkadot.png?1696512008",
    marketCapRank: 15
  },
  {
    id: "matic-network",
    symbol: "POL",
    name: "Polygon",
    pair: "POLUSDT",
    stream: "polusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/32440/large/polygon.png?1698233684",
    marketCapRank: 16
  },
  {
    id: "litecoin",
    symbol: "LTC",
    name: "Litecoin",
    pair: "LTCUSDT",
    stream: "ltcusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/2/large/litecoin.png?1696501400",
    marketCapRank: 17
  },
  {
    id: "bitcoin-cash",
    symbol: "BCH",
    name: "Bitcoin Cash",
    pair: "BCHUSDT",
    stream: "bchusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/780/large/bitcoin-cash-circle.png?1696501932",
    marketCapRank: 18
  },
  {
    id: "near",
    symbol: "NEAR",
    name: "NEAR Protocol",
    pair: "NEARUSDT",
    stream: "nearusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/10365/large/near.jpg?1696510367",
    marketCapRank: 19
  },
  {
    id: "uniswap",
    symbol: "UNI",
    name: "Uniswap",
    pair: "UNIUSDT",
    stream: "uniusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/12504/large/uniswap-logo.png?1720676669",
    marketCapRank: 20
  },
  {
    id: "aptos",
    symbol: "APT",
    name: "Aptos",
    pair: "APTUSDT",
    stream: "aptusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/26455/large/aptos_round.png?1696525528",
    marketCapRank: 21
  },
  {
    id: "arbitrum",
    symbol: "ARB",
    name: "Arbitrum",
    pair: "ARBUSDT",
    stream: "arbusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/16547/large/arb.jpg?1721358242",
    marketCapRank: 22
  },
  {
    id: "optimism",
    symbol: "OP",
    name: "Optimism",
    pair: "OPUSDT",
    stream: "opusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/25244/large/Optimism.png?1696524385",
    marketCapRank: 23
  },
  {
    id: "stellar",
    symbol: "XLM",
    name: "Stellar",
    pair: "XLMUSDT",
    stream: "xlmusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png?1696501482",
    marketCapRank: 24
  },
  {
    id: "sui",
    symbol: "SUI",
    name: "Sui",
    pair: "SUIUSDT",
    stream: "suiusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/26375/large/sui_asset.jpeg?1696525453",
    marketCapRank: 25
  },
  {
    id: "the-open-network",
    symbol: "TON",
    name: "Toncoin",
    pair: "TONUSDT",
    stream: "tonusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/17980/large/ton_symbol.png?1696517498",
    marketCapRank: 26
  },
  {
    id: "pepe",
    symbol: "PEPE",
    name: "Pepe",
    pair: "PEPEUSDT",
    stream: "pepeusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/29850/large/pepe-token.jpeg?1696528776",
    marketCapRank: 27
  },
  {
    id: "shiba-inu",
    symbol: "SHIB",
    name: "Shiba Inu",
    pair: "SHIBUSDT",
    stream: "shibusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/11939/large/shiba.png?1696511800",
    marketCapRank: 28
  },
  {
    id: "render-token",
    symbol: "RENDER",
    name: "Render",
    pair: "RENDERUSDT",
    stream: "renderusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/11636/large/rndr.png?1696511529",
    marketCapRank: 29
  },
  {
    id: "cosmos",
    symbol: "ATOM",
    name: "Cosmos",
    pair: "ATOMUSDT",
    stream: "atomusdt@ticker",
    image: "https://coin-images.coingecko.com/coins/images/1481/large/cosmos_hub.png?1696502525",
    marketCapRank: 30
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
