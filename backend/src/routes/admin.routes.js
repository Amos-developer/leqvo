const router = require("express").Router();

const adminController = require("../controllers/admin.controller");
const asyncHandler = require("../utils/asyncHandler");

router.get("/overview", asyncHandler(adminController.getOverview));
router.get("/users", asyncHandler(adminController.getUsers));
router.get("/deposits", asyncHandler(adminController.getDeposits));
router.get("/withdrawals", asyncHandler(adminController.getWithdrawals));

module.exports = router;
