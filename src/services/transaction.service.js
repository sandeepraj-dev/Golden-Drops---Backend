import mongoose from "mongoose";
import { Customer, Supplier, OilType, StorageLocation, Purchase, Sale, Payment, StockLedger } from "../models/index.js";
import { withTransaction } from "../config/database.js";
import { getPriceAt } from "./price.service.js";
import { createMovement } from "./stock.service.js";
import { nextNumber } from "./numbering.service.js";
import { roundMoney, sumMoney } from "../utils/money.js";
import { badRequest, notFound, conflict } from "../utils/apiError.js";
import { writeAudit } from "./audit.service.js";

function paymentStatus(total, paid) {
  if (paid <= 0) return "UNPAID";
  if (paid + 0.00001 >= total) return "PAID";
  return "PARTIALLY_PAID";
}
async function calculateItems(items, kind, date, session, allowOverride, actorRole) {
  const out = [];
  for (const item of items) {
    const quantityKg = Number(item.quantityKg);
    if (!(quantityKg > 0) || !Number.isFinite(quantityKg)) throw badRequest("Each item quantityKg must be positive");
    if (!(await OilType.exists({ _id: item.oilTypeId, isActive: true }).session(session))) throw notFound("Active oil type not found");
    if (!(await StorageLocation.exists({ _id: item.storageLocationId, isActive: true }).session(session))) throw notFound("Active storage location not found");
    const priceType = kind === "PURCHASE" ? "PURCHASE" : "SELL";
    const configured = await getPriceAt({ oilTypeId: item.oilTypeId, priceType, date });
    let unitPrice = configured.pricePerKg;
    let priceOverrideReason = "";
    if (item.pricePerKg !== undefined && Number(item.pricePerKg) !== unitPrice) {
      if (!allowOverride || !["ADMIN", "MANAGER"].includes(actorRole) || !item.priceOverrideReason?.trim()) {
        throw badRequest("Price override requires ADMIN/MANAGER permission and a reason");
      }
      unitPrice = Number(item.pricePerKg);
      if (!(unitPrice > 0)) throw badRequest("Override price must be positive");
      priceOverrideReason = item.priceOverrideReason.trim();
    }
    const grossAmount = roundMoney(quantityKg * unitPrice);
    const discount = roundMoney(Number(item.discount || 0));
    if (discount < 0 || discount > grossAmount) throw badRequest("Item discount cannot exceed the line gross amount");
    const lineTotal = roundMoney(grossAmount - discount);
    out.push({
      oilTypeId: item.oilTypeId, storageLocationId: item.storageLocationId, quantityKg,
      ...(kind === "PURCHASE" ? { purchasePricePerKg: unitPrice, grossAmount, discount, lineTotal } :
        { sellingPricePerKg: unitPrice, discount, lineTotal, priceOverrideReason })
    });
  }
  return out;
}
function totals(items, additionalCharges = 0, invoiceDiscount = 0) {
  const subtotal = sumMoney(items.map(i => i.lineTotal));
  const charges = roundMoney(Number(additionalCharges || 0));
  const discount = roundMoney(Number(invoiceDiscount || 0));
  if (charges < 0 || discount < 0 || discount > subtotal + charges) throw badRequest("Invalid additional charges or invoice discount");
  return { subtotal, additionalCharges: charges, discount, grandTotal: roundMoney(subtotal + charges - discount),
    totalQuantityKg: roundMoney(items.reduce((s, i) => s + i.quantityKg, 0)) };
}
export async function createPurchase(data, actor) {
  return withTransaction(async session => {
    const supplier = await Supplier.findOne({ _id: data.supplierId, isActive: true }).session(session);
    if (!supplier) throw notFound("Active supplier not found");
    const date = new Date(data.purchaseDate || Date.now());
    const items = await calculateItems(data.items, "PURCHASE", date, session, false, actor.role);
    const t = totals(items, data.additionalCharges, data.discount);
    const purchaseNumber = await nextNumber("PUR", date, session);
    const [purchase] = await Purchase.create([{
      ...t, ...data, items, purchaseNumber, purchaseDate: date, supplierId: supplier._id,
      paidAmount: 0, outstandingAmount: t.grandTotal, paymentStatus: paymentStatus(t.grandTotal, 0), createdBy: actor.id
    }], { session });
    for (const item of items) {
      await createMovement({
        movementDate: date, oilTypeId: item.oilTypeId, storageLocationId: item.storageLocationId,
        movementType: "PURCHASE", quantityInKg: item.quantityKg, quantityOutKg: 0,
        unitCostPerKg: roundMoney((item.lineTotal + (t.additionalCharges * item.quantityKg / t.totalQuantityKg)) / item.quantityKg),
        referenceType: "PURCHASE", referenceId: purchase._id, notes: `Purchase ${purchaseNumber}`
      }, actor, session);
    }
    await writeAudit({ userId: actor.id, action: "CREATE_PURCHASE", entityType: "Purchase", entityId: purchase._id, after: purchase.toObject(), session });
    return purchase;
  });
}
export async function createSale(data, actor) {
  return withTransaction(async session => {
    const customerId = data.customerId || null;
    if (customerId && !(await Customer.exists({ _id: customerId, isActive: true }).session(session))) throw notFound("Active customer not found");
    const date = new Date(data.saleDate || Date.now());
    const items = await calculateItems(data.items, "SALE", date, session, true, actor.role);
    // Re-check stock in the transaction before creating the invoice.
    for (const item of items) {
      const rows = await StockLedger.aggregate([
        { $match: { oilTypeId: new mongoose.Types.ObjectId(item.oilTypeId), storageLocationId: new mongoose.Types.ObjectId(item.storageLocationId) } },
        { $group: { _id: null, incoming: { $sum: "$quantityInKg" }, outgoing: { $sum: "$quantityOutKg" } } }
      ]).session(session);
      const available = rows.length ? rows[0].incoming - rows[0].outgoing : 0;
      if (available + 1e-9 < item.quantityKg) throw conflict("Insufficient stock", { oilTypeId: item.oilTypeId, availableKg: available, requestedKg: item.quantityKg });
    }
    const t = totals(items, data.additionalCharges, data.discount);
    const saleNumber = await nextNumber("SAL", date, session);
    const [sale] = await Sale.create([{
      ...t, ...data, items, saleNumber, saleDate: date, customerId,
      paidAmount: 0, outstandingAmount: t.grandTotal, paymentStatus: paymentStatus(t.grandTotal, 0), createdBy: actor.id
    }], { session });
    for (const item of items) {
      await createMovement({
        movementDate: date, oilTypeId: item.oilTypeId, storageLocationId: item.storageLocationId,
        movementType: "SALE", quantityInKg: 0, quantityOutKg: item.quantityKg,
        unitCostPerKg: 0, referenceType: "SALE", referenceId: sale._id, notes: `Sale ${saleNumber}`
      }, actor, session);
    }
    await writeAudit({ userId: actor.id, action: "CREATE_SALE", entityType: "Sale", entityId: sale._id, after: sale.toObject(), session });
    return sale;
  });
}
export async function createPayment(data, actor) {
  return withTransaction(async session => {
    const amount = roundMoney(Number(data.amount));
    if (!(amount > 0)) throw badRequest("Payment amount must be positive");
    if (data.partyType === "CUSTOMER") {
      if (!data.customerId || !(await Customer.exists({ _id: data.customerId, isActive: true }).session(session))) throw notFound("Active customer not found");
    } else if (data.partyType === "SUPPLIER") {
      if (!data.supplierId || !(await Supplier.exists({ _id: data.supplierId, isActive: true }).session(session))) throw notFound("Active supplier not found");
    }
    const allocations = [];
    let allocated = 0;
    for (const a of (data.allocations || [])) {
      const value = roundMoney(Number(a.amount));
      if (!(value > 0)) throw badRequest("Allocation amount must be positive");
      const Model = a.documentType === "SALE" ? Sale : a.documentType === "PURCHASE" ? Purchase : null;
      if (!Model) throw badRequest("Allocation documentType must be SALE or PURCHASE");
      const doc = await Model.findById(a.documentId).session(session);
      if (!doc || doc.status !== "CONFIRMED") throw notFound("Invoice not found or not active");
      const expectedParty = a.documentType === "SALE" ? "CUSTOMER" : "SUPPLIER";
      if (data.partyType !== expectedParty) throw badRequest("Payment party type does not match invoice type");
      if (a.documentType === "SALE" && String(doc.customerId) !== String(data.customerId)) throw badRequest("Sale belongs to a different customer");
      if (a.documentType === "PURCHASE" && String(doc.supplierId) !== String(data.supplierId)) throw badRequest("Purchase belongs to a different supplier");
      if (value > doc.outstandingAmount + 0.00001) throw conflict("Allocation exceeds invoice outstanding balance", { invoiceNumber: doc.saleNumber || doc.purchaseNumber, outstandingAmount: doc.outstandingAmount });
      doc.paidAmount = roundMoney(doc.paidAmount + value);
      doc.outstandingAmount = roundMoney(doc.grandTotal - doc.paidAmount);
      doc.paymentStatus = paymentStatus(doc.grandTotal, doc.paidAmount);
      await doc.save({ session });
      allocations.push({ documentType: a.documentType, documentId: doc._id, amount: value });
      allocated = roundMoney(allocated + value);
    }
    if (allocated > amount + 0.00001) throw conflict("Allocations exceed payment amount");
    const paymentNumber = await nextNumber("PAY", new Date(data.transactionDate || Date.now()), session);
    const [payment] = await Payment.create([{
      ...data, paymentNumber, amount, allocations, unallocatedAmount: roundMoney(amount - allocated), createdBy: actor.id
    }], { session });
    await writeAudit({ userId: actor.id, action: "CREATE_PAYMENT", entityType: "Payment", entityId: payment._id, after: payment.toObject(), session });
    return payment;
  });
}
export async function reversePurchase(id, reason, actor) {
  return withTransaction(async session => {
    const doc = await Purchase.findById(id).session(session);
    if (!doc) throw notFound("Purchase not found");
    if (doc.status !== "CONFIRMED") throw conflict("Purchase is already reversed");
    if (doc.paidAmount > 0) throw conflict("Reverse or refund associated payments before reversing the purchase");
    for (const item of doc.items) {
      const rows = await StockLedger.aggregate([
        { $match: { oilTypeId: item.oilTypeId, storageLocationId: item.storageLocationId } },
        { $group: { _id: null, incoming: { $sum: "$quantityInKg" }, outgoing: { $sum: "$quantityOutKg" } } }
      ]).session(session);
      const current = rows.length ? rows[0].incoming - rows[0].outgoing : 0;
      if (current + 1e-9 < item.quantityKg) throw conflict("Cannot reverse purchase because some stock has already been consumed", { currentStockKg: current });
      await createMovement({
        movementDate: new Date(), oilTypeId: item.oilTypeId, storageLocationId: item.storageLocationId,
        movementType: "ADJUSTMENT_OUT", quantityInKg: 0, quantityOutKg: item.quantityKg,
        referenceType: "PURCHASE_REVERSAL", referenceId: doc._id, unitCostPerKg: item.purchasePricePerKg, notes: reason
      }, actor, session);
    }
    const before = doc.toObject(); doc.status = "REVERSED"; await doc.save({ session });
    await writeAudit({ userId: actor.id, action: "REVERSE_PURCHASE", entityType: "Purchase", entityId: id, before, after: doc.toObject(), reason, session });
    return doc;
  });
}
