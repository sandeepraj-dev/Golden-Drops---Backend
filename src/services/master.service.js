import { Customer, Supplier, OilType, StorageLocation, OilPrice, User, Purchase, Sale, Payment } from "../models/index.js";
import { pagination, pageMeta } from "../utils/pagination.js";
import { badRequest, notFound, conflict } from "../utils/apiError.js";
import { writeAudit } from "./audit.service.js";

const collections = { customers: Customer, suppliers: Supplier, "oil-types": OilType, "storage-locations": StorageLocation };
const searchable = {
  customers: ["name", "phone", "customerCode", "address", "villageOrCity"],
  suppliers: ["name", "phone", "supplierCode", "address"],
  "oil-types": ["oilName", "oilCode"],
  "storage-locations": ["locationName", "locationCode"]
};
export async function listMaster(kind, query) {
  const Model = collections[kind];
  if (!Model) throw notFound("Unknown master resource");
  const { page, limit, skip } = pagination(query);
  const filter = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive === "true";
  if (query.q) filter.$or = searchable[kind].map((field) => ({ [field]: { $regex: escapeRegex(query.q), $options: "i" } }));
  const [data, total] = await Promise.all([
    Model.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Model.countDocuments(filter)
  ]);
  return { data, pagination: pageMeta(total, page, limit) };
}
export async function createMaster(kind, data, actor) {
  const Model = collections[kind];
  if (!Model) throw notFound("Unknown master resource");
  const created = await Model.create(data);
  await writeAudit({ userId: actor.id, action: "CREATE", entityType: kind, entityId: created._id, after: created.toObject() });
  return created;
}
export async function getMaster(kind, id) {
  const Model = collections[kind];
  if (!Model) throw notFound("Unknown master resource");
  const record = await Model.findById(id);
  if (!record) throw notFound(`${kind} record not found`);
  return record;
}
export async function updateMaster(kind, id, patch, actor) {
  const Model = collections[kind];
  if (!Model) throw notFound("Unknown master resource");
  if ("openingBalance" in patch) throw badRequest("Opening balances require a controlled opening-balance adjustment workflow");
  const before = await Model.findById(id);
  if (!before) throw notFound(`${kind} record not found`);
  const after = await Model.findByIdAndUpdate(id, patch, { new: true, runValidators: true });
  await writeAudit({ userId: actor.id, action: "UPDATE", entityType: kind, entityId: id, before: before.toObject(), after: after.toObject() });
  return after;
}
export async function deactivateMaster(kind, id, actor) {
  const Model = collections[kind];
  if (!Model) throw notFound("Unknown master resource");
  if (kind === "customers" && await Sale.exists({ customerId: id })) return updateMaster(kind, id, { isActive: false }, actor);
  if (kind === "suppliers" && await Purchase.exists({ supplierId: id })) return updateMaster(kind, id, { isActive: false }, actor);
  const record = await Model.findById(id);
  if (!record) throw notFound(`${kind} record not found`);
  record.isActive = false; await record.save();
  await writeAudit({ userId: actor.id, action: "DEACTIVATE", entityType: kind, entityId: id, before: { isActive: true }, after: { isActive: false } });
  return record;
}
export async function listUsers(query) {
  const { page, limit, skip } = pagination(query);
  const filter = {};
  if (query.role) filter.role = query.role;
  const [data, total] = await Promise.all([
    User.find(filter).select("-passwordHash").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    User.countDocuments(filter)
  ]);
  return { data, pagination: pageMeta(total, page, limit) };
}
function escapeRegex(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
