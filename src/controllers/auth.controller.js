import bcrypt from "bcryptjs";
import { env } from "../config/environment.js";
import { User } from "../models/User.js";
import { login } from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { conflict, forbidden } from "../utils/apiError.js";

export const loginController = asyncHandler(async (req,res) => res.json({success:true,data:await login(req.body)}));
export const setupAdminController = asyncHandler(async (req,res) => {
  if (await User.exists({role:"ADMIN"})) throw conflict("Initial administrator has already been configured");
  if (!env.INITIAL_ADMIN_PASSWORD) throw forbidden("Set INITIAL_ADMIN_PASSWORD in environment before running setup");
  const passwordHash = await bcrypt.hash(env.INITIAL_ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
  const user = await User.create({name:env.INITIAL_ADMIN_NAME,username:env.INITIAL_ADMIN_USERNAME,email:env.INITIAL_ADMIN_EMAIL,passwordHash,role:"ADMIN"});
  res.status(201).json({success:true,message:"Initial administrator created. Disable setup access after bootstrap.",data:user.toSafeJSON()});
});
