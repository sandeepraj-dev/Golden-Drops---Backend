import mongoose from "mongoose";
import { StockLedger, OilType, StorageLocation, Purchase, Sale } from "../models/index.js";
import { nextNumber } from "./numbering.service.js";
import { badRequest, notFound, conflict } from "../utils/apiError.js";
import { writeAudit } from "./audit.service.js";

export async function getStock({ oilTypeId, storageLocationId, session } = {}) {
  const pairs = new Map();
  const addPair = (oil, location) => {
    if (!oil || !location) return;
    const oilId = String(oil);
    const locationId = String(location);
    if (oilTypeId && oilId !== String(oilTypeId)) return;
    if (storageLocationId && locationId !== String(storageLocationId)) return;
    pairs.set(`${oilId}:${locationId}`, { oilTypeId: oilId, storageLocationId: locationId });
  };

  const ledgerQuery = StockLedger.find({
    ...(oilTypeId ? { oilTypeId } : {}),
    ...(storageLocationId ? { storageLocationId } : {})
  }).select("oilTypeId storageLocationId").session(session || null).lean();
  const purchaseQuery = Purchase.find({ status: { $ne: "REVERSED" } }).select("items.oilTypeId items.storageLocationId").session(session || null).lean();
  const saleQuery = Sale.find({ status: { $ne: "REVERSED" } }).select("items.oilTypeId items.storageLocationId").session(session || null).lean();
  const [ledger, purchases, sales] = await Promise.all([ledgerQuery, purchaseQuery, saleQuery]);
  for (const row of ledger) addPair(row.oilTypeId, row.storageLocationId);
  for (const doc of [...purchases, ...sales]) for (const item of (doc.items || [])) addPair(item.oilTypeId, item.storageLocationId);

  const rows = [];
  for (const pair of pairs.values()) {
    const stockKg = await stockAt(pair.oilTypeId, pair.storageLocationId, session);
    rows.push({ ...pair, stockKg });
  }
  return rows;
}
export async function stockAt(oilTypeId, storageLocationId, session) {
  // Normalize request strings and stored ObjectIds before using aggregation.
  let oilId;
  let locationId;
  try {
    oilId = oilTypeId instanceof mongoose.Types.ObjectId ? oilTypeId : new mongoose.Types.ObjectId(String(oilTypeId));
    locationId = storageLocationId instanceof mongoose.Types.ObjectId ? storageLocationId : new mongoose.Types.ObjectId(String(storageLocationId));
  } catch {
    throw badRequest("Invalid oilTypeId or storageLocationId for stock lookup");
  }

  const query = StockLedger.aggregate([
    { $match: { oilTypeId: oilId, storageLocationId: locationId } },
    { $group: { _id: null, incoming: { $sum: { $ifNull: ["$quantityInKg", 0] } }, outgoing: { $sum: { $ifNull: ["$quantityOutKg", 0] } } } }
  ]);
  if (session) query.session(session);
  const rows = await query;
  let balance = rows.length ? Number(rows[0].incoming || 0) - Number(rows[0].outgoing || 0) : 0;

  // Legacy repair/fallback: older invoices may exist without a ledger movement.
  // Add invoice lines only when the matching invoice-line movement is missing,
  // avoiding double-counting invoices whose ledger movement already exists.
  const [purchases, sales] = await Promise.all([
    Purchase.find({ status: { $ne: "REVERSED" }, "items.oilTypeId": oilId, "items.storageLocationId": locationId }).session(session || null).lean(),
    Sale.find({ status: { $ne: "REVERSED" }, "items.oilTypeId": oilId, "items.storageLocationId": locationId }).session(session || null).lean()
  ]);

  async function addMissingInvoiceLines(docs, referenceType, inbound) {
    for (const doc of docs) {
      for (const item of (doc.items || [])) {
        if (String(item.oilTypeId) !== String(oilId) || String(item.storageLocationId) !== String(locationId)) continue;
        const movementQuery = StockLedger.exists({
          referenceType,
          referenceId: doc._id,
          oilTypeId: oilId,
          storageLocationId: locationId
        });
        if (session) movementQuery.session(session);
        if (await movementQuery) continue;
        const qty = Number(item.quantityKg || 0);
        if (qty > 0) balance += inbound ? qty : -qty;
      }
    }
  }
  await addMissingInvoiceLines(purchases, "PURCHASE", true);
  await addMissingInvoiceLines(sales, "SALE", false);
  return balance;
}
export async function createMovement(data, actor, session) {
  if (data.quantityInKg < 0 || data.quantityOutKg < 0 || (data.quantityInKg === 0 && data.quantityOutKg === 0)) {
    throw badRequest("Movement must have a positive inbound or outbound quantity");
  }
  if (data.quantityInKg > 0 && data.quantityOutKg > 0) throw badRequest("A movement cannot be both inbound and outbound");
  if (!(await OilType.exists({ _id: data.oilTypeId, isActive: true }).session(session))) throw notFound("Active oil type not found");
  if (!(await StorageLocation.exists({ _id: data.storageLocationId, isActive: true }).session(session))) throw notFound("Active storage location not found");
  if (data.quantityOutKg > 0 && !(data.referenceType === "SALE" && data.referenceId)) {
    // Sales are already validated in createSale before the invoice is inserted.
    // Rechecking here would count that in-flight sale invoice as a legacy missing movement.
    // Atomic conditional reservation: a per-location stock balance document is recommended
    // for high-throughput deployments. The transaction snapshot plus this ledger check
    // should be paired with an inventory-balance write to serialize concurrent sales.
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
