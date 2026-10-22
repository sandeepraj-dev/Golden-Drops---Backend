import OilType from "../models/OilType.js";
import { AppError } from "../utils/AppError.js";

const ALLOWED_FIELDS = ["name", "description", "unit", "isActive"];

export async function updateOilType(id, input) {
  const updates = {};

  for (const field of ALLOWED_FIELDS) {
    if (Object.hasOwn(input, field)) {
      updates[field] = input[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("No valid fields provided", 400);
  }

  const oilType = await OilType.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!oilType) {
    throw new AppError("Oil type not found", 404);
  }

  return oilType;
}

export async function deactivateOilType(id) {
  const oilType = await OilType.findById(id);

  if (!oilType) {
    throw new AppError("Oil type not found", 404);
  }

  // Preserve historical purchases, sales and prices.
  oilType.isActive = false;
  await oilType.save();

  return oilType;
}
