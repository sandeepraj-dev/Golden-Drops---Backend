# Architecture and relationships

- User is referenced by `createdBy`, `preparedBy`, `approvedBy` and audit entries.
- Customer 1—N Sale; Customer 1—N Payment.
- Supplier 1—N Purchase; Supplier 1—N Payment.
- OilType 1—N OilPrice and StockLedger; StorageLocation 1—N StockLedger.
- Purchase/Sale items snapshot price, quantity, discount and line total.
- Payment allocations reference Purchase or Sale by document type + ID; the payment is the cash ledger entry and allocations settle invoice balances.
- StockLedger is the immutable quantity movement ledger. DailyStock is a generated summary and physical-count approval record.
- Expense is a separate operating expense ledger.
- AuditLog records changes to sensitive records and financial workflows.

All multi-document financial/stock writes should occur inside one MongoDB transaction. For strict inventory concurrency, also update a single inventory-balance document for each `(oilTypeId, storageLocationId)` within that transaction, so concurrent writers contend on the same document.
