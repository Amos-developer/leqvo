const copySignalModel = require("../models/copySignal.model");

const generateSignalCode = (pair) => {
  const prefix = pair.replace("/", "").slice(0, 6).toUpperCase();
  const number = Math.floor(100000 + Math.random() * 900000);

  return `${prefix}-${number}`;
};

const ALLOWED_UTC_START_HOURS = [10, 11, 13, 14, 15];
const ALLOWED_PAIRS = [
  "BTC/USDT",
  "ETH/USDT",
  "BNB/USDT",
  "SOL/USDT",
  "XRP/USDT",
  "ADA/USDT",
  "DOGE/USDT",
  "TRX/USDT",
  "AVAX/USDT",
  "LINK/USDT",
  "DOT/USDT",
  "POL/USDT",
  "LTC/USDT",
  "BCH/USDT",
  "NEAR/USDT",
  "UNI/USDT",
  "APT/USDT",
  "ARB/USDT",
  "OP/USDT",
  "XLM/USDT",
  "SUI/USDT",
  "TON/USDT",
  "PEPE/USDT",
  "SHIB/USDT",
  "RENDER/USDT",
  "ATOM/USDT"
];

const getSignals = async (req, res) => {
  const signals = await copySignalModel.getSignals();

  return res.status(200).json({
    success: true,
    data: signals
  });
};

const createSignal = async (req, res) => {
  const pair = req.body.pair?.trim().toUpperCase();
  const currency = pair?.split("/")[1];
  const validFrom = req.body.validFrom ? new Date(req.body.validFrom) : null;
  const validTo = req.body.validTo ? new Date(req.body.validTo) : null;
  const profitPercent = Number(req.body.profitPercent);

  if (!pair || !validFrom || !validTo || !profitPercent) {
    return res.status(400).json({
      success: false,
      message: "Pair, valid time, and profit percent are required"
    });
  }

  if (!/^[A-Z0-9]{2,12}\/[A-Z0-9]{2,12}$/.test(pair)) {
    return res.status(400).json({
      success: false,
      message: "Pair must look like BTC/USDT"
    });
  }

  if (!ALLOWED_PAIRS.includes(pair)) {
    return res.status(400).json({
      success: false,
      message: "Pair must be one of the available market pairs"
    });
  }

  if (!Number.isFinite(validFrom.getTime()) || !Number.isFinite(validTo.getTime())) {
    return res.status(400).json({
      success: false,
      message: "Choose a valid signal time"
    });
  }

  const durationMinutes = Math.round((validTo.getTime() - validFrom.getTime()) / 60000);

  if (durationMinutes !== 40) {
    return res.status(400).json({
      success: false,
      message: "Signal must be valid for exactly 40 minutes"
    });
  }

  if (validFrom.getUTCMinutes() !== 0 || !ALLOWED_UTC_START_HOURS.includes(validFrom.getUTCHours())) {
    return res.status(400).json({
      success: false,
      message: "Signal start time must be 10:00, 11:00, 13:00, 14:00, or 15:00 UTC"
    });
  }

  if (!Number.isFinite(profitPercent) || profitPercent <= 0 || profitPercent > 100) {
    return res.status(400).json({
      success: false,
      message: "Profit percent must be between 0 and 100"
    });
  }

  const signal = await copySignalModel.createSignal({
    pair,
    currency,
    signalCode: generateSignalCode(pair),
    profitPercent,
    minDepositRequired: validFrom.getUTCHours() === 15 ? 300 : 0,
    validFrom,
    validTo,
    createdBy: req.user.id
  });

  return res.status(201).json({
    success: true,
    message: "Copy signal created successfully",
    data: signal
  });
};

module.exports = {
  getSignals,
  createSignal
};
