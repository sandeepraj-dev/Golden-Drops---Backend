import { OilPrice, OilType } from "../models/index.js";
import { badRequest, notFound, conflict } from "../utils/apiError.js";
import { writeAudit } from "./audit.service.js";

export async function createPrice(data, actor) {
  const priceType = String(data.priceType || "")
    .trim()
    .toUpperCase();

  const pricePerKg = Number(data.pricePerKg);

  // Support both a plain ObjectId string and a populated oil object.
  const oilTypeId =
    data.oilTypeId?._id?.toString?.() || data.oilTypeId?.toString?.();

  if (!["PURCHASE", "SELL"].includes(priceType)) {
    throw badRequest("priceType must be PURCHASE or SELL");
  }

  if (!Number.isFinite(pricePerKg) || pricePerKg <= 0) {
    throw badRequest("pricePerKg must be greater than zero");
  }

  if (!oilTypeId) {
    throw badRequest("Valid oilTypeId is required");
  }

  const activeOil = await OilType.exists({
    _id: oilTypeId,
    isActive: true,
  });

  if (!activeOil) {
    throw notFound(`Active oil type not found: ${oilTypeId}`);
  }

  if (!data.effectiveFrom) {
    throw badRequest("effectiveFrom is required");
  }

  const start = new Date(data.effectiveFrom);

  if (Number.isNaN(start.getTime())) {
    throw badRequest("Invalid effectiveFrom date");
  }

  const end =
    data.effectiveTo == null || data.effectiveTo === ""
      ? null
      : new Date(data.effectiveTo);

  if (end && Number.isNaN(end.getTime())) {
    throw badRequest("Invalid effectiveTo date");
  }

  if (end && start >= end) {
    throw badRequest("effectiveFrom must be earlier than effectiveTo");
  }

  // Match only the same oil AND the same price type.
  const overlapQuery = {
    oilTypeId,
    priceType,
    isActive: true,
    $or: [{ effectiveTo: null }, { effectiveTo: { $gt: start } }],
  };

  // If the new period has an end date, the existing period
  // must start before that end date to overlap.
  // If end is null, the new period continues indefinitely.
  if (end) {
    overlapQuery.effectiveFrom = { $lt: end };
  }

  const overlap = await OilPrice.findOne(overlapQuery);

  if (overlap) {
    throw conflict(
      `An active ${priceType} price already overlaps this period`,
      {
        requestedOilTypeId: oilTypeId,
        requestedPriceType: priceType,
        existingPriceId: overlap._id.toString(),
        existingOilTypeId: overlap.oilTypeId.toString(),
        existingPriceType: overlap.priceType,
        existingPricePerKg: overlap.pricePerKg,
        existingEffectiveFrom: overlap.effectiveFrom,
        existingEffectiveTo: overlap.effectiveTo,
      },
    );
  }

  const price = await OilPrice.create({
    ...data,
    oilTypeId,
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
