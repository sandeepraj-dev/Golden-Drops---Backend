# API Payloads and Examples

IDs below are illustrative MongoDB ObjectIds. Replace them with real IDs returned by your API.

## Login
`POST /api/v1/auth/login`
```json
{ "username": "admin", "password": "your-password" }
```
Use the returned token as `Authorization: Bearer <token>`.

## Configure purchase and selling prices first
`POST /api/v1/oil-prices`
```json
{
  "oilTypeId": "66a100000000000000000001",
  "priceType": "PURCHASE",
  "pricePerKg": 145.00,
  "effectiveFrom": "2026-10-01T00:00:00.000Z",
  "notes": "Supplier buy rate"
}
```
Create another price record with `"priceType": "SELL"` and the selling rate. The backend chooses the matching price by oil type and transaction date.

## Create an oil purchase
`POST /api/v1/purchases`
```json
{
  "supplierId": "66a100000000000000000002",
  "purchaseDate": "2026-10-22T09:30:00.000Z",
  "invoiceNumber": "SUP-INV-104",
  "items": [
    {
      "oilTypeId": "66a100000000000000000001",
      "storageLocationId": "66a100000000000000000003",
      "quantityKg": 500,
      "discount": 0
    }
  ],
  "additionalCharges": 250,
  "discount": 100,
  "notes": "Oil received at main warehouse"
}
```
`purchaseDate` is optional; if omitted backend time is used. Amounts and purchase rate are calculated on the server. The purchase increases stock. Advance/payment is recorded separately through `/payments`.

## Create an oil sale
`POST /api/v1/sales`
```json
{
  "customerId": "66a100000000000000000004",
  "saleDate": "2026-10-22T11:15:00.000Z",
  "items": [
    {
      "oilTypeId": "66a100000000000000000001",
      "storageLocationId": "66a100000000000000000003",
      "quantityKg": 120,
      "discount": 0
    }
  ],
  "additionalCharges": 0,
  "discount": 0,
  "notes": "Delivered to customer"
}
```
The server gets the sell price from the price table, checks warehouse stock, calculates line totals and grand total, then deducts stock. Do not send a frontend-calculated total. The current implementation supports manager/admin price override only when a reason is supplied on the relevant item.

## Record payment / advance
`POST /api/v1/payments`
```json
{
  "direction": "PAID",
  "partyType": "SUPPLIER",
  "supplierId": "66a100000000000000000002",
  "transactionType": "PURCHASE_PAYMENT",
  "amount": 20000,
  "paymentMethod": "BANK_TRANSFER",
  "transactionDate": "2026-10-22T12:00:00.000Z",
  "referenceNumber": "NEFT-ABC123",
  "allocations": [
    {
      "documentType": "PURCHASE",
      "documentId": "66a100000000000000000010",
      "amount": 15000
    }
  ],
  "notes": "Part payment; remaining 5000 stays as advance/unallocated amount"
}
```
For customer money received use `direction: "RECEIVED"`, `partyType: "CUSTOMER"`, and a valid customer. Allocation `documentType` must match the party type: `SALE` for customer, `PURCHASE` for supplier.

## Warehouse dispatch
`POST /api/v1/stock/dispatch`
```json
{
  "oilTypeId": "66a100000000000000000001",
  "storageLocationId": "66a100000000000000000003",
  "quantityKg": 80,
  "movementDate": "2026-10-22T13:00:00.000Z",
  "dispatchTo": "Customer / delivery vehicle",
  "referenceNumber": "DC-2026-001",
  "notes": "Dispatched from main warehouse"
}
```
Dispatch is recorded as an outbound ledger movement. The backend rejects zero/negative quantities and dispatches that exceed available stock.

## Reverse a purchase or sale
`POST /api/v1/purchases/:id/reverse` or `POST /api/v1/sales/:id/reverse`
```json
{ "reason": "Entered against the wrong invoice; replacement will be created" }
```
Only unpaid documents can be reversed by the current implementation. Resolve/refund associated payments first. Purchase reversal checks that enough unconsumed stock remains; sale reversal adds the sold quantity back.

## Query examples
- `GET /api/v1/purchases?page=1&limit=20&supplierId=<id>&from=2026-10-01&to=2026-10-31`
- `GET /api/v1/sales?page=1&limit=20&customerId=<id>&paymentStatus=PARTIALLY_PAID`
- `GET /api/v1/stock?oilTypeId=<id>`
- `GET /api/v1/dashboard`
- `GET /api/v1/reports/profit-loss?from=2026-10-01&to=2026-10-22`
- `GET /api/v1/customers/<id>/statement?from=2026-10-01&to=2026-10-22`

## Calculation rules
- Line gross = quantity in kg × configured price per kg.
- Line total = line gross − line discount.
- Invoice grand total = sum of line totals + additional charges − invoice discount.
- Purchase stock increases by purchased kg; sale and dispatch stock decrease by kg.
- Payment allocation increases invoice `paidAmount`, reduces `outstandingAmount`, and updates `paymentStatus`.
- Prices are selected by effective date; `purchaseDate`/`saleDate` default to backend current time.
- Money is rounded to two decimal places by the backend.
