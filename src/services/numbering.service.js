import mongoose from "mongoose";
import { conflict } from "../utils/apiError.js";

const counterSchema = new mongoose.Schema({
  _id: String, seq: { type: Number, default: 0 }
}, { versionKey: false });
const Counter = mongoose.models.Counter || mongoose.model("Counter", counterSchema);

export async function nextNumber(prefix, date = new Date(), session) {
  const year = new Intl.DateTimeFormat("en", { timeZone: "Asia/Kolkata", year: "numeric" }).format(date);
  const key = `${prefix}-${year}`;
  const options = { new: true, upsert: true, setDefaultsOnInsert: true };
  if (session) options.session = session;
  try {
    const counter = await Counter.findOneAndUpdate({ _id: key }, { $inc: { seq: 1 } }, options);
    return `${prefix}-${year}-${String(counter.seq).padStart(6, "0")}`;
  } catch (err) { throw conflict("Could not generate transaction number", { cause: err.message }); }
}
