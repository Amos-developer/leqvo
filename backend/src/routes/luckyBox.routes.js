const router = require("express").Router();

const luckyBoxController = require("../controllers/luckyBox.controller");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.use(requireAuth);

router.get("/", asyncHandler(luckyBoxController.getStatus));
router.post("/open", asyncHandler(luckyBoxController.openBox));

module.exports = router;
