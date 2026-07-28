const marketModel = require("../models/market.model");

const getPopularCrypto = async (req, res) => {
  const markets = await marketModel.fetchPopularCrypto();

  return res.status(200).json({
    success: true,
    data: markets
  });
};

module.exports = {
  getPopularCrypto
};
