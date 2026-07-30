const jwt = require("../utils/jwt");
const userModel = require("../models/user.model");

const getBearerToken = (req) => {
  const authorization = req.headers.authorization || "";

  if (!authorization.startsWith("Bearer ")) {
    return "";
  }

  return authorization.slice(7).trim();
};

const requireAuth = async (req, res, next) => {
  try {
    const payload = jwt.verify(getBearerToken(req));

    if (!payload?.id) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again."
      });
    }

    const user = await userModel.findUserById(payload.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Session user was not found. Please login again."
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user?.isAdmin) {
    return res.status(403).json({
      success: false,
      message: "Admin access required"
    });
  }

  return next();
};

module.exports = {
  requireAuth,
  requireAdmin
};
