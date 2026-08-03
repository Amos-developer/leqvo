const luckyBoxModel = require("../models/luckyBox.model");

const getStatus = async (req, res) => {
  const status = await luckyBoxModel.getStatus(req.user.id);

  return res.status(200).json({
    success: true,
    data: {
      qualifyingDepositAmount: luckyBoxModel.QUALIFYING_DEPOSIT_AMOUNT,
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

  if (result.noChanceAvailable) {
    return res.status(409).json({
      success: false,
      message: "No earned lucky box chance is available yet. Deposit 100 USDT or more, or invite someone who deposits 100 USDT or more."
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
