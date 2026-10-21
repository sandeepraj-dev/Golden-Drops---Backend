import { Customer, Supplier, Sale, Purchase, Payment } from "../models/index.js";
import { notFound, badRequest } from "../utils/apiError.js";
import { validateDateRange } from "../utils/date.js";
import { roundMoney } from "../utils/money.js";

export async function customerStatement(customerId, { from, to } = {}) {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) throw notFound("Customer not found");
  const { start, end } = validateDateRange(from, to);
  const dateFilter = {};
  if (start || end) dateFilter.$gte = start || new Date("1970-01-01");
  if (end) dateFilter.$lte = end;
  const dateQuery = Object.keys(dateFilter).length ? { saleDate: dateFilter } : {};
  const paymentQuery = Object.keys(dateFilter).length ? { transactionDate: dateFilter } : {};
  const [sales, payments] = await Promise.all([
    Sale.find({ customerId, status: "CONFIRMED", ...dateQuery }).sort({ saleDate: 1 }).lean(),
    Payment.find({ customerId, status: "CONFIRMED", ...paymentQuery }).sort({ transactionDate: 1 }).lean()
  ]);
  const ledger = [
    ...sales.map(s => ({ date: s.saleDate, type: "SALE", reference: s.saleNumber, debit: s.grandTotal, credit: 0, amount: s.grandTotal })),
    ...payments.map(p => ({ date: p.transactionDate, type: p.transactionType, reference: p.paymentNumber, debit: 0, credit: p.amount, amount: p.amount }))
  ].sort((a,b) => new Date(a.date) - new Date(b.date));
  let balance = Number(customer.openingBalance || 0);
  for (const row of ledger) { balance = roundMoney(balance + row.debit - row.credit); row.balance = balance; }
  return {
    party: customer, convention: "Positive balance means customer owes the business; negative balance means customer credit/advance.",
    openingBalance: Number(customer.openingBalance || 0), transactions: ledger, closingBalance: balance,
    outstandingInvoices: sales.filter(s => s.outstandingAmount > 0).map(s => ({ saleNumber: s.saleNumber, saleDate: s.saleDate, grandTotal: s.grandTotal, outstandingAmount: s.outstandingAmount })),
    availableAdvance: roundMoney(payments.reduce((sum,p) => sum + Number(p.unallocatedAmount || 0), 0))
  };
}
export async function supplierStatement(supplierId, { from, to } = {}) {
  const supplier = await Supplier.findById(supplierId).lean();
  if (!supplier) throw notFound("Supplier not found");
  const { start, end } = validateDateRange(from, to);
  const range = {};
  if (start || end) { range.$gte = start || new Date("1970-01-01"); if (end) range.$lte = end; }
  const [purchases, payments] = await Promise.all([
    Purchase.find({ supplierId, status: "CONFIRMED", ...(Object.keys(range).length ? { purchaseDate: range } : {}) }).sort({ purchaseDate: 1 }).lean(),
    Payment.find({ supplierId, status: "CONFIRMED", ...(Object.keys(range).length ? { transactionDate: range } : {}) }).sort({ transactionDate: 1 }).lean()
  ]);
  const ledger = [
    ...purchases.map(p => ({ date:p.purchaseDate,type:"PURCHASE",reference:p.purchaseNumber,debit:0,credit:p.grandTotal })),
    ...payments.map(p => ({ date:p.transactionDate,type:p.transactionType,reference:p.paymentNumber,debit:p.amount,credit:0 }))
  ].sort((a,b) => new Date(a.date)-new Date(b.date));
  let balance = Number(supplier.openingBalance || 0);
  for (const row of ledger) { balance = roundMoney(balance + row.credit - row.debit); row.balance = balance; }
  return { party:supplier, convention:"Positive balance means payable to supplier; negative balance means supplier advance/credit.", openingBalance:Number(supplier.openingBalance||0), transactions:ledger, closingBalance:balance, outstandingInvoices:purchases.filter(p=>p.outstandingAmount>0).map(p=>({purchaseNumber:p.purchaseNumber,outstandingAmount:p.outstandingAmount})), availableAdvance:roundMoney(payments.reduce((s,p)=>s+Number(p.unallocatedAmount||0),0)) };
}
