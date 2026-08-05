const router = require("express").Router();

const tradeAutomationController = require("../controllers/tradeAutomation.controller");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.get("/", requireAuth, asyncHandler(tradeAutomationController.getMyAutomations));
router.post("/", requireAuth, asyncHandler(tradeAutomationController.createAutomation));
router.patch("/:id", requireAuth, asyncHandler(tradeAutomationController.updateAutomation));
router.delete("/:id", requireAuth, asyncHandler(tradeAutomationController.deleteAutomation));

module.exports = router;
