const MARKET_COINS = [
  "bitcoin",
  "ethereum",
  "binancecoin",
  "solana",
  "ripple",
  "cardano",
  "dogecoin",
  "tron"
];

const fetchPopularCrypto = async () => {
  const params = new URLSearchParams({
    vs_currency: "usd",
    ids: MARKET_COINS.join(","),
    order: "market_cap_desc",
    per_page: "8",
    page: "1",
    sparkline: "false",
    price_change_percentage: "24h"
  });

  const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?${params}`);
  const result = await response.json();

  if (!response.ok) {
    const error = new Error(result.error || "Failed to fetch market data");
    error.statusCode = response.status;
    throw error;
  }

  return result.map((coin) => ({
    id: coin.id,
    symbol: coin.symbol.toUpperCase(),
    name: coin.name,
    image: coin.image,
    price: coin.current_price,
    change24h: coin.price_change_percentage_24h || 0,
    volume24h: coin.total_volume,
    marketCapRank: coin.market_cap_rank,
    lastUpdated: coin.last_updated
  }));
};

module.exports = {
  fetchPopularCrypto
};
