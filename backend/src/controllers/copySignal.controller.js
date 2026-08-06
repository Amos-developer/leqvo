const copySignalModel = require("../models/copySignal.model");

const formatUtcTime = (value) => {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    hour12: false
  }).format(new Date(value));
};

const generateSignalCode = (pair) => {
  const prefix = pair.replace("/", "").slice(0, 6).toUpperCase();
  const number = Math.floor(100000 + Math.random() * 900000);

  return `${prefix}-${number}`;
};

const ALLOWED_UTC_START_HOURS = [10, 11, 13, 14];
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

const getSignalMinimumDepositRequirement = (validFrom) => {
  const startHour = validFrom.getUTCHours();

  if (startHour === 13) {
    return 100;
  }

  if (startHour === 14) {
    return 500;
  }

  return 0;
};

const validateSignalPayload = ({ pair, validFrom, validTo, profitPercent }) => {
  if (!pair || !validFrom || !validTo || !profitPercent) {
    return "Pair, valid time, and profit percent are required";
  }

  if (!/^[A-Z0-9]{2,12}\/[A-Z0-9]{2,12}$/.test(pair)) {
    return "Pair must look like BTC/USDT";
  }

  if (!ALLOWED_PAIRS.includes(pair)) {
    return "Pair must be one of the available market pairs";
  }

  if (!Number.isFinite(validFrom.getTime()) || !Number.isFinite(validTo.getTime())) {
    return "Choose a valid signal time";
  }

  const durationMinutes = Math.round((validTo.getTime() - validFrom.getTime()) / 60000);

  if (durationMinutes !== 40) {
    return "Signal must be valid for exactly 40 minutes";
  }

  if (validFrom.getUTCMinutes() !== 0 || !ALLOWED_UTC_START_HOURS.includes(validFrom.getUTCHours())) {
    return "Signal start time must be 10:00, 11:00, 13:00, or 14:00 UTC";
  }

  if (!Number.isFinite(profitPercent) || profitPercent <= 0 || profitPercent > 100) {
    return "Profit percent must be between 0 and 100";
  }

  return "";
};

const ensureDepositTierSignalAccess = async (signal, userId) => {
  const minimumDepositRequired = Number(signal.minDepositRequired || 0);

  if (!minimumDepositRequired) {
    return null;
  }

  const eligible = await copySignalModel.hasBonusSignalAccess(userId, minimumDepositRequired);

  if (eligible) {
    return null;
  }

  if (minimumDepositRequired >= 100) {
    return `This signal is only available to users with a credited deposit of ${minimumDepositRequired} USDT or leaders who directly invited a member with a credited deposit of ${minimumDepositRequired} USDT or above.`;
  }
};

const getSignals = async (req, res) => {
  const signals = await copySignalModel.getSignals();

  return res.status(200).json({
    success: true,
    data: signals
  });
};

const previewSignal = async (req, res) => {
  const signalCode = req.params.signalCode?.trim().toUpperCase();

  if (!signalCode) {
    return res.status(400).json({
      success: false,
      message: "Signal code is required"
    });
  }

  const signal = await copySignalModel.findSignalByCode(signalCode);

  if (!signal) {
    return res.status(404).json({
      success: false,
      message: "This signal code could not be found. Please check the code and try again."
    });
  }

  if (signal.status !== "active" || new Date(signal.validFrom) > new Date() || new Date(signal.validTo) < new Date()) {
    return res.status(400).json({
      success: false,
      message: `This signal is outside its trading session. It can only be used from ${formatUtcTime(signal.validFrom)} to ${formatUtcTime(signal.validTo)} UTC.`
    });
  }

  const activeSignal = await copySignalModel.findActiveSignalByPair(signal.pair);

  if (!activeSignal || activeSignal.signalCode !== signal.signalCode) {
    return res.status(400).json({
      success: false,
      message: `This signal code is not the active ${signal.pair} session signal right now.`
    });
  }

  const bonusAccessMessage = await ensureDepositTierSignalAccess(signal, req.user.id);

  if (bonusAccessMessage) {
    return res.status(403).json({
      success: false,
      message: bonusAccessMessage
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      pair: signal.pair,
      symbol: signal.pair.split("/")[0],
      signalCode: signal.signalCode,
      validFrom: signal.validFrom,
      validTo: signal.validTo,
      profitPercent: signal.profitPercent
    }
  });
};

const createSignal = async (req, res) => {
  const pair = req.body.pair?.trim().toUpperCase();
  const currency = pair?.split("/")[1];
  const validFrom = req.body.validFrom ? new Date(req.body.validFrom) : null;
  const validTo = req.body.validTo ? new Date(req.body.validTo) : null;
  const profitPercent = Number(req.body.profitPercent);

  const validationMessage = validateSignalPayload({ pair, validFrom, validTo, profitPercent });

  if (validationMessage) {
    return res.status(400).json({
      success: false,
      message: validationMessage
    });
  }

  const existingSignal = await copySignalModel.findSignalByValidFrom(validFrom);

  if (existingSignal) {
    return res.status(409).json({
      success: false,
      message: `A signal already exists for ${formatUtcTime(validFrom)} UTC on this session date. Wait for it to expire before creating another one.`
    });
  }

  const signal = await copySignalModel.createSignal({
    pair,
    currency,
    signalCode: generateSignalCode(pair),
    profitPercent,
    minDepositRequired: getSignalMinimumDepositRequirement(validFrom),
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

const getSignal = async (req, res) => {
  const signal = await copySignalModel.findSignalById(req.params.id);

  if (!signal) {
    return res.status(404).json({
      success: false,
      message: "Signal was not found"
    });
  }

  return res.status(200).json({
    success: true,
    data: signal
  });
};

const updateSignal = async (req, res) => {
  const existingSignal = await copySignalModel.findSignalById(req.params.id);

  if (!existingSignal) {
    return res.status(404).json({
      success: false,
      message: "Signal was not found"
    });
  }

  const pair = req.body.pair?.trim().toUpperCase() || existingSignal.pair;
  const currency = pair.split("/")[1];
  const validFrom = req.body.validFrom ? new Date(req.body.validFrom) : new Date(existingSignal.validFrom);
  const validTo = req.body.validTo ? new Date(req.body.validTo) : new Date(existingSignal.validTo);
  const profitPercent = req.body.profitPercent === undefined
    ? Number(existingSignal.profitPercent)
    : Number(req.body.profitPercent);
  const status = req.body.status?.trim().toLowerCase() || existingSignal.status;

  const validationMessage = validateSignalPayload({ pair, validFrom, validTo, profitPercent });

  if (validationMessage) {
    return res.status(400).json({
      success: false,
      message: validationMessage
    });
  }

  if (!["active", "expired", "cancelled"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be active, expired, or cancelled"
    });
  }

  const duplicateSignal = await copySignalModel.findSignalByValidFrom(validFrom);

  if (duplicateSignal && Number(duplicateSignal.id) !== Number(existingSignal.id)) {
    return res.status(409).json({
      success: false,
      message: `A signal already exists for ${formatUtcTime(validFrom)} UTC on this session date.`
    });
  }

  const signal = await copySignalModel.updateSignalByAdmin({
    id: req.params.id,
    pair,
    currency,
    profitPercent,
    minDepositRequired: getSignalMinimumDepositRequirement(validFrom),
    validFrom,
    validTo,
    status
  });

  return res.status(200).json({
    success: true,
    message: "Signal updated successfully",
    data: signal
  });
};

const deleteSignal = async (req, res) => {
  const signal = await copySignalModel.deleteSignalByAdmin(req.params.id);

  if (!signal) {
    return res.status(404).json({
      success: false,
      message: "Signal was not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Signal deleted successfully"
  });
};

module.exports = {
  getSignals,
  getSignal,
  createSignal,
  updateSignal,
  deleteSignal,
  previewSignal
};
