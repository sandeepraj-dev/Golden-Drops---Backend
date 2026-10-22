import mongoose from "mongoose";
import { StockLedger, OilType, StorageLocation } from "../models/index.js";
import { nextNumber } from "./numbering.service.js";
import { badRequest, notFound, conflict } from "../utils/apiError.js";
import { writeAudit } from "./audit.service.js";

export async function getStock({ oilTypeId, storageLocationId, session } = {}) {
  const match = {};
  if (oilTypeId) match.oilTypeId = oilTypeId;
  if (storageLocationId) match.storageLocationId = storageLocationId;
  const rows = await StockLedger.aggregate([
    { $match: match },
    { $group: { _id: { oilTypeId: "$oilTypeId", storageLocationId: "$storageLocationId" },
      quantityInKg: { $sum: "$quantityInKg" }, quantityOutKg: { $sum: "$quantityOutKg" } } },
    { $project: { _id: 0, oilTypeId: "$_id.oilTypeId", storageLocationId: "$_id.storageLocationId",
      stockKg: { $subtract: ["$quantityInKg", "$quantityOutKg"] } } }
  ]).session(session || null);
  return rows;
}
export async function stockAt(oilTypeId, storageLocationId, session) {
  // Aggregation pipelines do not automatically cast string IDs to ObjectIds.
  // Sale request payloads commonly contain string IDs, while StockLedger stores ObjectIds.
  // Normalize both IDs before matching so stock is not incorrectly reported as zero.
  let normalizedOilTypeId;
  let normalizedStorageLocationId;
  try {
    normalizedOilTypeId = oilTypeId instanceof mongoose.Types.ObjectId
      ? oilTypeId
      : new mongoose.Types.ObjectId(String(oilTypeId));
    normalizedStorageLocationId = storageLocationId instanceof mongoose.Types.ObjectId
      ? storageLocationId
      : new mongoose.Types.ObjectId(String(storageLocationId));
  } catch {
    throw badRequest("Invalid oilTypeId or storageLocationId for stock lookup");
  }
  const rows = await StockLedger.aggregate([
    { $match: { oilTypeId: normalizedOilTypeId, storageLocationId: normalizedStorageLocationId } },
    { $group: { _id: null, incoming: { $sum: "$quantityInKg" }, outgoing: { $sum: "$quantityOutKg" } } }
  ]).session(session || null);
  return rows.length ? rows[0].incoming - rows[0].outgoing : 0;
}
export async function createMovement(data, actor, session) {
  if (data.quantityInKg < 0 || data.quantityOutKg < 0 || (data.quantityInKg === 0 && data.quantityOutKg === 0)) {
    throw badRequest("Movement must have a positive inbound or outbound quantity");
  }
  if (data.quantityInKg > 0 && data.quantityOutKg > 0) throw badRequest("A movement cannot be both inbound and outbound");
  if (!(await OilType.exists({ _id: data.oilTypeId, isActive: true }).session(session))) throw notFound("Active oil type not found");
  if (!(await StorageLocation.exists({ _id: data.storageLocationId, isActive: true }).session(session))) throw notFound("Active storage location not found");
  if (data.quantityOutKg > 0) {
    // Normalize IDs in stockAt before aggregation; MongoDB aggregation does not cast IDs.
    // The sale flow also validates stock before writing the outbound movement.
    const available = await stockAt(data.oilTypeId, data.storageLocationId, session);
    if (available + 1e-9 < data.quantityOutKg) throw conflict("Insufficient stock", { availableKg: available, requestedKg: data.quantityOutKg });
  }
  const movementNumber = await nextNumber("MOV", data.movementDate || new Date(), session);
  const [movement] = await StockLedger.create([{ ...data, movementNumber, createdBy: actor.id }], session ? { session } : {});
  await writeAudit({ userId: actor.id, action: "STOCK_MOVEMENT", entityType: "StockLedger", entityId: movement._id, after: movement.toObject(), reason: data.notes || "", session });
  return movement;
}
export async function recordOpeningStock(data, actor, session) {
  if (data.quantityKg <= 0) throw badRequest("Opening stock quantity must be positive");
  return createMovement({
    movementDate: data.movementDate || new Date(), oilTypeId: data.oilTypeId, storageLocationId: data.storageLocationId,
    movementType: "OPENING", quantityInKg: data.quantityKg, quantityOutKg: 0,
    unitCostPerKg: data.unitCostPerKg || 0, referenceType: "OPENING_STOCK", notes: data.reason
  }, actor, session);
}
