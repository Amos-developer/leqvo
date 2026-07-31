const router = require("express").Router();

const dailySpinController = require("../controllers/dailySpin.controller");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.use(requireAuth);

router.get("/", asyncHandler(dailySpinController.getStatus));
router.post("/spin", asyncHandler(dailySpinController.spin));

module.exports = router;
