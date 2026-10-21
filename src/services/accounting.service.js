import { Sale, Purchase, Expense, Payment, StockLedger, Customer, Supplier } from "../models/index.js";
import { roundMoney, sumMoney } from "../utils/money.js";
import { validateDateRange } from "../utils/date.js";
import { badRequest } from "../utils/apiError.js";

export async function profitAndLoss({ from, to }) {
  const { start, end } = validateDateRange(from, to);
  if (!start || !end) throw badRequest("Both from and to dates are required");
  const dateFilter = { $gte: start, $lte: end };
  const [sales, purchases, expenses, saleReturns, purchaseReturns] = await Promise.all([
    Sale.find({ saleDate: dateFilter, status: "CONFIRMED" }).lean(),
    Purchase.find({ purchaseDate: dateFilter, status: "CONFIRMED" }).lean(),
    Expense.find({ expenseDate: dateFilter, status: "CONFIRMED" }).lean(),
    Promise.resolve([]), Promise.resolve([])
  ]);
  const grossSales = sumMoney(sales.map(s => s.grandTotal));
  const discounts = sumMoney(sales.map(s => s.discount + s.items.reduce((a, i) => a + (i.discount || 0), 0)));
  const netSales = roundMoney(grossSales); // sale grandTotal is already net of discounts.
  const cogs = sumMoney(sales.flatMap(s => s.items.map(i => Number(i.unitCostPerKg || 0) * Number(i.quantityKg || 0))));
  const operatingExpenses = sumMoney(expenses.map(e => e.amount));
  const grossProfit = roundMoney(netSales - cogs);
  const netProfit = roundMoney(grossProfit - operatingExpenses);
  return {
    period: { from: start, to: end },
    salesRevenue: grossSales, salesDiscountsIncludedInInvoices: discounts,
    salesReturns: 0, netSales, costOfGoodsSold: cogs, grossProfit,
    operatingExpenses, otherIncome: 0, netProfit,
    purchaseValue: sumMoney(purchases.map(p => p.grandTotal)),
    cashReceived: sumMoney((await Payment.find({ transactionDate: dateFilter, direction: "RECEIVED", status: "CONFIRMED" }).lean()).map(p => p.amount)),
    cashPaid: sumMoney((await Payment.find({ transactionDate: dateFilter, direction: "PAID", status: "CONFIRMED" }).lean()).map(p => p.amount)),
    note: "COGS is calculated from cost snapshots on sale items. Ensure cost snapshots are populated by the configured costing workflow before relying on P&L."
  };
}
export async function balancesSummary() {
  const [sales, purchases, customerAdvances, supplierAdvances] = await Promise.all([
    Sale.aggregate([{ $match: { status: "CONFIRMED" } }, { $group: { _id: null, value: { $sum: "$outstandingAmount" } } }]),
    Purchase.aggregate([{ $match: { status: "CONFIRMED" } }, { $group: { _id: null, value: { $sum: "$outstandingAmount" } } }]),
    Payment.aggregate([{ $match: { partyType: "CUSTOMER", status: "CONFIRMED" } }, { $group: { _id: null, value: { $sum: "$unallocatedAmount" } } }]),
    Payment.aggregate([{ $match: { partyType: "SUPPLIER", status: "CONFIRMED" } }, { $group: { _id: null, value: { $sum: "$unallocatedAmount" } } }])
  ]);
  return {
    customerReceivables: roundMoney(sales[0]?.value || 0),
    supplierPayables: roundMoney(purchases[0]?.value || 0),
    customerUnallocatedAdvances: roundMoney(customerAdvances[0]?.value || 0),
    supplierUnallocatedAdvances: roundMoney(supplierAdvances[0]?.value || 0)
  };
}
