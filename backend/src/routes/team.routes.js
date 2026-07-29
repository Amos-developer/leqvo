const router = require("express").Router();

const teamController = require("../controllers/team.controller");
const asyncHandler = require("../utils/asyncHandler");

router.get("/:userId", asyncHandler(teamController.getTeam));

module.exports = router;
