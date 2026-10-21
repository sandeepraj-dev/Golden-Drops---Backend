import { Purchase, Sale, Payment, StockLedger, Expense, OilPrice, DailyStock, Customer, Supplier } from "../models/index.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { createPurchase, createSale, createPayment, reversePurchase } from "../services/transaction.service.js";
import { createPrice, priceHistory, closePricePeriod } from "../services/price.service.js";
import { getStock, recordOpeningStock } from "../services/stock.service.js";
import { profitAndLoss, balancesSummary } from "../services/accounting.service.js";
import { customerStatement, supplierStatement } from "../services/statement.service.js";
import { generateDailyStock, setPhysicalCount, approveDailyStock } from "../services/daily-stock.service.js";
import { nextNumber } from "../services/numbering.service.js";
import { writeAudit } from "../services/audit.service.js";
import { createPdfResponse, drawKeyValues, drawMoneyTotals } from "../services/pdf.service.js";
import { badRequest, notFound } from "../utils/apiError.js";
import { pagination, pageMeta } from "../utils/pagination.js";

const listModel = (Model, dateField) => asyncHandler(async(req,res)=>{
 const {page,limit,skip}=pagination(req.query); const filter={};
 if(req.query.status) filter.status=req.query.status;
 if(req.query.paymentStatus) filter.paymentStatus=req.query.paymentStatus;
 if(req.query.customerId) filter.customerId=req.query.customerId;
 if(req.query.supplierId) filter.supplierId=req.query.supplierId;
 if(req.query.from||req.query.to){filter[dateField]={};if(req.query.from)filter[dateField].$gte=new Date(req.query.from);if(req.query.to)filter[dateField].$lte=new Date(req.query.to);}
 if(req.query.q) filter.$or=[{saleNumber:{$regex:req.query.q,$options:"i"}},{purchaseNumber:{$regex:req.query.q,$options:"i"}},{paymentNumber:{$regex:req.query.q,$options:"i"}}];
 const [data,total]=await Promise.all([Model.find(filter).sort({[dateField]:-1}).skip(skip).limit(limit).lean(),Model.countDocuments(filter)]);
 res.json({success:true,data,pagination:pageMeta(total,page,limit)});
});
export const purchaseCreate=asyncHandler(async(req,res)=>res.status(201).json({success:true,message:"Purchase created",data:await createPurchase(req.body,req.user)}));
export const saleCreate=asyncHandler(async(req,res)=>res.status(201).json({success:true,message:"Sale created",data:await createSale(req.body,req.user)}));
export const paymentCreate=asyncHandler(async(req,res)=>res.status(201).json({success:true,message:"Payment recorded",data:await createPayment(req.body,req.user)}));
export const purchasesList=listModel(Purchase,"purchaseDate");
export const salesList=listModel(Sale,"saleDate");
export const paymentsList=listModel(Payment,"transactionDate");
export const purchaseGet=asyncHandler(async(req,res)=>{const d=await Purchase.findById(req.params.id).populate("supplierId");if(!d)throw notFound("Purchase not found");res.json({success:true,data:d});});
export const saleGet=asyncHandler(async(req,res)=>{const d=await Sale.findById(req.params.id).populate("customerId");if(!d)throw notFound("Sale not found");res.json({success:true,data:d});});
export const purchaseReverse=asyncHandler(async(req,res)=>res.json({success:true,data:await reversePurchase(req.params.id,req.body.reason,req.user)}));
export const priceCreate=asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await createPrice(req.body,req.user)}));
export const pricesList=asyncHandler(async(req,res)=>res.json({success:true,data:await priceHistory(req.query)}));
export const priceClose=asyncHandler(async(req,res)=>res.json({success:true,data:await closePricePeriod(req.params.id,req.body.effectiveTo,req.user,req.body.reason)}));
export const stockList=asyncHandler(async(req,res)=>res.json({success:true,data:await getStock(req.query)}));
export const stockLedgerList=asyncHandler(async(req,res)=>{
 const {page,limit,skip}=pagination(req.query);const f={};
 for(const k of ["oilTypeId","storageLocationId","movementType"])if(req.query[k])f[k]=req.query[k];
 if(req.query.from||req.query.to){f.movementDate={};if(req.query.from)f.movementDate.$gte=new Date(req.query.from);if(req.query.to)f.movementDate.$lte=new Date(req.query.to);}
 const [data,total]=await Promise.all([StockLedger.find(f).sort({movementDate:-1}).skip(skip).limit(limit).lean(),StockLedger.countDocuments(f)]);
 res.json({success:true,data,pagination:pageMeta(total,page,limit)});
});
export const openingStock=asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await recordOpeningStock(req.body,req.user)}));
export const dailyStockGenerate=asyncHandler(async(req,res)=>res.status(201).json({success:true,data:await generateDailyStock({...req.body,actor:req.user})}));
export const dailyStockPhysical=asyncHandler(async(req,res)=>res.json({success:true,data:await setPhysicalCount(req.params.id,req.body.physicalClosingStockKg,req.body.notes,req.user)}));
export const dailyStockApprove=asyncHandler(async(req,res)=>res.json({success:true,data:await approveDailyStock(req.params.id,req.user)}));
export const dailyStockList=asyncHandler(async(req,res)=>{const f={};if(req.query.date){const d=new Date(req.query.date);f.businessDate={$gte:new Date(d.setHours(0,0,0,0)),$lt:new Date(d.setHours(23,59,59,999))};}res.json({success:true,data:await DailyStock.find(f).populate("oilTypeId storageLocationId").sort({businessDate:-1}).limit(500)});});
export const expenseCreate=asyncHandler(async(req,res)=>{
 const expenseNumber=await nextNumber("EXP",new Date(req.body.expenseDate||Date.now()));
 const expense=await Expense.create({...req.body,expenseNumber,createdBy:req.user.id});
 await writeAudit({userId:req.user.id,action:"CREATE_EXPENSE",entityType:"Expense",entityId:expense._id,after:expense.toObject()});
 res.status(201).json({success:true,data:expense});
});
export const expensesList=listModel(Expense,"expenseDate");
export const pnl=asyncHandler(async(req,res)=>res.json({success:true,data:await profitAndLoss(req.query)}));
export const dashboard=asyncHandler(async(req,res)=>{
 const [balances,stock,todaySales,todayPurchases,todayPayments,recentSales]=await Promise.all([
 balancesSummary(),getStock(),
 Sale.aggregate([{$match:{status:"CONFIRMED",saleDate:{$gte:new Date(new Date().setHours(0,0,0,0))}}},{$group:{_id:null,total:{$sum:"$grandTotal"},quantity:{$sum:"$totalQuantityKg"}}}]),
 Purchase.aggregate([{$match:{status:"CONFIRMED",purchaseDate:{$gte:new Date(new Date().setHours(0,0,0,0))}}},{$group:{_id:null,total:{$sum:"$grandTotal"},quantity:{$sum:"$totalQuantityKg"}}}]),
 Payment.aggregate([{$match:{status:"CONFIRMED",transactionDate:{$gte:new Date(new Date().setHours(0,0,0,0))}}},{$group:{_id:"$direction",total:{$sum:"$amount"}}}]),
 Sale.find({status:"CONFIRMED"}).sort({createdAt:-1}).limit(10).lean()
 ]);
 res.json({success:true,data:{date:new Date().toISOString().slice(0,10),todaySales:todaySales[0]||{total:0,quantity:0},todayPurchases:todayPurchases[0]||{total:0,quantity:0},todayPayments,stock,balances,recentSales}});
});
export const customerStatementController=asyncHandler(async(req,res)=>res.json({success:true,data:await customerStatement(req.params.id,req.query)}));
export const supplierStatementController=asyncHandler(async(req,res)=>res.json({success:true,data:await supplierStatement(req.params.id,req.query)}));
export const auditList=asyncHandler(async(req,res)=>{
 const {AuditLog}=await import("../models/index.js");const {page,limit,skip}=pagination(req.query);const f={};
 for(const k of ["action","entityType","entityId","userId"])if(req.query[k])f[k]=req.query[k];
 const [data,total]=await Promise.all([AuditLog.find(f).sort({timestamp:-1}).skip(skip).limit(limit).lean(),AuditLog.countDocuments(f)]);
 res.json({success:true,data,pagination:pageMeta(total,page,limit)});
});
export const invoicePdf=(kind)=>asyncHandler(async(req,res)=>{
 const Model=kind==="SALE"?Sale:Purchase;const d=await Model.findById(req.params.id).populate(kind==="SALE"?"customerId":"supplierId").populate("items.oilTypeId","oilName oilCode").lean();
 if(!d)throw notFound("Invoice not found");
 createPdfResponse(res,`${kind.toLowerCase()}-${kind==="SALE"?d.saleNumber:d.purchaseNumber}.pdf`,`${kind==="SALE"?"Sales":"Purchase"} Invoice`,doc=>{
  drawKeyValues(doc,{Number:kind==="SALE"?d.saleNumber:d.purchaseNumber,Date:new Date(kind==="SALE"?d.saleDate:d.purchaseDate).toLocaleDateString("en-IN"),Party:d.customerId?.name||d.supplierId?.name||"Walk-in",Status:d.paymentStatus});
  doc.fontSize(9).text("Item | Quantity (kg) | Rate/kg | Discount | Amount");
  doc.moveDown(0.4);
  for(const i of d.items){doc.text(`${i.oilTypeId?.oilName||i.oilTypeId} | ${i.quantityKg} | ₹${i.sellingPricePerKg??i.purchasePricePerKg} | ₹${i.discount||0} | ₹${i.lineTotal}`);}
  doc.moveDown();drawMoneyTotals(doc,{Subtotal:d.subtotal,"Additional charges":d.additionalCharges,Discount:d.discount,"Grand total":d.grandTotal,"Paid amount":d.paidAmount,Outstanding:d.outstandingAmount});
  doc.moveDown(2).text("Authorized signature: ______________________________");
 });
});
export const paymentReceiptPdf=asyncHandler(async(req,res)=>{
 const d=await Payment.findById(req.params.id).populate("customerId supplierId").lean();if(!d)throw notFound("Payment not found");
 createPdfResponse(res,`receipt-${d.paymentNumber}.pdf`,"Payment Receipt",doc=>{
  drawKeyValues(doc,{Receipt:d.paymentNumber,Date:new Date(d.transactionDate).toLocaleDateString("en-IN"),Direction:d.direction,Party:d.customerId?.name||d.supplierId?.name||"Unknown",Method:d.paymentMethod,Reference:d.referenceNumber,Status:d.status});
  drawMoneyTotals(doc,{Amount:d.amount,Allocated:d.amount-d.unallocatedAmount,"Unallocated advance":d.unallocatedAmount});
  doc.text("Authorized signature: ______________________________");
 });
});
export const pnlPdf=asyncHandler(async(req,res)=>{
 const data=await (await import("../services/accounting.service.js")).profitAndLoss(req.query);
 createPdfResponse(res,"profit-loss.pdf","Profit and Loss Statement",doc=>{drawKeyValues(doc,{From:new Date(data.period.from).toLocaleDateString("en-IN"),To:new Date(data.period.to).toLocaleDateString("en-IN")});drawMoneyTotals(doc,{ "Sales revenue":data.salesRevenue,"Net sales":data.netSales,"Cost of goods sold":data.costOfGoodsSold,"Gross profit":data.grossProfit,"Operating expenses":data.operatingExpenses,"Net profit / (loss)":data.netProfit });doc.moveDown().fontSize(8).text(data.note);});
});
export const dailyStockPdf=asyncHandler(async(req,res)=>{
 const f={};if(req.query.date){const d=new Date(req.query.date);f.businessDate={$gte:new Date(d.setHours(0,0,0,0)),$lt:new Date(d.setHours(23,59,59,999))};}
 const rows=await DailyStock.find(f).populate("oilTypeId storageLocationId").sort({businessDate:1}).limit(500).lean();
 createPdfResponse(res,"daily-stock.pdf","Daily Stock Report",doc=>{for(const r of rows){drawKeyValues(doc,{Date:new Date(r.businessDate).toLocaleDateString("en-IN"),Oil:r.oilTypeId?.oilName,Location:r.storageLocationId?.locationName,"Opening kg":r.openingStockKg,"Purchases kg":r.purchaseInKg,"Sales kg":r.salesOutKg,"Expected closing kg":r.expectedClosingStockKg,"Physical closing kg":r.physicalClosingStockKg??"Not counted","Variance kg":r.varianceKg??"N/A"});doc.moveDown(0.5);}});
});
