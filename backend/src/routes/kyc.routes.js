const router = require("express").Router();

const kycController = require("../controllers/kyc.controller");
const { requireAdmin, requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get("/", requireAuth, asyncHandler(kycController.getMyKyc));
router.post("/", requireAuth, asyncHandler(kycController.submitKyc));
router.get("/admin", requireAuth, requireAdmin, asyncHandler(kycController.getAdminKyc));
router.patch("/admin/:id", requireAuth, requireAdmin, asyncHandler(kycController.updateKycStatus));

module.exports = router;
