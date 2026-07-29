const router = require("express").Router();

const healthRoutes = require("./health.routes");
const userRoutes = require("./user.routes");
const depositRoutes = require("./deposit.routes");
const marketRoutes = require("./market.routes");
const adminRoutes = require("./admin.routes");

router.use("/health", healthRoutes);
router.use("/users", userRoutes);
router.use("/deposits", depositRoutes);
router.use("/markets", marketRoutes);
router.use("/admin", adminRoutes);

module.exports = router;
