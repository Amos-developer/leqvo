const copySignalModel = require("../models/copySignal.model");
const tradeAutomationModel = require("../models/tradeAutomation.model");
const tradeModel = require("../models/trade.model");
const userModel = require("../models/user.model");

const MINIMUM_TRADE_ENTRY_AMOUNT = 30;

const slotByUtcHour = {
  10: "first",
  11: "second",
  13: "third",
  14: "fourth",
  15: "fifth_bonus"
};

let isProcessing = false;
let rerunRequested = false;

const getLatestSignalsBySlot = (signals) => {
  const latestBySlot = new Map();

  for (const signal of signals) {
    const slotKey = slotByUtcHour[new Date(signal.validFrom).getUTCHours()];

    if (!slotKey) {
      continue;
    }

    const current = latestBySlot.get(slotKey);

    if (!current || new Date(signal.createdAt).getTime() > new Date(current.createdAt).getTime()) {
      latestBySlot.set(slotKey, signal);
    }
  }

  return latestBySlot;
};

const getSignalAccessMessage = async (signal, userId) => {
  const minimumDepositRequired = Number(signal.minDepositRequired || 0);

  if (!minimumDepositRequired) {
    return null;
  }

  const eligible = await copySignalModel.hasBonusSignalAccess(userId, minimumDepositRequired);

  if (eligible) {
    return null;
  }

  if (minimumDepositRequired >= 300) {
    return `Requires a credited deposit of ${minimumDepositRequired} USDT or a directly invited member with a credited deposit of ${minimumDepositRequired} USDT or above.`;
  }

  return `Requires a credited deposit of ${minimumDepositRequired} USDT or above.`;
};

const processAutomation = async (automation, signal, slotKey) => {
  if (!automation || !signal || automation.lastSignalCode === signal.signalCode) {
    return;
  }

  const user = await userModel.findUserById(automation.userId);

  if (!user) {
    await tradeAutomationModel.markAutomationRun({
      id: automation.id,
      signalCode: signal.signalCode,
      result: "failed",
      message: "User account was not found."
    });
    return;
  }

  const accessMessage = await getSignalAccessMessage(signal, user.id);

  if (accessMessage) {
    await tradeAutomationModel.markAutomationRun({
      id: automation.id,
      signalCode: signal.signalCode,
      result: "skipped",
      message: accessMessage
    });
    return;
  }

  const tradingBalance = Number(user.tradingBalance || 0);
  const amount = Number(((tradingBalance * Number(automation.allocationPercent || 0)) / 100).toFixed(2));

  if (amount < MINIMUM_TRADE_ENTRY_AMOUNT) {
    await tradeAutomationModel.markAutomationRun({
      id: automation.id,
      signalCode: signal.signalCode,
      result: "skipped",
      message: `Trading balance is too low for automation. Minimum execution amount is ${MINIMUM_TRADE_ENTRY_AMOUNT} USDT.`
    });
    return;
  }

  if (amount > tradingBalance) {
    await tradeAutomationModel.markAutomationRun({
      id: automation.id,
      signalCode: signal.signalCode,
      result: "skipped",
      message: "Trading balance is not enough for this automation."
    });
    return;
  }

  try {
    await tradeModel.createTrade({
      user,
      pair: signal.pair,
      symbol: signal.pair.split("/")[0],
      signalCode: signal.signalCode,
      allocationPercent: Number(automation.allocationPercent),
      amount,
      entryPrice: 0,
      targetProfitPercent: Number(signal.profitPercent || 0),
      automationId: automation.id,
      executionMode: "automation"
    });

    await tradeAutomationModel.markAutomationRun({
      id: automation.id,
      signalCode: signal.signalCode,
      result: "executed",
      message: `Automated trade entered successfully for the active ${slotKey.replace("_", " ")} session using ${signal.pair}.`
    });
  } catch (error) {
    await tradeAutomationModel.markAutomationRun({
      id: automation.id,
      signalCode: signal.signalCode,
      result: "failed",
      message: error.message || "Automation execution failed."
    });
  }
};

const runTradeAutomationCycle = async () => {
  if (isProcessing) {
    rerunRequested = true;
    return;
  }

  isProcessing = true;
  rerunRequested = false;

  try {
    await tradeModel.settleCompletedTradesForAll();

    const activeSignals = await copySignalModel.getActiveSignals();
    const latestSignalsBySlot = getLatestSignalsBySlot(activeSignals);

    for (const [slotKey, signal] of latestSignalsBySlot.entries()) {
      const automations = await tradeAutomationModel.getEnabledAutomationsBySignal({ slotKey });

      for (const automation of automations) {
        await processAutomation(automation, signal, slotKey);
      }
    }
  } finally {
    isProcessing = false;

    if (rerunRequested) {
      rerunRequested = false;
      setImmediate(() => {
        runTradeAutomationCycle().catch(() => {});
      });
    }
  }
};

const runAutomationNow = async ({ automationId, userId }) => {
  const automation = await tradeAutomationModel.getById({ id: automationId, userId });

  if (!automation || !automation.isEnabled) {
    return automation;
  }

  await tradeModel.settleCompletedTradesForUser(userId);

  const activeSignals = await copySignalModel.getActiveSignals();
  const latestSignalsBySlot = getLatestSignalsBySlot(activeSignals);
  const signal = latestSignalsBySlot.get(automation.slotKey);

  if (!signal) {
    return tradeAutomationModel.getById({ id: automationId, userId });
  }

  await processAutomation(automation, signal, automation.slotKey);

  return tradeAutomationModel.getById({ id: automationId, userId });
};

module.exports = {
  runTradeAutomationCycle,
  runAutomationNow
};
