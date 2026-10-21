import jwt from "jsonwebtoken";
import { env } from "../config/environment.js";
import { User } from "../models/User.js";
import { unauthorized, forbidden } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) throw unauthorized();
  let payload;
  try { payload = jwt.verify(header.slice(7), env.JWT_SECRET); }
  catch { throw unauthorized("Invalid or expired access token"); }
  const user = await User.findById(payload.sub).select("-passwordHash");
  if (!user || !user.isActive) throw unauthorized("User is inactive or no longer exists");
  req.user = user;
  next();
});

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};
