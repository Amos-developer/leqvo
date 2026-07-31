const rewardModel = require("../models/reward.model");

const getMyRewards = async (req, res) => {
  const rewards = await rewardModel.getRewardsByUser(req.user.id);

  return res.status(200).json({
    success: true,
    data: rewards
  });
};

module.exports = {
  getMyRewards
};
