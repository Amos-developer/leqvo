const tradeModel = require("../models/trade.model");

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

  const trade = await tradeModel.createTrade({
    user: req.user,
    pair,
    symbol,
    signalCode,
    allocationPercent,
    amount,
    entryPrice
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
