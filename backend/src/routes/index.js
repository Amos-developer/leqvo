const router = require("express").Router();

const healthRoutes = require("./health.routes");
const userRoutes = require("./user.routes");
const depositRoutes = require("./deposit.routes");
const marketRoutes = require("./market.routes");

router.use("/health", healthRoutes);
router.use("/users", userRoutes);
router.use("/deposits", depositRoutes);
router.use("/markets", marketRoutes);

module.exports = router;
