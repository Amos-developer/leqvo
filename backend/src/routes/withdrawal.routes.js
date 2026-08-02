const router = require("express").Router();

const withdrawalController = require("../controllers/withdrawal.controller");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get("/my", requireAuth, asyncHandler(withdrawalController.getMyWithdrawals));

module.exports = router;
