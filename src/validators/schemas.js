import { z } from "zod";
const id = z.string().regex(/^[a-f\d]{24}$/i, "Must be a valid ObjectId");
const date = z.coerce.date();
const money = z.coerce.number().finite().min(0);
const positive = z.coerce.number().finite().positive();
export const loginSchema = z.object({ body: z.object({ username:z.string().min(1), password:z.string().min(1) }), query:z.any(), params:z.any() });
export const masterCreateSchema = z.object({ body:z.record(z.any()), query:z.any(), params:z.any() });
export const masterPatchSchema = z.object({ body:z.record(z.any()), query:z.any(), params:z.object({id:id}) });
export const priceSchema = z.object({ body:z.object({
  oilTypeId:id, priceType:z.enum(["PURCHASE","SELL"]), pricePerKg:positive, effectiveFrom:date,
  effectiveTo:date.optional(), notes:z.string().optional()
}), query:z.any(), params:z.any() });
const item = z.object({ oilTypeId:id, storageLocationId:id, quantityKg:positive, discount:money.optional(), pricePerKg:positive.optional(), priceOverrideReason:z.string().optional() });
export const purchaseSchema = z.object({ body:z.object({
 supplierId:id, purchaseDate:date.optional(), invoiceNumber:z.string().optional(), items:z.array(item).min(1),
 additionalCharges:money.optional(), discount:money.optional(), notes:z.string().optional()
}), query:z.any(), params:z.any() });
export const saleSchema = z.object({ body:z.object({
 customerId:id.optional(), saleDate:date.optional(), items:z.array(item).min(1),
 additionalCharges:money.optional(), discount:money.optional(), notes:z.string().optional()
}), query:z.any(), params:z.any() });
export const paymentSchema = z.object({ body:z.object({
 transactionDate:date.optional(), direction:z.enum(["RECEIVED","PAID"]), partyType:z.enum(["CUSTOMER","SUPPLIER"]),
 customerId:id.optional(), supplierId:id.optional(),
 transactionType:z.enum(["PURCHASE_PAYMENT","SALE_RECEIPT","CUSTOMER_ADVANCE","SUPPLIER_ADVANCE","REFUND","OPENING_BALANCE_SETTLEMENT"]),
 amount:positive, paymentMethod:z.enum(["CASH","UPI","BANK_TRANSFER","CHEQUE","OTHER"]),
 referenceNumber:z.string().optional(), allocations:z.array(z.object({documentType:z.enum(["PURCHASE","SALE"]),documentId:id,amount:positive})).optional(), notes:z.string().optional()
}), query:z.any(), params:z.any() });
