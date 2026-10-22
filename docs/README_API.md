# Oil Stock Backend API Reference

Base URL: `http://localhost:5000/api/v1` (as configured by this project). JSON requests use `Content-Type: application/json`. Except `POST /auth/login`, `POST /auth/setup-admin` and `GET /health`, endpoints require `Authorization: Bearer <accessToken>`.

## Authentication
- `POST /auth/setup-admin` — one-time initial administrator setup; secure/disable after use.
- `POST /auth/login` — login and receive token.
- `GET /health` — health check.
- `GET /users`, `POST /users`, `PATCH /users/:id` — ADMIN only.

## Master data CRUD
All are under `/customers`, `/suppliers`, `/oil-types`, `/storage-locations`:
- `GET /:resource?page=1&limit=20&q=...` list/paginate
- `POST /:resource` create (ADMIN/MANAGER)
- `GET /:resource/:id` read one
- `PATCH /:resource/:id` update (ADMIN/MANAGER)
- `PUT /:resource/:id` compatibility alias for partial update
- `DELETE /:resource/:id` deactivate (soft delete; preserves transaction history)

## Purchase (oil buying)
- `GET /purchases` — list; supports `page`, `limit`, `status`, `paymentStatus`, `supplierId`, `from`, `to`, `q`.
- `POST /purchases` — create purchase, use configured `PURCHASE` oil price, calculate amounts in backend and add kg to stock.
- `GET /purchases/:id` — details.
- `POST /purchases/:id/reverse` — reverse an unpaid purchase safely; requires manager/admin and JSON `{ "reason": "..." }`.
- `GET /purchases/:id/pdf` — purchase invoice PDF.

## Sale (oil selling)
- `GET /sales`, `POST /sales`, `GET /sales/:id`, `GET /sales/:id/pdf`.
- `POST /sales/:id/reverse` — reverses an unpaid sale and records stock back in. Requires manager/admin and `{ "reason": "..." }`.
- Sale price is calculated from the configured `SELL` price effective on the sale date. The existing schema/service permits authorized price overrides with reason; never trust frontend-calculated totals.

## Payments and statements
- `GET /payments`, `POST /payments`, `GET /payments/:id/receipt.pdf`.
- `GET /customers/:id/statement?from=YYYY-MM-DD&to=YYYY-MM-DD`
- `GET /suppliers/:id/statement?from=YYYY-MM-DD&to=YYYY-MM-DD`
- Payment creation supports allocations to sale/purchase invoices and unallocated advances. Do not delete payment records directly; a payment reversal/refund workflow must reverse its allocations too.

## Price table
- `GET /oil-prices?oilTypeId=...&priceType=PURCHASE|SELL`
- `POST /oil-prices` — add a dated price record; periods may not overlap.
- `PATCH /oil-prices/:id/close` — close a price period with `effectiveTo` and optional reason.
- Prices are versioned by effective date, so historical transactions retain the price used.

## Warehouse stock and dispatch
- `GET /stock?oilTypeId=...&storageLocationId=...` — current stock derived from stock ledger.
- `GET /stock/ledger?page=1&limit=20&from=...&to=...` — stock movement history.
- `POST /stock/opening` — manager/admin records opening stock.
- `POST /stock/dispatch` — **new**: record physical dispatch from a warehouse; reduces stock and fails if stock is insufficient.
- `GET /daily-stock?date=YYYY-MM-DD`
- `POST /daily-stock/generate`
- `PATCH /daily-stock/:id/physical-count`
- `POST /daily-stock/:id/approve`
- `GET /reports/stock/daily.pdf?date=YYYY-MM-DD`

## Dashboard and reports
- `GET /dashboard` — existing summary: today's purchases/sales, current stock, balances, today's payments and recent sales.
- `GET /reports/profit-loss?from=YYYY-MM-DD&to=YYYY-MM-DD` — manager/admin P&L.
- `GET /reports/profit-loss.pdf?from=...&to=...`
- `GET /audit-logs?page=1&limit=20` — manager/admin audit trail.

## Transaction editing / deletion policy
Purchases and sales are financial/inventory ledger records. Hard deletion or editing quantity/rate on a confirmed record would corrupt stock, payments and reports. Use reversal endpoints for correction and create a replacement transaction. The current API intentionally does not expose unsafe generic `PUT/PATCH/DELETE` for confirmed financial documents. Payments also require a dedicated reversal workflow before safe update/delete. This is safer than pretending CRUD is complete while leaving ledgers inconsistent.

## Response and errors
Success commonly uses `{ "success": true, "data": ... }`; lists include `pagination`. Errors use an HTTP status and an error object from the global error handler. Common statuses: 400 validation, 401 unauthenticated, 403 forbidden, 404 missing record, 409 stock/payment/price conflict.

## Important deployment note
MongoDB transactions require a replica set (including a single-node replica set for local development). Ensure the database is configured accordingly before testing purchase/sale/payment flows.
