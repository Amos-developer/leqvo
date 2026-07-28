const router = require("express").Router();

const marketController = require("../controllers/market.controller");
const asyncHandler = require("../utils/asyncHandler");

router.get("/popular", asyncHandler(marketController.getPopularCrypto));

module.exports = router;
