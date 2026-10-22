# Dashboard API Specification

## Existing endpoint
`GET /api/dashboard` currently returns:
- `todaySales`: total sales amount and quantity for today
- `todayPurchases`: total purchase amount and quantity for today
- `todayPayments`: payment totals grouped by direction
- `stock`: current stock by oil type and storage location
- `balances`: customer/supplier balances summary
- `recentSales`: latest confirmed sale records

## P&L report
`GET /api/reports/profit-loss?from=YYYY-MM-DD&to=YYYY-MM-DD` returns sales revenue, net sales, cost of goods sold, gross profit, operating expenses and net profit/loss. Use this endpoint for accounting profit; total cash received is not the same as sales revenue.

## Suggested dashboard cards
Frontend should label values clearly:
1. **Oil purchased** — purchase kg and purchase grand total for selected date range.
2. **Oil sold** — sale kg and sales grand total for selected date range.
3. **Warehouse dispatched** — sum of outbound movements whose `referenceType` is `WAREHOUSE_DISPATCH`, in kg.
4. **Current stock** — ledger-derived stock by oil type/location.
5. **Gross profit / net profit** — use P&L report, not sales minus purchases cash flow.
6. **Customer outstanding** and **supplier outstanding** — from balances/statement endpoints.
7. **Cash received** and **cash paid** — confirmed payment totals grouped by `direction`.
8. **Today activity** and **recent transactions** — existing dashboard plus purchase/payment lists.

## Important implementation note
The current `/dashboard` response is a compact today summary and does not yet expose every suggested card as separate aggregates or support `from`/`to` filtering. To provide a fully filterable dashboard, extend its controller to accept validated `from` and `to`, aggregate confirmed purchases/sales/payments over that range, and aggregate dispatch movements by `referenceType`. Do not present these suggested cards as implemented until that controller change is made.
