const router = require("express").Router();

const tradeController = require("../controllers/trade.controller");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.post("/", requireAuth, asyncHandler(tradeController.createTrade));
router.get("/my", requireAuth, asyncHandler(tradeController.getMyTrades));

module.exports = router;
