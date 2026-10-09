// Demo inventory for Shawon Food Gate: suppliers, ingredients (some below
// their minimum level, to show the Low Stock Alert) and received purchase
// orders (shown as Suppliers Payable). Safe to re-run: upserts by code /
// PO number and touches nothing else.
//
//   node --env-file=.env.local scripts/seed-sfg-inventory.mjs

import mongoose from "mongoose";

const DB_NAME = process.env.MONGODB_DB || "Ecommarce";

const SUPPLIERS = [
  { supplierCode: "SUP-001", companyName: "East London Halal Meats", contactName: "Yusuf Ahmed", phone: "020 8555 0101", email: "orders@elhalalmeats.example", address: "Green St, London E13", paymentTerms: "7 days" },
  { supplierCode: "SUP-002", companyName: "Bengal Spice & Rice Wholesale", contactName: "Kamal Hossain", phone: "020 8555 0102", email: "sales@bengalwholesale.example", address: "Brick Ln, London E1", paymentTerms: "14 days" },
  { supplierCode: "SUP-003", companyName: "Fresh Greens Market", contactName: "Sarah Lee", phone: "020 8555 0103", email: "hello@freshgreens.example", address: "Stratford, London E15", paymentTerms: "On delivery" },
];

// [code, name, category, unit, stock, min, par, cost, supplierIndex]
const INGREDIENTS = [
  ["ING-001", "Basmati Rice", "Dry goods", "kg", 8, 20, 50, 2.2, 1],
  ["ING-002", "Halal Chicken (whole)", "Meat", "kg", 6, 15, 40, 4.5, 0],
  ["ING-003", "Halal Lamb", "Meat", "kg", 12, 10, 25, 9.8, 0],
  ["ING-004", "Cooking Oil", "Dry goods", "l", 4, 10, 30, 1.9, 1],
  ["ING-005", "Onions", "Vegetables", "kg", 25, 10, 40, 0.9, 2],
  ["ING-006", "Naan Flour", "Dry goods", "kg", 30, 15, 50, 0.8, 1],
  ["ING-007", "Fresh Milk", "Dairy", "l", 3, 8, 20, 1.1, 2],
  ["ING-008", "Tea Leaves (Karak)", "Drinks", "kg", 1, 2, 5, 12.0, 1],
  ["ING-009", "Eggs", "Dairy", "pcs", 120, 60, 240, 0.25, 2],
  ["ING-010", "Potatoes (Fries)", "Vegetables", "kg", 18, 20, 60, 0.7, 2],
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const now = new Date();

  const supplierIds = [];
  for (const s of SUPPLIERS) {
    const r = await db.collection("suppliers").findOneAndUpdate(
      { supplierCode: s.supplierCode },
      { $set: { ...s, active: true, deletedAt: null, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true, returnDocument: "after" },
    );
    supplierIds.push((r?.value ?? r)._id);
  }

  const ingredients = [];
  for (const [code, name, category, unit, stock, min, par, cost, sup] of INGREDIENTS) {
    const r = await db.collection("ingredients").findOneAndUpdate(
      { ingredientCode: code },
      {
        $set: {
          name, slug: slug(name), category, unit, purchaseUnit: unit, usageUnit: unit, conversionFactor: 1,
          currentStock: stock, minimumStock: min, parLevel: par, maximumStock: par * 2,
          averageCost: cost, lastPurchaseCost: cost, active: true, updatedAt: now,
        },
        $setOnInsert: { ingredientCode: code, createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    ingredients.push({ doc: r?.value ?? r, cost, par, sup });
  }

  // One received purchase order per supplier (+ one partially received)
  let n = 0;
  for (let si = 0; si < supplierIds.length; si++) {
    const lines = ingredients.filter((i) => i.sup === si);
    const items = lines.map((i) => ({
      ingredient: i.doc._id,
      orderedQuantity: i.par,
      purchaseUnit: i.doc.purchaseUnit,
      purchasePrice: i.cost,
      receivedQuantity: si === 2 ? Math.round(i.par / 2) : i.par,
    }));
    const subtotal = Math.round(items.reduce((s, it) => s + it.orderedQuantity * it.purchasePrice, 0) * 100) / 100;
    const vatAmount = Math.round(subtotal * 0.2 * 100) / 100;
    const poNumber = `PO-DEMO-${String(++n).padStart(3, "0")}`;
    const orderDate = new Date(now.getTime() - (si + 2) * 86400000);
    await db.collection("purchase_orders").updateOne(
      { poNumber },
      {
        $set: {
          supplier: supplierIds[si],
          status: si === 2 ? "PARTIALLY_RECEIVED" : "RECEIVED",
          orderDate,
          expectedDeliveryDate: new Date(orderDate.getTime() + 86400000),
          items,
          subtotal,
          vatRate: 20,
          vatAmount,
          total: Math.round((subtotal + vatAmount) * 100) / 100,
          notes: "Demo purchase order",
          receivingEvents: [],
          updatedAt: now,
        },
        $setOnInsert: { poNumber, createdAt: orderDate },
      },
      { upsert: true },
    );
  }

  const low = INGREDIENTS.filter((i) => i[4] <= i[5]).length;
  console.log(`Inventory demo ready: ${SUPPLIERS.length} suppliers, ${INGREDIENTS.length} ingredients (${low} low on stock), ${n} purchase orders.`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
