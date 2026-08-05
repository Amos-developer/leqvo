const tradeAutomationModel = require("../models/tradeAutomation.model");
const userModel = require("../models/user.model");

const ALLOWED_SLOTS = ["first", "second", "third", "fourth", "fifth_bonus"];
const ALLOWED_ALLOCATIONS = [20, 40, 50, 60, 100];

const getMyAutomations = async (req, res) => {
  const automations = await tradeAutomationModel.getByUserId(req.user.id);

  return res.status(200).json({
    success: true,
    data: automations
  });
};

const createAutomation = async (req, res) => {
  const pair = req.body.pair?.trim().toUpperCase();
  const slotKey = req.body.slotKey?.trim().toLowerCase();
  const allocationPercent = Number(req.body.allocationPercent);

  if (!pair || !slotKey || !allocationPercent) {
    return res.status(400).json({
      success: false,
      message: "Pair, trade slot, and allocation are required"
    });
  }

  if (!/^[A-Z0-9]{2,12}\/[A-Z0-9]{2,12}$/.test(pair)) {
    return res.status(400).json({
      success: false,
      message: "Pair must look like BTC/USDT"
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
  const duplicateAutomation = existingAutomations.find((item) => item.pair === pair && item.slotKey === slotKey);

  if (duplicateAutomation) {
    return res.status(409).json({
      success: false,
      message: "An automation for this pair and session already exists"
    });
  }

  const automation = await tradeAutomationModel.createAutomation({
    userId: req.user.id,
    username: req.user.username,
    pair,
    slotKey,
    allocationPercent
  });

  return res.status(201).json({
    success: true,
    message: "Automation saved successfully",
    data: automation
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

  const refreshedUser = await userModel.findUserById(req.user.id);

  return res.status(200).json({
    success: true,
    message: `Automation ${isEnabled ? "enabled" : "paused"} successfully`,
    data: {
      automation,
      user: refreshedUser
    }
  });
};

const deleteAutomation = async (req, res) => {
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
