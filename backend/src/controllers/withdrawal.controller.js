const withdrawalModel = require("../models/withdrawal.model");

const getMyWithdrawals = async (req, res) => {
  const withdrawals = await withdrawalModel.findWithdrawalsByUserId(req.user.id);

  return res.status(200).json({
    success: true,
    data: withdrawals
  });
};

module.exports = {
  getMyWithdrawals
};
