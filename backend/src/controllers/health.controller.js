const healthModel = require("../models/health.model");

const getHealthStatus = async (req, res) => {
  const database = await healthModel.getDatabaseStatus();

  res.status(200).json({
    success: true,
    message: "Leqvo API is healthy",
    data: {
      api: "ok",
      database
    }
  });
};

module.exports = {
  getHealthStatus
};
