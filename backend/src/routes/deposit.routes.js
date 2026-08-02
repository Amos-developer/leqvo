const router = require("express").Router();

const depositController = require("../controllers/deposit.controller");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get("/my", requireAuth, asyncHandler(depositController.getMyDeposits));
router.post("/create", asyncHandler(depositController.createDeposit));
router.post("/ipn", asyncHandler(depositController.handleNowPaymentsIpn));
router.post("/:paymentId/refresh", asyncHandler(depositController.refreshDepositStatus));

module.exports = router;
