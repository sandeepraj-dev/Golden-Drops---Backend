# Oil Mill Management Backend

A modular REST backend for oil mill inventory, purchases, sales, payments, price history and reporting.

> **Production-readiness note:** This package is a substantial starter implementation, not an audited accounting ERP. Read `docs/setup.md`, `docs/business-rules.md`, and `docs/accounting-methodology.md` before using it for live financial records. The documentation explicitly identifies incomplete accounting and concurrency safeguards.

## Technology
Node.js 20+, Express, MongoDB/Mongoose, JWT, bcryptjs, Zod, PDFKit, Swagger UI, Jest and Supertest.

## Quick start
```bash
cp .env.example .env
# Edit .env: set a strong JWT_SECRET, INITIAL_ADMIN_PASSWORD, and replica-set MONGODB_URI
npm install
npm run seed
npm run dev
```
API: `http://localhost:4000/api/v1`
Swagger: `http://localhost:4000/api-docs`
Health: `http://localhost:4000/api/v1/health`

## Initial administrator
The seed script creates the first admin only if no ADMIN exists. Set `INITIAL_ADMIN_PASSWORD` securely before seeding. The `/auth/setup-admin` bootstrap endpoint is also available only while no administrator exists and should be blocked/removed after deployment bootstrap.

## Main endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Login, returns bearer JWT |
| GET/POST | `/customers` | Customer search/create |
| GET/PATCH/DELETE | `/customers/:id` | Read/update/deactivate |
| GET/POST | `/suppliers` | Supplier management |
| GET/POST | `/oil-types` | Oil type management |
| GET/POST | `/oil-prices` | Historical purchase/sell prices |
| GET/POST | `/purchases` | Purchase and stock-in |
| POST | `/purchases/:id/reverse` | Controlled purchase reversal (constraints apply) |
| GET/POST | `/sales` | Sales and stock-out |
| GET/POST | `/payments` | Payment ledger and invoice allocations |
| GET | `/stock` | Current stock totals |
| GET | `/stock/ledger` | Stock movement ledger |
| POST | `/stock/opening` | Record opening stock |
| GET/POST | `/daily-stock` | Daily stock reports |
| GET | `/reports/profit-loss?from=2026-10-01&to=2026-10-31` | P&L baseline |
| GET | `/dashboard` | Dashboard summary |
| GET | `/purchases/:id/pdf` | Purchase invoice PDF |
| GET | `/sales/:id/pdf` | Sales invoice PDF |
| GET | `/payments/:id/receipt.pdf` | Payment receipt PDF |
| GET | `/reports/stock/daily.pdf?date=2026-10-21` | Daily stock PDF |
| GET | `/audit-logs` | Sensitive-operation audit log |

All endpoints except health, login and initial bootstrap require `Authorization: Bearer <token>`.

## Example requests
Login:
```http
POST /api/v1/auth/login
Content-Type: application/json

{"username":"admin","password":"YOUR_PASSWORD"}
```
Create a customer:
```http
POST /api/v1/customers
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{"customerCode":"CUST-100","name":"Ravi Stores","phone":"9876543210","address":"Chennai"}
```
Create a sale:
```json
{
  "customerId":"CUSTOMER_OBJECT_ID",
  "saleDate":"2026-10-21T10:00:00+05:30",
  "items":[
    {
      "oilTypeId":"OIL_TYPE_OBJECT_ID",
      "storageLocationId":"LOCATION_OBJECT_ID",
      "quantityKg":25,
      "discount":0
    }
  ],
  "additionalCharges":0,
  "discount":0,
  "notes":"Counter sale"
}
```
Sale prices are resolved from the SELL OilPrice effective on `saleDate`; clients must not submit invoice totals. Price override support is intentionally restricted by the service layer and requires a reason.

## Testing
```bash
npm test
npm run lint
```
Unit tests cover money rounding, basic stock arithmetic and validation. The included health integration test does not require a live database. Add full MongoDB replica-set integration tests before production.

## Project layout
```text
src/
  config/              # environment and database transactions
  controllers/         # HTTP request handlers
  middleware/          # authentication, validation, errors
  models/              # Mongoose collections and indexes
  routes/              # versioned REST route composition
  services/            # accounting, stock, prices, transactions, PDFs
  utils/                # errors, money, dates, pagination
  validators/           # Zod request schemas
scripts/                # seed scripts
tests/unit/             # formula and validation tests
tests/integration/      # HTTP integration tests
docs/                   # OpenAPI and business/accounting guides
```

## API conventions
Responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`. List endpoints return `data` and `pagination`. All business quantities are in kg and currency is INR.

## Production checklist
- [ ] Configure authenticated MongoDB replica set and backups.
- [ ] Rotate all secrets and keep `.env` out of source control.
- [ ] Remove/block initial admin setup after bootstrap.
- [ ] Add idempotency middleware for purchase/sale/payment creation.
- [ ] Implement inventory balance serialization for concurrent sales.
- [ ] Complete weighted-average costing and cost snapshots before relying on P&L.
- [ ] Complete payment reversals, refunds, return records, stock transfers and all requested PDF reports.
- [ ] Add full integration tests for concurrency, rollback and financial allocations.
- [ ] Review GST/tax, credit notes, opening balances and accounting policy with a qualified accountant.


### Automatic IDs

Record IDs are generated by the backend starting at `100` for each collection. Do not send `recordId` from the client. MongoDB `_id` remains the relationship key. Customer/supplier/oil/location codes are generated when omitted, and purchase/sale/payment numbers are generated by the transaction numbering service.

## Deploying to Vercel

This repository includes `api/index.js` and `vercel.json` for Vercel serverless deployment. The function connects to MongoDB before passing a request to Express and reuses the connection in warm instances.

In **Vercel → Project → Settings → Environment Variables**, configure at least:

- `MONGODB_URI`: the full MongoDB Atlas connection string for a database user (not the Atlas website URL).
- `JWT_SECRET`: a random secret of at least 32 characters.
- `CORS_ORIGINS`: comma-separated frontend origins, without trailing slashes (for example `https://your-frontend.vercel.app`).
- `NODE_ENV`: `production`.

For MongoDB Atlas, open **Database & Network Access → IP Access List** and ensure the deployment can reach the cluster. For a quick connectivity diagnosis only, you can temporarily allow `0.0.0.0/0`, but this exposes the database network endpoint to all IPs; use strong database credentials and remove this rule after testing, or use a suitable stable-egress/private-network setup. See MongoDB Atlas network access documentation.

After changing environment variables, redeploy the project. Test `/api/v1/health`, then `/api/v1/auth/login`. If you see `DATABASE_UNAVAILABLE`, inspect the new Vercel function log entry `Vercel request could not connect to MongoDB`; it should show the actual connection error instead of a Mongoose buffering timeout.


## Vercel deployment verification (important)

The repository root selected in Vercel must contain `package.json`, `vercel.json`, `api/index.js`, and `src/app.js` directly. Do not leave the project nested one extra level inside an `oil-mill-management-backend/` directory unless Vercel's **Root Directory** is set to that inner directory.

After deploying, open **Deployments → latest production deployment → Source** and verify the deployed commit includes the `app.set("trust proxy", 1)` line in both `src/app.js` and `api/index.js`. The function logs should print `Vercel API bootstrap` with `trustProxy: 1` and `mongoReadyState: 1` before a request reaches the rate limiter. If those log fields never appear and the old error persists, Vercel is serving a different/older project root or commit.

Set `MONGODB_URI` in Vercel's Production environment and redeploy after changing it. If MongoDB cannot connect, this serverless entry point returns `503 DATABASE_UNAVAILABLE` and logs `Vercel request could not connect to MongoDB` with the connection error. Do not publish the URI or credentials in logs or screenshots.
