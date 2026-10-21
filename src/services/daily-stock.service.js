import { StockLedger, DailyStock, OilType, StorageLocation } from "../models/index.js";
import { badRequest, notFound, conflict } from "../utils/apiError.js";
import { writeAudit } from "./audit.service.js";

function dayRange(date) {
  const start = new Date(date); start.setHours(0,0,0,0);
  const end = new Date(start); end.setDate(end.getDate()+1);
  return { start, end };
}
export async function generateDailyStock({ date, oilTypeId, storageLocationId, actor }) {
  const { start, end } = dayRange(date);
  if (!(await OilType.exists({ _id: oilTypeId })) || !(await StorageLocation.exists({ _id: storageLocationId }))) throw notFound("Oil type or storage location not found");
  const before = await StockLedger.aggregate([
    { $match: { oilTypeId: (await OilType.findById(oilTypeId))._id, storageLocationId: (await StorageLocation.findById(storageLocationId))._id, movementDate: { $lt: start } } },
    { $group: { _id:null, incoming:{$sum:"$quantityInKg"}, outgoing:{$sum:"$quantityOutKg"} } }
  ]);
  const movements = await StockLedger.aggregate([
    { $match: { oilTypeId:(await OilType.findById(oilTypeId))._id, storageLocationId:(await StorageLocation.findById(storageLocationId))._id, movementDate:{$gte:start,$lt:end} } },
    { $group: { _id:"$movementType", incoming:{$sum:"$quantityInKg"}, outgoing:{$sum:"$quantityOutKg"} } }
  ]);
  const opening = (before[0]?.incoming || 0) - (before[0]?.outgoing || 0);
  const map = Object.fromEntries(movements.map(m => [m._id,m]));
  const value = (type, dir) => map[type]?.[dir] || 0;
  const purchaseInKg=value("PURCHASE","incoming"), salesOutKg=value("SALE","outgoing");
  const returnsInKg=value("RETURN_IN","incoming"), returnsOutKg=value("RETURN_OUT","outgoing");
  const adjustmentInKg=value("ADJUSTMENT_IN","incoming")+value("OPENING","incoming");
  const adjustmentOutKg=value("ADJUSTMENT_OUT","outgoing");
  const expectedClosingStockKg = opening + purchaseInKg + returnsInKg + adjustmentInKg - salesOutKg - returnsOutKg - adjustmentOutKg;
  const existing = await DailyStock.findOne({ businessDate:start, oilTypeId, storageLocationId });
  if (existing?.approvedAt) throw conflict("Approved daily stock reports are immutable");
  const data = { businessDate:start, oilTypeId, storageLocationId, openingStockKg:opening,purchaseInKg,salesOutKg,returnsInKg,returnsOutKg,adjustmentInKg,adjustmentOutKg,expectedClosingStockKg,preparedBy:actor.id };
  const report = existing ? await DailyStock.findByIdAndUpdate(existing.id,data,{new:true,runValidators:true}) : await DailyStock.create(data);
  await writeAudit({userId:actor.id,action:"GENERATE_DAILY_STOCK",entityType:"DailyStock",entityId:report._id,after:report.toObject()});
  return report;
}
export async function setPhysicalCount(id, physicalClosingStockKg, notes, actor) {
  if (physicalClosingStockKg < 0) throw badRequest("Physical stock cannot be negative");
  const report = await DailyStock.findById(id);
  if (!report) throw notFound("Daily stock report not found");
  if (report.approvedAt) throw conflict("Approved daily stock reports are immutable");
  report.physicalClosingStockKg = physicalClosingStockKg;
  report.varianceKg = physicalClosingStockKg - report.expectedClosingStockKg;
  report.notes = notes || report.notes;
  await report.save();
  await writeAudit({userId:actor.id,action:"SET_PHYSICAL_COUNT",entityType:"DailyStock",entityId:id,after:report.toObject(),reason:notes||""});
  return report;
}
export async function approveDailyStock(id, actor) {
  const report = await DailyStock.findById(id);
  if (!report) throw notFound("Daily stock report not found");
  if (report.approvedAt) throw conflict("Daily stock report already approved");
  report.approvedBy = actor.id; report.approvedAt = new Date(); await report.save();
  await writeAudit({userId:actor.id,action:"APPROVE_DAILY_STOCK",entityType:"DailyStock",entityId:id,after:report.toObject()});
  return report;
}
