const crypto = require("crypto");
const depositModel = require("../models/deposit.model");
const userModel = require("../models/user.model");
const env = require("../config/env");

const MINIMUM_DEPOSIT = 30;

const createDeposit = async (req, res) => {
  const { userId, asset, network, amount } = req.body;
  const depositAmount = Number(amount);

  if (!userId || !asset || !network || !depositAmount) {
    return res.status(400).json({
      success: false,
      message: "userId, asset, network, and amount are required"
    });
  }

  if (depositAmount < MINIMUM_DEPOSIT) {
    return res.status(400).json({
      success: false,
      message: "Minimum deposit amount is $30"
    });
  }

  const user = await userModel.findUserById(userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const payment = await depositModel.createNowPaymentsPayment({
    user,
    asset,
    network,
    amount: depositAmount
  });

  return res.status(payment.reused ? 200 : 201).json({
    success: true,
    message: payment.reused
      ? "Existing unpaid deposit address returned"
      : "Deposit address created successfully",
    data: payment
  });
};

const sortObject = (object) => {
  return Object.keys(object)
    .sort()
    .reduce((sorted, key) => {
      sorted[key] = object[key];
      return sorted;
    }, {});
};

const verifyNowPaymentsSignature = (payload, signature) => {
  if (!env.nowpayments.ipnSecret) {
    return true;
  }

  if (!signature) {
    return false;
  }

  const sortedPayload = JSON.stringify(sortObject(payload));
  const expectedSignature = crypto
    .createHmac("sha256", env.nowpayments.ipnSecret)
    .update(sortedPayload)
    .digest("hex");

  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
};

const handleNowPaymentsIpn = async (req, res) => {
  const signature = req.headers["x-nowpayments-sig"];

  if (!verifyNowPaymentsSignature(req.body, signature)) {
    return res.status(401).json({
      success: false,
      message: "Invalid NOWPayments signature"
    });
  }

  const deposit = await depositModel.applyPaymentUpdate({
    paymentId: req.body.payment_id,
    status: req.body.payment_status,
    actuallyPaid: req.body.actually_paid,
    actuallyPaidAtFiat: req.body.actually_paid_at_fiat,
    payAmount: req.body.pay_amount
  });

  return res.status(200).json({
    success: true,
    message: "Deposit status updated",
    data: deposit
  });
};

const refreshDepositStatus = async (req, res) => {
  const deposit = await depositModel.refreshDepositStatus(req.params.paymentId);

  return res.status(200).json({
    success: true,
    message: "Deposit status refreshed",
    data: deposit
  });
};

const getMyDeposits = async (req, res) => {
  const deposits = await depositModel.findDepositsByUserId(req.user.id);

  return res.status(200).json({
    success: true,
    data: deposits
  });
};

module.exports = {
  createDeposit,
  handleNowPaymentsIpn,
  refreshDepositStatus,
  getMyDeposits
};
