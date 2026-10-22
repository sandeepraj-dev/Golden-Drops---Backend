import { OilPrice, OilType } from "../models/index.js";
import { badRequest, notFound, conflict } from "../utils/apiError.js";
import { writeAudit } from "./audit.service.js";

export async function createPrice(data, actor) {
  const priceType = String(data.priceType || "")
    .trim()
    .toUpperCase();
  const pricePerKg = Number(data.pricePerKg);

  if (!["PURCHASE", "SELL"].includes(priceType)) {
    throw badRequest("priceType must be PURCHASE or SELL");
  }

  if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
    throw badRequest("pricePerKg must be greater than zero");
  }

  if (
    !(await OilType.exists({
      _id: data.oilTypeId,
      isActive: true,
    }))
  ) {
    throw notFound("Active oil type not found");
  }

  const start = new Date(data.effectiveFrom);

  if (!data.effectiveFrom || Number.isNaN(start.getTime())) {
    throw badRequest("A valid effectiveFrom date is required");
  }

  const end = data.effectiveTo ? new Date(data.effectiveTo) : null;

  if (end && (Number.isNaN(end.getTime()) || start >= end)) {
    throw badRequest("effectiveFrom must be earlier than effectiveTo");
  }

  const overlap = await OilPrice.findOne({
    oilTypeId: data.oilTypeId,
    priceType,
    isActive: true,
    $or: [{ effectiveTo: null }, { effectiveTo: { $gt: start } }],
  });

  if (overlap) {
    throw conflict("Price period overlaps an existing active price", {
      existingPriceId: overlap.id,
      existingPriceType: overlap.priceType,
      existingPricePerKg: overlap.pricePerKg,
      existingEffectiveFrom: overlap.effectiveFrom,
      existingEffectiveTo: overlap.effectiveTo,
      requestedPriceType: priceType,
    });
  }

  const price = await OilPrice.create({
    ...data,
    priceType,
    pricePerKg,
    effectiveFrom: start,
    effectiveTo: end,
    createdBy: actor.id,
  });

  await writeAudit({
    userId: actor.id,
    action: "CREATE_PRICE",
    entityType: "OilPrice",
    entityId: price._id,
    after: price.toObject(),
  });

  return price;
}

export async function getPriceAt({ oilTypeId, priceType, date }) {
  const when = date ? new Date(date) : new Date();
  const requestedType = String(priceType || "").trim().toUpperCase();

  if (!Number.isFinite(when.getTime())) {
    throw badRequest("A valid transaction date is required to resolve the oil price");
  }
  if (!["PURCHASE", "SELL", "SALE", "SALES"].includes(requestedType)) {
    throw badRequest("priceType must be PURCHASE or SELL");
  }

  // The transaction API commonly receives a date-only value (YYYY-MM-DD).
  // JavaScript parses that as midnight UTC, which incorrectly excludes a price
  // configured later on the same day. For date-only values, match any price
  // that was effective at some point during that calendar day.
  const dateOnly = (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) ||
    (date instanceof Date && when.getUTCHours() === 0 && when.getUTCMinutes() === 0 &&
      when.getUTCSeconds() === 0 && when.getUTCMilliseconds() === 0);
  const dayStart = new Date(Date.UTC(when.getUTCFullYear(), when.getUTCMonth(), when.getUTCDate()));
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1);
  const effectiveFromLimit = dateOnly ? dayEnd : when;
  const effectiveToLimit = dateOnly ? dayStart : when;

  // Accept legacy SALE/SALES values for sales, while new records use SELL.
  const typeAliases = requestedType === "PURCHASE"
    ? ["PURCHASE", "purchase"]
    : ["SELL", "SALE", "SALES", "sell", "sale", "sales"];

  const price = await OilPrice.findOne({
    oilTypeId,
    priceType: { $in: typeAliases },
    isActive: true,
    effectiveFrom: { $lte: effectiveFromLimit },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gt: effectiveToLimit } }],
    pricePerKg: { $gt: 0 },
  }).sort({ effectiveFrom: -1, createdAt: -1 });

  if (!price) {
    const dayLabel = dateOnly ? date.trim() : when.toISOString();
    throw notFound(
      `No ${requestedType === "PURCHASE" ? "purchase" : "sales"} price configured for oil type ${oilTypeId} on ${dayLabel}. Check OilPrice records: oilTypeId must match the OilType _id, priceType must be ${requestedType === "PURCHASE" ? "PURCHASE" : "SELL/SALE/SALES"}, isActive must be true, and the effective date range must include the transaction date.`,
    );
  }
  return price;
}

export async function priceHistory(query) {
  const filter = {};
  if (query.oilTypeId) filter.oilTypeId = query.oilTypeId;
  if (query.priceType) filter.priceType = query.priceType;
  return OilPrice.find(filter)
    .populate("oilTypeId", "oilCode oilName")
    .sort({ effectiveFrom: -1 })
    .limit(Math.min(Number(query.limit) || 100, 500));
}
export async function closePricePeriod(
  id,
  effectiveTo,
  actor,
  reason = "Price version replaced",
) {
  const price = await OilPrice.findById(id);
  if (!price) throw notFound("Oil price not found");
  if (new Date(effectiveTo) <= price.effectiveFrom)
    throw badRequest("effectiveTo must be after effectiveFrom");
  const before = price.toObject();
  price.effectiveTo = new Date(effectiveTo);
  price.isActive = false;
  await price.save();
  await writeAudit({
    userId: actor.id,
    action: "CLOSE_PRICE_PERIOD",
    entityType: "OilPrice",
    entityId: id,
    before,
    after: price.toObject(),
    reason,
  });
  return price;
}
