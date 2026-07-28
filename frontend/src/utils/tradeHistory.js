const TRADE_HISTORY_KEY = "leqvoTradeHistory";

export const getStoredTrades = () => {
  try {
    return JSON.parse(localStorage.getItem(TRADE_HISTORY_KEY) || "[]");
  } catch (error) {
    return [];
  }
};

export const saveTradeRecord = (trade) => {
  const trades = getStoredTrades();
  const record = {
    id: `TRD-${Date.now()}`,
    status: "active",
    createdAt: new Date().toISOString(),
    ...trade
  };

  localStorage.setItem(TRADE_HISTORY_KEY, JSON.stringify([record, ...trades]));

  return record;
};
