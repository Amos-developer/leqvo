const router = require("express").Router();

const teamController = require("../controllers/team.controller");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.use(requireAuth);

router.get("/:userId", asyncHandler(teamController.getTeam));

module.exports = router;
