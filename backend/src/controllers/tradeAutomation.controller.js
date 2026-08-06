const tradeAutomationModel = require("../models/tradeAutomation.model");
const userModel = require("../models/user.model");
const copySignalModel = require("../models/copySignal.model");
const { runTradeAutomationCycle, runAutomationNow } = require("../services/tradeAutomation.service");

const ALLOWED_SLOTS = ["first", "second", "third", "fourth", "fifth_bonus"];
const ALLOWED_ALLOCATIONS = [20, 40, 50, 60, 100];
const MINIMUM_TRADE_ENTRY_AMOUNT = 30;

const getSlotRequirement = (slotKey) => {
  if (slotKey === "third") {
    return 100;
  }

  if (slotKey === "fifth_bonus") {
    return 300;
  }

  return 0;
};

const validateAutomationEligibility = async ({ user, slotKey, allocationPercent }) => {
  const tradingBalance = Number(user.tradingBalance || 0);
  const projectedAmount = Number(((tradingBalance * Number(allocationPercent || 0)) / 100).toFixed(2));

  if (projectedAmount < MINIMUM_TRADE_ENTRY_AMOUNT) {
    return `Trading balance is too low for this automation. Your selected allocation must produce at least ${MINIMUM_TRADE_ENTRY_AMOUNT} USDT.`;
  }

  if (projectedAmount > tradingBalance) {
    return "Trading balance is not enough for this automation.";
  }

  const minimumDepositRequired = getSlotRequirement(slotKey);

  if (!minimumDepositRequired) {
    return null;
  }

  const eligible = await copySignalModel.hasBonusSignalAccess(user.id, minimumDepositRequired);

  if (eligible) {
    return null;
  }

  if (minimumDepositRequired >= 300) {
    return `This session is only available to users with a credited deposit of ${minimumDepositRequired} USDT or leaders who directly invited a member with a credited deposit of ${minimumDepositRequired} USDT or above.`;
  }

  return `This session is only available to users with a credited deposit of ${minimumDepositRequired} USDT or above.`;
};

const getMyAutomations = async (req, res) => {
  await runTradeAutomationCycle();
  const automations = await tradeAutomationModel.getByUserId(req.user.id);

  return res.status(200).json({
    success: true,
    data: automations
  });
};

const createAutomation = async (req, res) => {
  const slotKey = req.body.slotKey?.trim().toLowerCase();
  const allocationPercent = Number(req.body.allocationPercent);

  if (!slotKey || !allocationPercent) {
    return res.status(400).json({
      success: false,
      message: "Trade slot and allocation are required"
    });
  }

  if (!ALLOWED_SLOTS.includes(slotKey)) {
    return res.status(400).json({
      success: false,
      message: "Choose a valid automation trade slot"
    });
  }

  if (!ALLOWED_ALLOCATIONS.includes(allocationPercent)) {
    return res.status(400).json({
      success: false,
      message: "Automation allocation must be one of 20, 40, 50, 60, or 100"
    });
  }

  const existingAutomations = await tradeAutomationModel.getByUserId(req.user.id);
  const duplicateAutomation = existingAutomations.find((item) => item.slotKey === slotKey);

  if (duplicateAutomation) {
    return res.status(409).json({
      success: false,
      message: "An automation for this trade session already exists"
    });
  }

  const eligibilityError = await validateAutomationEligibility({
    user: req.user,
    slotKey,
    allocationPercent
  });

  if (eligibilityError) {
    return res.status(400).json({
      success: false,
      message: eligibilityError
    });
  }

  const automation = await tradeAutomationModel.createAutomation({
    userId: req.user.id,
    username: req.user.username,
    pair: "ANY",
    slotKey,
    allocationPercent
  });

  await runTradeAutomationCycle();
  const refreshedAutomation = await runAutomationNow({
    automationId: automation.id,
    userId: req.user.id
  });

  return res.status(201).json({
    success: true,
    message: "Automation saved successfully",
    data: refreshedAutomation || automation
  });
};

const updateAutomation = async (req, res) => {
  const isEnabled = req.body.isEnabled;

  if (typeof isEnabled !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "Automation enabled state must be true or false"
    });
  }

  const existingAutomations = await tradeAutomationModel.getByUserId(req.user.id);
  const existingAutomation = existingAutomations.find((item) => Number(item.id) === Number(req.params.id));

  if (!existingAutomation) {
    return res.status(404).json({
      success: false,
      message: "Automation was not found"
    });
  }

  if (existingAutomation.lastResult === "executed") {
    return res.status(400).json({
      success: false,
      message: "Completed automated trades can no longer be changed."
    });
  }

  const eligibilityError = await validateAutomationEligibility({
    user: req.user,
    slotKey: existingAutomation.slotKey,
    allocationPercent: existingAutomation.allocationPercent
  });

  if (eligibilityError) {
    return res.status(400).json({
      success: false,
      message: eligibilityError
    });
  }

  const automation = await tradeAutomationModel.updateAutomation({
    id: req.params.id,
    userId: req.user.id,
    isEnabled
  });

  if (!automation) {
    return res.status(404).json({
      success: false,
      message: "Automation was not found"
    });
  }

  if (isEnabled) {
    await runTradeAutomationCycle();
  }

  const refreshedAutomation = isEnabled
    ? await runAutomationNow({
        automationId: req.params.id,
        userId: req.user.id
      })
    : await tradeAutomationModel.getById({
        id: req.params.id,
        userId: req.user.id
      });

  const refreshedUser = await userModel.findUserById(req.user.id);

  return res.status(200).json({
    success: true,
    message: `Automation ${isEnabled ? "enabled" : "paused"} successfully`,
    data: {
      automation: refreshedAutomation || automation,
      user: refreshedUser
    }
  });
};

const deleteAutomation = async (req, res) => {
  const existingAutomations = await tradeAutomationModel.getByUserId(req.user.id);
  const existingAutomation = existingAutomations.find((item) => Number(item.id) === Number(req.params.id));

  if (!existingAutomation) {
    return res.status(404).json({
      success: false,
      message: "Automation was not found"
    });
  }

  if (existingAutomation.lastResult === "executed") {
    return res.status(400).json({
      success: false,
      message: "Completed automated trades can no longer be deleted."
    });
  }

  const deleted = await tradeAutomationModel.deleteAutomation({
    id: req.params.id,
    userId: req.user.id
  });

  if (!deleted) {
    return res.status(404).json({
      success: false,
      message: "Automation was not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Automation deleted successfully"
  });
};

module.exports = {
  getMyAutomations,
  createAutomation,
  updateAutomation,
  deleteAutomation
};
