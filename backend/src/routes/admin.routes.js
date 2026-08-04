const router = require("express").Router();

const adminController = require("../controllers/admin.controller");
const { requireAuth, requireAdmin } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.use(requireAuth, requireAdmin);

router.get("/overview", asyncHandler(adminController.getOverview));
router.get("/users", asyncHandler(adminController.getUsers));
router.get("/users/:id", asyncHandler(adminController.getUserDetails));
router.get("/users/:id/balance-audit", asyncHandler(adminController.getBalanceAudit));
router.post("/users", asyncHandler(adminController.createUser));
router.patch("/users/:id", asyncHandler(adminController.updateUser));
router.delete("/users/:id", asyncHandler(adminController.deleteUser));
router.get("/leaders", asyncHandler(adminController.getLeaders));
router.post("/leaders/:userId/rewards", asyncHandler(adminController.grantLeadershipReward));
router.get("/deposits", asyncHandler(adminController.getDeposits));
router.post("/deposits/:id/refresh", asyncHandler(adminController.refreshDeposit));
router.post("/deposits/:id/credit", asyncHandler(adminController.creditDeposit));
router.patch("/deposits/:id", asyncHandler(adminController.updateDeposit));
router.delete("/deposits/:id", asyncHandler(adminController.deleteDeposit));
router.get("/withdrawals", asyncHandler(adminController.getWithdrawals));
router.get("/trades", asyncHandler(adminController.getTrades));

module.exports = router;
