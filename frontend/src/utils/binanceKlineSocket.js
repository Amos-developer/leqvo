const BINANCE_REST_URL = "https://api.binance.com/api/v3/klines";
const BINANCE_WS_URL = "wss://stream.binance.com:9443/ws";

const normalizePair = (pair) => String(pair || "BTCUSDT").toLowerCase();

const safelyCloseSocket = (socket) => {
  if (!socket || socket.readyState === WebSocket.CLOSING || socket.readyState === WebSocket.CLOSED) {
    return;
  }

  try {
    socket.close();
  } catch (error) {
    // Ignore close-time browser/socket lifecycle noise.
  }
};

const mapKline = (kline) => ({
  time: Math.floor(Number(kline[0]) / 1000),
  open: Number(kline[1]),
  high: Number(kline[2]),
  low: Number(kline[3]),
  close: Number(kline[4])
});

export const fetchBinanceKlines = async (pair, interval = "1m", limit = 120) => {
  const searchParams = new URLSearchParams({
    symbol: String(pair || "BTCUSDT").toUpperCase(),
    interval,
    limit: String(limit)
  });
  const response = await fetch(`${BINANCE_REST_URL}?${searchParams.toString()}`);

  if (!response.ok) {
    throw new Error("Could not load Binance candlesticks");
  }

  const klines = await response.json();

  return klines.map(mapKline);
};

export const createBinanceKlineSocket = ({ pair, interval = "1m", onCandle, onError, onClose }) => {
  const socket = new WebSocket(`${BINANCE_WS_URL}/${normalizePair(pair)}@kline_${interval}`);
  let manuallyClosed = false;

  socket.addEventListener("message", (event) => {
    if (manuallyClosed) {
      return;
    }

    const message = JSON.parse(event.data);
    const kline = message.k;

    if (!kline) {
      return;
    }

    onCandle?.({
      time: Math.floor(Number(kline.t) / 1000),
      open: Number(kline.o),
      high: Number(kline.h),
      low: Number(kline.l),
      close: Number(kline.c)
    });
  });

  socket.addEventListener("error", () => {
    if (manuallyClosed) {
      return;
    }

    onError?.();
  });

  socket.addEventListener("close", () => {
    if (manuallyClosed) {
      return;
    }

    onClose?.();
  });

  return {
    close() {
      manuallyClosed = true;
      safelyCloseSocket(socket);
    }
  };
};
