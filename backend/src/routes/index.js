const router = require("express").Router();

const healthRoutes = require("./health.routes");
const userRoutes = require("./user.routes");
const depositRoutes = require("./deposit.routes");
const withdrawalRoutes = require("./withdrawal.routes");
const withdrawalAddressRoutes = require("./withdrawalAddress.routes");
const tradeRoutes = require("./trade.routes");
const marketRoutes = require("./market.routes");
const adminRoutes = require("./admin.routes");
const teamRoutes = require("./team.routes");
const luckyBoxRoutes = require("./luckyBox.routes");
const dailySpinRoutes = require("./dailySpin.routes");
const rewardRoutes = require("./reward.routes");
const kycRoutes = require("./kyc.routes");

router.use("/health", healthRoutes);
router.use("/users", userRoutes);
router.use("/deposits", depositRoutes);
router.use("/withdrawals", withdrawalRoutes);
router.use("/withdrawal-addresses", withdrawalAddressRoutes);
router.use("/trades", tradeRoutes);
router.use("/markets", marketRoutes);
router.use("/admin", adminRoutes);
router.use("/teams", teamRoutes);
router.use("/lucky-box", luckyBoxRoutes);
router.use("/daily-spin", dailySpinRoutes);
router.use("/rewards", rewardRoutes);
router.use("/kyc", kycRoutes);

module.exports = router;
