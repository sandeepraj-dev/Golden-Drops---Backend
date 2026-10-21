# Business rules

## Document lifecycle
- A confirmed purchase or sale is immutable in its financial meaning. Correct it through a controlled reversal/return workflow, never by ordinary DELETE.
- Every invoice captures item quantities, prices, discounts and totals at creation time.
- Number generation is a separate counter collection. Unique indexes remain the final duplicate protection.
- All quantities are kilograms (KG); litres are not accepted or implicitly converted.
- Confirmed transaction creation should use MongoDB transactions.

## Prices
- Purchase and SELL price histories are independent.
- A price period is `[effectiveFrom, effectiveTo)`; a null end means open-ended.
- Historical invoice prices are snapshots, not live references to OilPrice.
- A price override requires an authorized role and a recorded reason.

## Stock
Closing stock = opening + purchase receipts + returns in + adjustments in - sales - returns out - adjustments out.
- A transfer writes an outbound movement at the source and an inbound movement at the destination.
- Negative stock is forbidden.
- Stock ledger rows are append-only. Corrections create reversal movements.
- For production concurrency safety, serialize inventory writes by updating a per-(oilType, location) balance document in the same transaction. Ledger-only snapshot reads alone are not sufficient to prevent all concurrent oversells under every isolation pattern.

## Payments
- Payments are separate ledger documents.
- Allocations are links from a payment to an invoice; an allocated payment must not be counted a second time as an additional receipt.
- Unallocated amount = payment amount - sum(allocations).
- Customer receipt direction is RECEIVED; supplier payment direction is PAID.
- Refunds/reversals should be represented by linked reversal records and audit logs; never edit/delete historical payment rows.
- Customer balance: debit (sale) minus credit (receipt/refund according to configured policy). Positive means receivable; negative means customer credit.
- Supplier balance: purchase liability minus payments. Positive means payable; negative means supplier advance.

## Monetary calculations
- Currency is INR; amounts are stored as rupee numbers rounded to two decimal places.
- For strict accounting deployments, consider MongoDB Decimal128 or integer paise for all persisted financial amounts. The current project uses Number with centralized rounding and is suitable for controlled moderate-scale usage after financial review.

## Automatic record IDs
Every top-level Mongoose document receives a numeric `recordId`, generated server-side per collection beginning at 100 (100, 101, 102, ...). MongoDB `_id` remains the internal foreign-key identifier and should be used by API clients for relationships. Customers, suppliers, oil types, and storage locations also receive readable codes such as `CUS-100`, `SUP-100`, `OIL-100`, and `LOC-100` when a code is not explicitly provided by trusted seed/setup code. Transaction references such as `PUR-2026-000001`, `SAL-2026-000001`, and `PAY-2026-000001` remain separate, human-readable document numbers. Counters are independent per collection; gaps may occur if a record creation fails after a counter increment. Do not assume IDs are globally unique across different collections.
