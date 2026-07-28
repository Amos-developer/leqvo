const bcrypt = require("bcryptjs");
const userModel = require("../models/user.model");

const PASSWORD_SALT_ROUNDS = 10;

const generateUserId = () => {
  const numbers = Math.floor(100000 + Math.random() * 900000);

  return `LEQ-${numbers}`;
};

const createUniqueUserId = async () => {
  let id = generateUserId();
  let existingUser = await userModel.findUserById(id);

  while (existingUser) {
    id = generateUserId();
    existingUser = await userModel.findUserById(id);
  }

  return id;
};

const createUser = async (req, res) => {
  const { username, email, password, referralCode } = req.body;

  if (!username || !email || !password || !referralCode) {
    return res.status(400).json({
      success: false,
      message: "Username, email, password, and referralCode are required"
    });
  }

  if (!/^\d{6}$/.test(referralCode)) {
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

  const existingReferralCode = await userModel.findUserByReferralCode(referralCode);

  if (existingReferralCode) {
    return res.status(409).json({
      success: false,
      message: "Referral code is already in use"
    });
  }

  const id = await createUniqueUserId();
  const hashedPassword = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
  const user = await userModel.createUser({
    id,
    username,
    email,
    password: hashedPassword,
    referralCode
  });

  return res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user
  });
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required"
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
    data: user
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

module.exports = {
  createUser,
  loginUser,
  getUsers,
  getUserById
};
