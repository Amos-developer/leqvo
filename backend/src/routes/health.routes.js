const router = require("express").Router();

const healthController = require("../controllers/health.controller");
const asyncHandler = require("../utils/asyncHandler");

router.get("/", asyncHandler(healthController.getHealthStatus));

module.exports = router;
