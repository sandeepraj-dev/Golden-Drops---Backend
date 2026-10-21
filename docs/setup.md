# Setup and deployment

## Requirements
- Node.js 20+
- MongoDB 7+ configured as a replica set (transactions are required for purchase/sale/payment workflows)
- npm

## Local replica set
A local standalone MongoDB does not support multi-document transactions. For a local single-node replica set, configure `replication.replSetName: rs0` in mongod configuration, restart mongod, then run `mongosh` and `rs.initiate()` once. Use a replica-set URI such as `mongodb://127.0.0.1:27017/oil_mill?replicaSet=rs0`.

## Install
1. Copy `.env.example` to `.env`.
2. Set a unique JWT_SECRET of at least 32 characters.
3. Set INITIAL_ADMIN_PASSWORD to a strong password; do not commit `.env`.
4. Set MONGODB_URI to your replica-set connection string.
5. Run `npm install`.
6. Run `npm run seed`.
7. Run `npm run dev`.
8. Open `http://localhost:4000/api-docs`.

## Production
- Use a managed replica-set MongoDB deployment with TLS and authentication.
- Set `NODE_ENV=production`; rotate secrets and credentials.
- Restrict CORS origins, reverse-proxy TLS, set request/body limits and monitor rate limits.
- Disable or remove the initial setup route after bootstrap at the infrastructure layer; do not expose it publicly.
- Back up MongoDB and regularly test restore procedures.
- Use structured logs, metrics, alerting, secret management, and a deployment health check.
- Run tests and static analysis in CI.
- Reconcile stock ledger and accounting balances regularly.
- Obtain accountant review of tax, GST, credit notes, valuation, and statutory reporting before production use.

## Important limitations
This generated project establishes the modular structure and several working flows, but it is not yet a fully audited ERP. See `business-rules.md` and `accounting-methodology.md`. Specifically, do not rely on the current P&L for official books until weighted-average cost is fully implemented and validated. Add per-inventory balance serialization before concurrent production sales. Complete returns/refunds, payment reversal, statement PDFs, stock transfers, all report endpoints, and idempotency persistence middleware before live use.
