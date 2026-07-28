const router = require("express").Router();

const depositController = require("../controllers/deposit.controller");
const asyncHandler = require("../utils/asyncHandler");

router.post("/create", asyncHandler(depositController.createDeposit));
router.post("/ipn", asyncHandler(depositController.handleNowPaymentsIpn));
router.post("/:paymentId/refresh", asyncHandler(depositController.refreshDepositStatus));

module.exports = router;
