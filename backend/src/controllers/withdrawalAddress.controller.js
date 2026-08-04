const withdrawalAddressModel = require("../models/withdrawalAddress.model");

const supportedNetworks = {
  USDT: ["TRC20", "BEP20"],
  USDC: ["BEP20"],
  BNB: ["BEP20"]
};

const validateAddress = ({ asset, network, address }) => {
  if (!supportedNetworks[asset]?.includes(network)) {
    return "Unsupported asset or network";
  }

  if (network === "TRC20" && !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address)) {
    return "TRC20 address must start with T and be a valid TRON address";
  }

  if (network === "BEP20" && !/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return "BEP20 address must be a valid 0x wallet address";
  }

  return "";
};

const generateSixDigitCode = () => String(Math.floor(100000 + Math.random() * 900000));

const getMyAddress = async (req, res) => {
  const address = await withdrawalAddressModel.getLatestByUserId(req.user.id);

  return res.status(200).json({
    success: true,
    data: address
  });
};

const submitAddress = async (req, res) => {
  const asset = req.body.asset?.trim().toUpperCase();
  const network = req.body.network?.trim().toUpperCase();
  const address = req.body.address?.trim();
  const code = req.body.code?.trim();

  if (!asset || !network || !address || !code) {
    return res.status(400).json({
      success: false,
      message: "Asset, network, address, and email code are required"
    });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      success: false,
      message: "Email code must be exactly 6 numbers"
    });
  }

  const validationError = validateAddress({ asset, network, address });

  if (validationError) {
    return res.status(400).json({
      success: false,
      message: validationError
    });
  }

  const latest = await withdrawalAddressModel.getLatestByUserId(req.user.id);

  if (latest?.pendingAddress?.status === "pending") {
    return res.status(409).json({
      success: false,
      message: "Your withdrawal address is already pending admin review"
    });
  }

  if (latest?.activeAddress?.locked) {
    return res.status(423).json({
      success: false,
      message: "Your approved withdrawal address is locked. Contact admin to unlock address changes first."
    });
  }

  const codeRecord = await withdrawalAddressModel.findValidAddressCode({
    userId: req.user.id,
    code
  });

  if (!codeRecord) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired email code"
    });
  }

  const record = await withdrawalAddressModel.createAddress({
    user: req.user,
    asset,
    network,
    address
  });

  await withdrawalAddressModel.markAddressCodeUsed(codeRecord.id);

  return res.status(201).json({
    success: true,
    message: "Withdrawal address submitted for admin approval",
    data: record
  });
};

const requestAddressCode = async (req, res) => {
  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const record = await withdrawalAddressModel.createAddressCode({
    userId: req.user.id,
    code,
    expiresAt
  });

  return res.status(200).json({
    success: true,
    message: `Verification code requested for ${req.user.email}`,
    data: {
      email: req.user.email,
      expiresAt: record.expiresAt,
      code: process.env.NODE_ENV === "production" ? undefined : code
    }
  });
};

const getAdminAddresses = async (req, res) => {
  const addresses = await withdrawalAddressModel.getAll();

  return res.status(200).json({
    success: true,
    data: addresses
  });
};

const updateAddressStatus = async (req, res) => {
  const action = req.body.action?.trim().toLowerCase();
  const status = req.body.status?.trim().toLowerCase();
  const note = req.body.note?.trim();

  if (action === "unlock") {
    const address = await withdrawalAddressModel.unlockAddressChange({
      id: req.params.id,
      note,
      reviewedBy: req.user.id
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Approved withdrawal address not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Withdrawal address unlocked for user update",
      data: address
    });
  }

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be approved or rejected"
    });
  }

  const address = await withdrawalAddressModel.updateStatus({
    id: req.params.id,
    status,
    note,
    reviewedBy: req.user.id
  });

  if (!address) {
    return res.status(404).json({
      success: false,
      message: "Withdrawal address not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: `Withdrawal address ${status}`,
    data: address
  });
};

module.exports = {
  getMyAddress,
  requestAddressCode,
  submitAddress,
  getAdminAddresses,
  updateAddressStatus
};
