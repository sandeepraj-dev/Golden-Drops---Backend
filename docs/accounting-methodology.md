# Accounting methodology

## Sales and profit
Net sales = sales revenue - sales returns - sales discounts.
Gross profit = net sales - cost of goods sold (COGS).
Net profit = gross profit + other income - operating expenses.

Cash collected is not revenue recognition. Supplier payments are not the same as purchases. Expense cash payments and accrued expenses may differ, so the production ledger should distinguish cash basis and accrual basis explicitly.

## Weighted-average inventory costing
Perpetual weighted average after a receipt:
new average cost = (existing quantity × existing average cost + received quantity × landed unit cost) / (existing quantity + received quantity).
At each sale, COGS = sold quantity × average cost immediately before the sale.
Purchase discounts reduce landed cost. Eligible acquisition freight/handling may be included; general overhead such as office rent or routine electricity is operating expense unless an accountant determines it directly qualifies for inventory cost.
Sales discounts reduce net sales, not inventory cost.
Sales returns should restore inventory at the original cost basis when resalable; damaged returns require a documented write-down policy.
Stock gains/losses require approval and a documented valuation policy.

## Current implementation scope
The starter persists a `unitCostPerKg` snapshot field on sale lines and has a P&L service that sums it. The full perpetual weighted-average balance/cost-layer engine must be completed and validated before relying on production profit figures. The P&L endpoint is therefore a development baseline, not an audited accounting statement. No sales returns, purchase returns, other-income ledger, tax/GST accounting, or accrual journals are fully implemented in this initial generated package.
