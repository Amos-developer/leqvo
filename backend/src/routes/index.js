const router = require("express").Router();

const healthRoutes = require("./health.routes");
const userRoutes = require("./user.routes");

router.use("/health", healthRoutes);
router.use("/users", userRoutes);

module.exports = router;
