const router = require("express").Router();

const rewardController = require("../controllers/reward.controller");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.use(requireAuth);

router.get("/", asyncHandler(rewardController.getMyRewards));

module.exports = router;
