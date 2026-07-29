const adminModel = require("../models/admin.model");
const userModel = require("../models/user.model");

const requireAdmin = async (req, res) => {
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

  const users = await adminModel.getUsers();

  return res.status(200).json({
    success: true,
    data: users
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

module.exports = {
  getOverview,
  getUsers,
  getDeposits,
  getWithdrawals
};
