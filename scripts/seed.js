import bcrypt from "bcryptjs";
import { connectDatabase } from "../src/config/database.js";
import { env } from "../src/config/environment.js";
import { User, Customer, Supplier, OilType, StorageLocation, OilPrice } from "../src/models/index.js";

await connectDatabase();
const adminExists = await User.exists({ role: "ADMIN" });
if (!adminExists) {
  if (!env.INITIAL_ADMIN_PASSWORD) throw new Error("Set INITIAL_ADMIN_PASSWORD in .env before seeding");
  const passwordHash = await bcrypt.hash(env.INITIAL_ADMIN_PASSWORD, env.BCRYPT_ROUNDS);
  await User.create({ name: env.INITIAL_ADMIN_NAME, username: env.INITIAL_ADMIN_USERNAME, email: env.INITIAL_ADMIN_EMAIL, passwordHash, role: "ADMIN" });
}
const admin = await User.findOne({ role: "ADMIN" });
const oils = [
  { oilCode: "GNO", oilName: "Groundnut Oil", lowStockThresholdKg: 100 },
  { oilCode: "CO", oilName: "Coconut Oil", lowStockThresholdKg: 50 },
  { oilCode: "SO", oilName: "Sunflower Oil", lowStockThresholdKg: 100 },
  { oilCode: "SEO", oilName: "Sesame Oil", lowStockThresholdKg: 30 }
];
for (const oil of oils) {
  let doc = await OilType.findOne({ oilCode: oil.oilCode });
  if (!doc) doc = await OilType.create(oil);
  for (const [priceType, pricePerKg] of [["PURCHASE", 150], ["SELL", 180]]) {
    const exists = await OilPrice.exists({ oilTypeId: doc._id, priceType, effectiveTo: null });
    if (!exists) await OilPrice.create({ oilTypeId: doc._id, priceType, pricePerKg, effectiveFrom: new Date("2020-01-01T00:00:00.000Z"), createdBy: admin._id, notes: "Seed sample price; replace with actual business price" });
  }
}
if (!await Customer.exists({ customerCode: "CUST-0001" })) await Customer.create({ name:"Sample Customer", phone:"", isActive:true });
if (!await Supplier.exists({ supplierCode: "SUP-0001" })) await Supplier.create({ name:"Sample Supplier", phone:"", isActive:true });
if (!await StorageLocation.exists({ locationCode:"WH-01" })) await StorageLocation.create({ locationName:"Main Warehouse", isActive:true });
console.log("Seed complete. Sample prices are illustrative; configure real prices before business use.");
process.exit(0);
