const tradeModel = require("../models/trade.model");
const copySignalModel = require("../models/copySignal.model");

const formatUtcTime = (value) => {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false
  }).format(new Date(value));
};

const getBonusSignalAccessMessage = async (signal, userId) => {
  const minimumDepositRequired = Number(signal.minDepositRequired || 0);

  if (!minimumDepositRequired) {
    return null;
  }

  const eligible = await copySignalModel.hasBonusSignalAccess(userId, minimumDepositRequired);

  if (eligible) {
    return null;
  }

  return `This bonus signal is only available to users with a credited deposit of ${minimumDepositRequired} USDT or leaders who directly invited a member with a credited deposit of ${minimumDepositRequired} USDT or above.`;
};

const createTrade = async (req, res) => {
  const pair = req.body.pair?.trim().toUpperCase();
  const symbol = req.body.symbol?.trim().toUpperCase();
  const signalCode = req.body.signalCode?.trim().toUpperCase();
  const allocationPercent = Number(req.body.allocationPercent);
  const amount = Number(req.body.amount);
  const entryPrice = Number(req.body.entryPrice || 0);

  if (!pair || !symbol || !signalCode || !allocationPercent || !amount) {
    return res.status(400).json({
      success: false,
      message: "Pair, symbol, signal code, allocation percent, and amount are required"
    });
  }

  if (amount > Number(req.user.tradingBalance || 0)) {
    return res.status(400).json({
      success: false,
      message: "Trading account balance is not enough"
    });
  }

  const activeSignal = await copySignalModel.findActiveSignalByPair(pair);
  const enteredSignal = await copySignalModel.findSignalByCode(signalCode);

  if (!activeSignal) {
    return res.status(409).json({
      success: false,
      message: `There is no active signal for ${pair} right now. Please wait for the current trading session window.`
    });
  }

  if (!enteredSignal) {
    return res.status(400).json({
      success: false,
      message: `Invalid signal code. Please enter the current signal for ${pair}.`
    });
  }

  if (enteredSignal.pair !== pair) {
    return res.status(400).json({
      success: false,
      message: `This signal code belongs to ${enteredSignal.pair}, not ${pair}. Please enter the correct signal for ${pair}.`
    });
  }

  if (enteredSignal.status !== "active" || new Date(enteredSignal.validFrom) > new Date() || new Date(enteredSignal.validTo) < new Date()) {
    return res.status(400).json({
      success: false,
      message: `This signal is outside its trading session. It can only be used from ${formatUtcTime(enteredSignal.validFrom)} to ${formatUtcTime(enteredSignal.validTo)} UTC.`
    });
  }

  if (enteredSignal.signalCode !== activeSignal.signalCode) {
    return res.status(400).json({
      success: false,
      message: `You entered a different ${pair} signal. Please use the currently active signal for this session only.`
    });
  }

  const bonusAccessMessage = await getBonusSignalAccessMessage(activeSignal, req.user.id);

  if (bonusAccessMessage) {
    return res.status(403).json({
      success: false,
      message: bonusAccessMessage
    });
  }

  const trade = await tradeModel.createTrade({
    user: req.user,
    pair,
    symbol,
    signalCode,
    allocationPercent,
    amount,
    entryPrice,
    targetProfitPercent: Number(activeSignal.profitPercent || 0)
  });

  return res.status(201).json({
    success: true,
    message: "Trade created successfully",
    data: trade
  });
};

const getMyTrades = async (req, res) => {
  const trades = await tradeModel.findTradesByUserId(req.user.id);

  return res.status(200).json({
    success: true,
    data: trades
  });
};

module.exports = {
  createTrade,
  getMyTrades
};
