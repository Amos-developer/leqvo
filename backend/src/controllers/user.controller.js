const userModel = require("../models/user.model");

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

  const user = await userModel.createUser({
    username,
    email,
    password,
    referralCode
  });

  return res.status(201).json({
    success: true,
    message: "User created successfully",
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
  getUsers,
  getUserById
};
