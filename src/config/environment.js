import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(15).default(12),
  CORS_ORIGINS: z.string().default("http://localhost:3000"),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(200),
  BUSINESS_NAME: z.string().default("Oil Mill"),
  BUSINESS_ADDRESS: z.string().default(""),
  BUSINESS_PHONE: z.string().default(""),
  BUSINESS_EMAIL: z.string().default(""),
  BUSINESS_GSTIN: z.string().default(""),
  BUSINESS_TIMEZONE: z.string().default("Asia/Kolkata"),
  INITIAL_ADMIN_NAME: z.string().default("System Administrator"),
  INITIAL_ADMIN_USERNAME: z.string().default("admin"),
  INITIAL_ADMIN_EMAIL: z.string().email().default("admin@example.com"),
  INITIAL_ADMIN_PASSWORD: z.string().min(12).optional(),
  ALLOW_PUBLIC_REGISTRATION: z.enum(["true", "false"]).default("false")
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  throw new Error("Environment configuration is invalid. Check .env.example.");
}
export const env = parsed.data;
