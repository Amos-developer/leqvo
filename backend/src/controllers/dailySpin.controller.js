const dailySpinModel = require("../models/dailySpin.model");

const getStatus = async (req, res) => {
  const status = await dailySpinModel.getStatus(req.user.id);

  return res.status(200).json({
    success: true,
    data: status
  });
};

const spin = async (req, res) => {
  const result = await dailySpinModel.spin(req.user);

  if (result.alreadySpun) {
    return res.status(409).json({
      success: false,
      message: "You already used today’s spin. Come back tomorrow.",
      data: result.spin
    });
  }

  return res.status(200).json({
    success: true,
    message: "Daily spin completed",
    data: result
  });
};

module.exports = {
  getStatus,
  spin
};
