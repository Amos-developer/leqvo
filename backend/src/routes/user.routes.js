const router = require("express").Router();

const userController = require("../controllers/user.controller");
const { requireAuth } = require("../middlewares/auth");
const asyncHandler = require("../utils/asyncHandler");

router.post("/", asyncHandler(userController.createUser));
router.post("/login", asyncHandler(userController.loginUser));
router.post("/transfer", requireAuth, asyncHandler(userController.transferBalance));
router.get("/transfers", requireAuth, asyncHandler(userController.getMyTransfers));
router.get("/", asyncHandler(userController.getUsers));
router.get("/:id", asyncHandler(userController.getUserById));

module.exports = router;
