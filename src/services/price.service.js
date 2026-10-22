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
    effectiveFrom: {
      ...(end ? { $lt: end } : {}),
    },
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
  const when = new Date(date);
  const price = await OilPrice.findOne({
    oilTypeId,
    priceType,
    isActive: true,
    effectiveFrom: { $lte: when },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gt: when } }],
  }).sort({ effectiveFrom: -1 });
  if (!price)
    throw notFound(
      `No ${priceType.toLowerCase()} price configured for this oil type and date`,
    );
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
