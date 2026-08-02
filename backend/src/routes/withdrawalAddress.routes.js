const router = require("express").Router();

const withdrawalAddressController = require("../controllers/withdrawalAddress.controller");
const { requireAdmin, requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get("/", requireAuth, asyncHandler(withdrawalAddressController.getMyAddress));
router.post("/code", requireAuth, asyncHandler(withdrawalAddressController.requestAddressCode));
router.post("/", requireAuth, asyncHandler(withdrawalAddressController.submitAddress));
router.get("/admin", requireAuth, requireAdmin, asyncHandler(withdrawalAddressController.getAdminAddresses));
router.patch("/admin/:id", requireAuth, requireAdmin, asyncHandler(withdrawalAddressController.updateAddressStatus));

module.exports = router;
