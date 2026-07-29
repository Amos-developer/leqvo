const teamModel = require("../models/team.model");
const userModel = require("../models/user.model");

const getTeam = async (req, res) => {
  const user = await userModel.findUserById(req.params.userId);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found"
    });
  }

  const team = await teamModel.getTeamOverview(req.params.userId);

  return res.status(200).json({
    success: true,
    data: team
  });
};

module.exports = {
  getTeam
};
