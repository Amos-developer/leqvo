const luckyBoxModel = require("../models/luckyBox.model");

const getStatus = async (req, res) => {
  const status = await luckyBoxModel.getStatus(req.user.id);

  return res.status(200).json({
    success: true,
    data: {
      prizes: luckyBoxModel.prizes,
      ...status
    }
  });
};

const openBox = async (req, res) => {
  const boxNumber = Number(req.body.boxNumber);

  if (!Number.isInteger(boxNumber) || boxNumber < 1 || boxNumber > 9) {
    return res.status(400).json({
      success: false,
      message: "Select a valid lucky box from 1 to 9."
    });
  }

  const result = await luckyBoxModel.openBox({
    user: req.user,
    boxNumber
  });

  if (result.alreadyOpened) {
    return res.status(409).json({
      success: false,
      message: "You already opened your lucky box today. Come back tomorrow.",
      data: result.reward
    });
  }

  return res.status(200).json({
    success: true,
    message: "Lucky box opened successfully",
    data: result
  });
};

module.exports = {
  getStatus,
  openBox
};
