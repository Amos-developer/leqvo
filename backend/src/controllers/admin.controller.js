const adminModel = require("../models/admin.model");
const userModel = require("../models/user.model");
const teamModel = require("../models/team.model");
const depositModel = require("../models/deposit.model");
const bcrypt = require("bcryptjs");

const PASSWORD_SALT_ROUNDS = 10;

const generateUserId = () => `LEQ-${Math.floor(100000 + Math.random() * 900000)}`;
const generateReferralCode = () => String(Math.floor(100000 + Math.random() * 900000));

const createUniqueUserId = async () => {
  let id = generateUserId();
  let existingUser = await userModel.findUserById(id);

  while (existingUser) {
    id = generateUserId();
    existingUser = await userModel.findUserById(id);
  }

  return id;
};

const createUniqueReferralCode = async () => {
  let referralCode = generateReferralCode();
  let existingUser = await userModel.findUserByReferralCode(referralCode);

  while (existingUser) {
    referralCode = generateReferralCode();
    existingUser = await userModel.findUserByReferralCode(referralCode);
  }

  return referralCode;
};

const requireAdmin = async (req, res) => {
  if (req.user?.isAdmin) {
    return req.user;
  }

  const adminUserId = req.headers["x-user-id"];

  if (!adminUserId) {
    res.status(401).json({
      success: false,
      message: "Admin user id is required"
    });
    return null;
  }

  const user = await userModel.findUserById(adminUserId);

  if (!user?.isAdmin) {
    res.status(403).json({
      success: false,
      message: "Admin access required"
    });
    return null;
  }

  return user;
};

const getOverview = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const overview = await adminModel.getOverview();

  return res.status(200).json({
    success: true,
    data: overview
  });
};

const getUsers = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const [users, summary] = await Promise.all([
    adminModel.getUsers(),
    adminModel.getUserSummary()
  ]);

  return res.status(200).json({
    success: true,
    data: {
      users,
      summary
    }
  });
};

const getUserDetails = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const details = await adminModel.getUserDetails(req.params.id);

  if (!details) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  return res.status(200).json({
    success: true,
    data: details
  });
};

const getBalanceAudit = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const audit = await adminModel.getBalanceAudit(req.params.id);

  if (!audit) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  return res.status(200).json({
    success: true,
    data: audit
  });
};

const createUser = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const username = req.body.username?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;
  const requestedReferralCode = req.body.referralCode?.trim();
  const inviterCode = req.body.inviterCode?.trim();

  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Username, email, and password are required"
    });
  }

  if (!/^[A-Za-z]{3,20}$/.test(username)) {
    return res.status(400).json({
      success: false,
      message: "Username must be 3-20 English letters only"
    });
  }

  if (requestedReferralCode && !/^\d{6}$/.test(requestedReferralCode)) {
    return res.status(400).json({
      success: false,
      message: "Referral code must be exactly 6 numbers"
    });
  }

  if (await userModel.findUserByEmail(email)) {
    return res.status(409).json({
      success: false,
      message: "A user with this email already exists"
    });
  }

  if (requestedReferralCode && await userModel.findUserByReferralCode(requestedReferralCode)) {
    return res.status(409).json({
      success: false,
      message: "Referral code is already in use"
    });
  }

  const inviter = inviterCode ? await userModel.findUserByReferralCode(inviterCode) : null;
  const referralCode = requestedReferralCode || await createUniqueReferralCode();
  const user = await adminModel.createUser({
    id: await createUniqueUserId(),
    username,
    email,
    password: await bcrypt.hash(password, PASSWORD_SALT_ROUNDS),
    referralCode,
    referredBy: inviter?.id || null,
    includeTrialBonus: false,
    balance: Number(req.body.balance || 0),
    isAdmin: Boolean(req.body.isAdmin),
    emailVerified: Boolean(req.body.emailVerified)
  });

  if (inviter) {
    await teamModel.createTeamLinks({ inviterId: inviter.id, memberId: user.id });
  }

  return res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user
  });
};

const updateUser = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const payload = {
    id: req.params.id,
    username: req.body.username?.trim() || undefined,
    email: req.body.email?.trim().toLowerCase() || undefined,
    balance: req.body.balance === undefined ? undefined : Number(req.body.balance),
    isAdmin: req.body.isAdmin === undefined ? undefined : Boolean(req.body.isAdmin),
    emailVerified: req.body.emailVerified === undefined ? undefined : Boolean(req.body.emailVerified),
    password: req.body.password ? await bcrypt.hash(req.body.password, PASSWORD_SALT_ROUNDS) : undefined
  };

  if (payload.username && !/^[A-Za-z]{3,20}$/.test(payload.username)) {
    return res.status(400).json({
      success: false,
      message: "Username must be 3-20 English letters only"
    });
  }

  const user = await adminModel.updateUser(payload);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: user
  });
};

const deleteUser = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  if (req.params.id === admin.id) {
    return res.status(400).json({
      success: false,
      message: "You cannot delete your own admin account"
    });
  }

  const user = await adminModel.deleteUser(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "User deleted successfully"
  });
};

const getDeposits = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const deposits = await adminModel.getDeposits();

  return res.status(200).json({
    success: true,
    data: deposits
  });
};

const refreshDeposit = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const deposit = await adminModel.getDeposits().then((items) => items.find((item) => Number(item.id) === Number(req.params.id)));

  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: "Deposit not found"
    });
  }

  const updatedDeposit = await depositModel.refreshDepositStatus(deposit.paymentId);

  return res.status(200).json({
    success: true,
    message: "Deposit refreshed from NOWPayments",
    data: updatedDeposit
  });
};

const creditDeposit = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const deposit = await adminModel.creditDeposit(req.params.id);

  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: "Deposit not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Deposit credited manually",
    data: deposit
  });
};

const updateDeposit = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const payload = {
    priceAmount: req.body.priceAmount === undefined ? undefined : Number(req.body.priceAmount),
    payAmount: req.body.payAmount === undefined ? undefined : Number(req.body.payAmount),
    actuallyPaid: req.body.actuallyPaid === undefined ? undefined : Number(req.body.actuallyPaid),
    actuallyPaidAtFiat: req.body.actuallyPaidAtFiat === undefined ? undefined : Number(req.body.actuallyPaidAtFiat),
    payCurrency: req.body.payCurrency?.trim().toLowerCase(),
    payNetwork: req.body.payNetwork?.trim().toLowerCase(),
    paymentId: req.body.paymentId?.trim(),
    payAddress: req.body.payAddress?.trim(),
    status: req.body.status?.trim().toLowerCase()
  };

  const deposit = await adminModel.updateDeposit(req.params.id, payload);

  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: "Deposit not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Deposit updated successfully",
    data: deposit
  });
};

const deleteDeposit = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const deposit = await adminModel.deleteDeposit(req.params.id);

  if (!deposit) {
    return res.status(404).json({
      success: false,
      message: "Deposit not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Deposit deleted successfully"
  });
};

const getWithdrawals = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const withdrawals = await adminModel.getWithdrawals();

  return res.status(200).json({
    success: true,
    data: withdrawals
  });
};

const getTrades = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const trades = await adminModel.getTrades();

  return res.status(200).json({
    success: true,
    data: trades
  });
};

const getTradeAutomations = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const automations = await adminModel.getTradeAutomations();

  return res.status(200).json({
    success: true,
    data: automations
  });
};

const getTransactions = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const transactions = await adminModel.getTransactions();

  return res.status(200).json({
    success: true,
    data: transactions
  });
};

const getLeaders = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const leaders = await adminModel.getLeaders();

  return res.status(200).json({
    success: true,
    data: leaders
  });
};

const grantLeadershipReward = async (req, res) => {
  const admin = await requireAdmin(req, res);

  if (!admin) {
    return;
  }

  const amount = Number(req.body.amount);
  const rewardType = req.body.rewardType || "custom";

  if (!req.params.userId || !Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "User and valid reward amount are required"
    });
  }

  const result = await adminModel.grantLeadershipReward({
    userId: req.params.userId,
    rewardType,
    amount,
    note: req.body.note,
    grantedBy: admin.id
  });

  if (!result) {
    return res.status(404).json({
      success: false,
      message: "Leader user not found"
    });
  }

  return res.status(200).json({
    success: true,
    message: "Leadership reward granted successfully",
    data: result
  });
};

module.exports = {
  getOverview,
  getUsers,
  getUserDetails,
  getBalanceAudit,
  createUser,
  updateUser,
  deleteUser,
  getDeposits,
  refreshDeposit,
  creditDeposit,
  updateDeposit,
  deleteDeposit,
  getWithdrawals,
  getTrades,
  getTradeAutomations,
  getTransactions,
  getLeaders,
  grantLeadershipReward
};
