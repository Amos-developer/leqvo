const router = require("express").Router();

const userController = require("../controllers/user.controller");
const asyncHandler = require("../utils/asyncHandler");

router.post("/", asyncHandler(userController.createUser));
router.post("/login", asyncHandler(userController.loginUser));
router.get("/", asyncHandler(userController.getUsers));
router.get("/:id", asyncHandler(userController.getUserById));

module.exports = router;
