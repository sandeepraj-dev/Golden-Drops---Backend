import mongoose from "mongoose";
import { conflict } from "../utils/apiError.js";

const schema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  method: { type: String, required: true },
  path: { type: String, required: true },
  statusCode: Number,
  responseBody: mongoose.Schema.Types.Mixed,
  requestHash: { type: String, required: true },
  expiresAt: { type: Date, expires: 0, default: () => new Date(Date.now() + 86400000) }
}, { timestamps: true });
export const IdempotencyRecord = mongoose.models.IdempotencyRecord || mongoose.model("IdempotencyRecord", schema);

export function requireIdempotencyKey(req, _res, next) {
  if (!req.get("Idempotency-Key")) return next(conflict("Idempotency-Key header is required for this operation"));
  next();
}
