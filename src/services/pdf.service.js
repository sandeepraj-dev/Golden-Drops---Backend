import PDFDocument from "pdfkit";
import { env } from "../config/environment.js";
import { formatINR } from "../utils/money.js";

export function createPdfResponse(res, filename, title, draw) {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}"`);
  const doc = new PDFDocument({ size: "A4", margin: 42, bufferPages: true, info: { Title: title, Author: env.BUSINESS_NAME } });
  doc.pipe(res);
  doc.fontSize(18).fillColor("#14253d").text(env.BUSINESS_NAME, { align: "center" });
  if (env.BUSINESS_ADDRESS) doc.fontSize(9).fillColor("#333").text(env.BUSINESS_ADDRESS, { align: "center" });
  const contacts = [env.BUSINESS_PHONE, env.BUSINESS_EMAIL, env.BUSINESS_GSTIN].filter(Boolean).join(" | ");
  if (contacts) doc.fontSize(8).text(contacts, { align: "center" });
  doc.moveDown().moveTo(42, doc.y).lineTo(553, doc.y).strokeColor("#9aa6b2").stroke().moveDown();
  doc.fontSize(15).fillColor("#111").text(title, { align: "left" }).moveDown(0.5);
  draw(doc);
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor("#666").text(`Generated ${new Date().toLocaleString("en-IN", { timeZone: env.BUSINESS_TIMEZONE })} | Page ${i + 1} of ${range.count}`, 42, 805, { width: 511, align: "center" });
  }
  doc.end();
}
export function drawKeyValues(doc, values) {
  for (const [key, value] of Object.entries(values)) {
    doc.fontSize(10).fillColor("#333").text(`${key}: ${value ?? "-"}`, { continued: false });
  }
  doc.moveDown();
}
export function drawMoneyTotals(doc, values) {
  for (const [label, value] of Object.entries(values)) {
    doc.fontSize(10).text(`${label}: ${formatINR(value)}`, { align: "right" });
  }
}
