// Use decimal-safe integer paise for comparisons where possible; persist rupee amounts
// rounded to 2 decimal places. For high-volume financial ledgers consider Decimal128.
export const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
export const toPaise = (value) => Math.round(roundMoney(value) * 100);
export const fromPaise = (paise) => roundMoney(Number(paise) / 100);
export const sumMoney = (values) => roundMoney(values.reduce((sum, n) => sum + Number(n || 0), 0));
export const formatINR = (value) => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2
}).format(Number(value || 0));
