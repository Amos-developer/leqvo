const bcrypt = require("bcryptjs");
const userModel = require("../models/user.model");
const teamModel = require("../models/team.model");
const jwt = require("../utils/jwt");

const PASSWORD_SALT_ROUNDS = 10;

const generateUserId = () => {
  const numbers = Math.floor(100000 + Math.random() * 900000);

  return `LEQ-${numbers}`;
};

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

const createUser = async (req, res) => {
  const username = req.body.username?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;
  const inviterCode = req.body.inviterCode?.trim();

  if (!username || !email || !password || !inviterCode) {
    return res.status(400).json({
      success: false,
      message: "Username, email, password, and referral code are required"
    });
  }

  if (!/^\d{6}$/.test(inviterCode)) {
    return res.status(400).json({
      success: false,
      message: "Referral code must be exactly 6 numbers"
    });
  }

  const existingUser = await userModel.findUserByEmail(email);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: "A user with this email already exists"
    });
  }

  const id = await createUniqueUserId();
  const referralCode = await createUniqueReferralCode();
  const inviter = await userModel.findUserByReferralCode(inviterCode);

  if (!inviter) {
    return res.status(404).json({
      success: false,
      message: "Invalid referral code"
    });
  }
  const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  const user = await userModel.createUser({
    id,
    username,
    email,
    password: hashedPassword,
    referralCode,
    referredBy: inviter?.id || null
  });

  if (inviter) {
    await teamModel.createTeamLinks({ inviterId: inviter.id, memberId: user.id });
  }

  return res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user,
    token: jwt.sign({ id: user.id, isAdmin: user.isAdmin })
  });
};

const loginUser = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required. Please fill both fields and try again."
    });
  }

  const user = await userModel.findUserWithPasswordByEmail(email);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  delete user.password;

  return res.status(200).json({
    success: true,
    message: "Login successful",
    data: user,
    token: jwt.sign({ id: user.id, isAdmin: user.isAdmin })
  });
};

const getUsers = async (req, res) => {
  const users = await userModel.findAllUsers();

  return res.status(200).json({
    success: true,
    data: users
  });
};

const getUserById = async (req, res) => {
  const user = await userModel.findUserById(req.params.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  return res.status(200).json({
    success: true,
    data: user
  });
};

const updateMyProfile = async (req, res) => {
  const username = req.body.username?.trim();

  if (!username) {
    return res.status(400).json({
      success: false,
      message: "Username is required"
    });
  }

  if (!/^[A-Za-z]{3,20}$/.test(username)) {
    return res.status(400).json({
      success: false,
      message: "Username must be 3-20 English letters only"
    });
  }

  const existingUser = await userModel.findUserByUsername(username);

  if (existingUser && existingUser.id !== req.user.id) {
    return res.status(409).json({
      success: false,
      message: "This username is already taken"
    });
  }

  const user = await userModel.updateUserProfile({
    id: req.user.id,
    username
  });

  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: user
  });
};

const generateSixDigitCode = () => String(Math.floor(100000 + Math.random() * 900000));

const requestPasswordChangeCode = async (req, res) => {
  const user = await userModel.findUserById(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const record = await userModel.createPasswordChangeCode({
    userId: user.id,
    code,
    expiresAt
  });

  return res.status(200).json({
    success: true,
    message: `Verification code requested for ${user.email}`,
    data: {
      email: user.email,
      expiresAt: record.expiresAt,
      code: process.env.NODE_ENV === "production" ? undefined : code
    }
  });
};

const changeMyPassword = async (req, res) => {
  const oldPassword = req.body.oldPassword;
  const newPassword = req.body.newPassword;
  const confirmPassword = req.body.confirmPassword;
  const code = req.body.code?.trim();

  if (!oldPassword || !newPassword || !confirmPassword || !code) {
    return res.status(400).json({
      success: false,
      message: "Code, old password, new password, and confirmation are required"
    });
  }

  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({
      success: false,
      message: "Email code must be exactly 6 numbers"
    });
  }

  if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(newPassword)) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 8 characters and include a letter and number"
    });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "New password and confirmation do not match"
    });
  }

  if (oldPassword === newPassword) {
    return res.status(400).json({
      success: false,
      message: "New password must be different from old password"
    });
  }

  const user = await userModel.findUserWithPasswordByEmail(req.user.email);
  const passwordMatches = user ? await bcrypt.compare(oldPassword, user.password) : false;

  if (!passwordMatches) {
    return res.status(401).json({
      success: false,
      message: "Old password is incorrect"
    });
  }

  const codeRecord = await userModel.findValidPasswordChangeCode({
    userId: req.user.id,
    code
  });

  if (!codeRecord) {
    return res.status(400).json({
      success: false,
      message: "Invalid or expired email code"
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
  const updatedUser = await userModel.changePassword({
    userId: req.user.id,
    password: hashedPassword,
    codeId: codeRecord.id
  });

  return res.status(200).json({
    success: true,
    message: "Password changed successfully",
    data: updatedUser
  });
};

const transferBalance = async (req, res) => {
  const fromAccount = req.body.fromAccount?.trim().toLowerCase();
  const toAccount = req.body.toAccount?.trim().toLowerCase();
  const amount = Number(req.body.amount);
  const allowedAccounts = ["main", "trading"];

  if (!allowedAccounts.includes(fromAccount) || !allowedAccounts.includes(toAccount)) {
    return res.status(400).json({
      success: false,
      message: "Choose a valid source and destination account"
    });
  }

  if (fromAccount === toAccount) {
    return res.status(400).json({
      success: false,
      message: "Source and destination account must be different"
    });
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid transfer amount"
    });
  }

  const result = await userModel.transferBalance({
    userId: req.user.id,
    fromAccount,
    toAccount,
    amount
  });

  return res.status(200).json({
    success: true,
    message: "Transfer completed successfully",
    data: result
  });
};

const getMyTransfers = async (req, res) => {
  const [transfers, eligibility] = await Promise.all([
    userModel.findTransfersByUserId(req.user.id),
    userModel.getTradingEligibility(req.user.id)
  ]);

  return res.status(200).json({
    success: true,
    data: {
      transfers,
      eligibility
    }
  });
};

module.exports = {
  createUser,
  loginUser,
  getUsers,
  getUserById,
  updateMyProfile,
  requestPasswordChangeCode,
  changeMyPassword,
  transferBalance,
  getMyTransfers
};
