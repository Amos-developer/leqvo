const tradeModel = require("../models/trade.model");
const copySignalModel = require("../models/copySignal.model");

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
      message: `There is no active admin signal for ${pair} right now. Wait for the current trading session signal.`
    });
  }

  if (!enteredSignal) {
    return res.status(400).json({
      success: false,
      message: `Invalid signal code. Enter the active admin signal for ${pair}.`
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
      message: `This signal is not valid in the current session. Use the active ${pair} signal for this time window.`
    });
  }

  if (enteredSignal.signalCode !== activeSignal.signalCode) {
    return res.status(400).json({
      success: false,
      message: `You entered a different ${pair} signal. Please use the currently active admin signal for this session only.`
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
    targetProfitPercent: Number(activeSignal.profitPercent || 0),
    settlesAt: activeSignal.validTo
  });

  return res.status(201).json({
    success: true,
    message: "Trade created successfully",
    data: trade
  });
};

module.exports = {
  createTrade
};
