import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/environment.js";
import { connectDatabase } from "../config/database.js";
import { User } from "../models/User.js";
import { unauthorized } from "../utils/apiError.js";

export async function login({ username, password }) {
  await connectDatabase();

  const user = await User.findOne({
    username: String(username ?? "")
      .trim()
      .toLowerCase(),
  }).select("+passwordHash");

  if (
    !user ||
    !user.isActive ||
    !(await bcrypt.compare(password ?? "", user.passwordHash))
  ) {
    throw unauthorized("Invalid username or password");
  }

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN },
  );

  return {
    accessToken,
    tokenType: "Bearer",
    expiresIn: env.JWT_EXPIRES_IN,
    user: user.toSafeJSON(),
  };
}

export async function createUser(data, actorRole) {
  await connectDatabase();

  if (data.role === "ADMIN" && actorRole !== "ADMIN") {
    throw unauthorized("Only an administrator may create an administrator");
  }

  const passwordHash = await bcrypt.hash(data.password, env.BCRYPT_ROUNDS);

  const user = await User.create({ ...data, passwordHash });

  return user.toSafeJSON();
}
