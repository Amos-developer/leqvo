const router = require("express").Router();

const copySignalController = require("../controllers/copySignal.controller");
const { requireAdmin, requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get("/preview/:signalCode", requireAuth, asyncHandler(copySignalController.previewSignal));

router.use(requireAuth, requireAdmin);
router.get("/", asyncHandler(copySignalController.getSignals));
router.get("/:id", asyncHandler(copySignalController.getSignal));
router.post("/", asyncHandler(copySignalController.createSignal));
router.patch("/:id", asyncHandler(copySignalController.updateSignal));
router.delete("/:id", asyncHandler(copySignalController.deleteSignal));

module.exports = router;
