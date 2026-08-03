const router = require("express").Router();

const copySignalController = require("../controllers/copySignal.controller");
const { requireAdmin, requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get("/preview/:signalCode", requireAuth, asyncHandler(copySignalController.previewSignal));

router.use(requireAuth, requireAdmin);
router.get("/", asyncHandler(copySignalController.getSignals));
router.post("/", asyncHandler(copySignalController.createSignal));

module.exports = router;
