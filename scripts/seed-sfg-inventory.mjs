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

  // ---- stock locations ----
  const LOCATIONS = [
    ["LOC-KITCHEN", "Main Kitchen", "KITCHEN", true],
    ["LOC-DRY", "Dry Store", "STORAGE", false],
    ["LOC-FRIDGE", "Walk-in Fridge", "FRIDGE", false],
    ["LOC-FREEZER", "Freezer", "FREEZER", false],
  ];
  const locIds = {};
  for (const [code, name, type, isDefault] of LOCATIONS) {
    const r = await db.collection("stock_locations").findOneAndUpdate(
      { code },
      { $set: { name, type, address: "179 Forest Ln, London E7 9BB", active: true, isDefault, updatedAt: now }, $setOnInsert: { code, createdAt: now } },
      { upsert: true, returnDocument: "after" },
    );
    locIds[code] = (r?.value ?? r)._id;
  }

  // ---- recipes (dish -> ingredients used per portion) ----
  const ing = Object.fromEntries(ingredients.map((i) => [i.doc.name, i.doc]));
  const RECIPES = [
    ["Chicken Biryani", [["Basmati Rice", 0.15, "kg"], ["Halal Chicken (whole)", 0.25, "kg"], ["Cooking Oil", 0.02, "l"], ["Onions", 0.05, "kg"]]],
    ["Lamb Biryani", [["Basmati Rice", 0.15, "kg"], ["Halal Lamb", 0.22, "kg"], ["Cooking Oil", 0.02, "l"], ["Onions", 0.05, "kg"]]],
    ["Big English Breakfast", [["Eggs", 2, "pcs"], ["Potatoes (Fries)", 0.12, "kg"], ["Cooking Oil", 0.01, "l"]]],
    ["Karak Chai", [["Tea Leaves (Karak)", 0.005, "kg"], ["Fresh Milk", 0.15, "l"]]],
    ["Garlic Naan", [["Naan Flour", 0.12, "kg"]]],
    ["Classic Fries", [["Potatoes (Fries)", 0.2, "kg"], ["Cooking Oil", 0.03, "l"]]],
  ];
  let recipeCount = 0;
  for (const [dish, lines] of RECIPES) {
    const product = await db.collection("products").findOne({ name: dish, deletedAt: null });
    if (!product) continue;
    await db.collection("recipes").updateOne(
      { product: product._id, active: true },
      {
        $set: {
          name: `${dish} recipe`,
          version: 1,
          items: lines.map(([n, quantity, unit]) => ({ ingredient: ing[n]._id, quantity, unit, wastagePercentage: 0, optional: false })),
          notes: "Demo recipe — quantities per portion",
          updatedAt: now,
        },
        $setOnInsert: { product: product._id, active: true, createdAt: now },
      },
      { upsert: true },
    );
    recipeCount++;
  }

  // ---- stock movements: opening balances + some waste ----
  await db.collection("stock_movements").deleteMany({ referenceNumber: { $regex: /^DEMO-/ } });
  const moves = [];
  for (const { doc, cost } of ingredients) {
    const opening = doc.currentStock + 5;
    moves.push({
      ingredient: doc._id, location: locIds["LOC-KITCHEN"], type: "OPENING_BALANCE",
      quantity: opening, unit: doc.usageUnit, normalizedQuantity: opening, previousStock: 0, newStock: opening,
      unitCost: cost, totalCost: Math.round(opening * cost * 100) / 100,
      referenceType: "MANUAL", referenceNumber: `DEMO-OPEN-${doc.ingredientCode}`, reason: "Opening stock", notes: "", createdAt: new Date(now.getTime() - 7 * 86400000),
    });
  }
  const WASTE = [["Fresh Milk", 2, "Expired"], ["Onions", 1.5, "Spoiled"], ["Halal Chicken (whole)", 1, "Dropped / contaminated"]];
  for (const [name, qty, reason] of WASTE) {
    const d = ing[name];
    moves.push({
      ingredient: d._id, location: locIds["LOC-KITCHEN"], type: "WASTE",
      quantity: -qty, unit: d.usageUnit, normalizedQuantity: -qty, previousStock: d.currentStock + qty, newStock: d.currentStock,
      unitCost: d.averageCost, totalCost: Math.round(qty * d.averageCost * 100) / 100,
      referenceType: "WASTE", referenceNumber: `DEMO-WASTE-${d.ingredientCode}`, reason, notes: "", createdAt: new Date(now.getTime() - 86400000),
    });
  }
  await db.collection("stock_movements").insertMany(moves);

  // ---- staff salaries (this month pending, last month paid) ----
  const staffUsers = await db.collection("users").find({ role: { $in: ["admin", "manager", "staff"] }, deletedAt: null }).toArray();
  const POSITION = { admin: ["Owner / Manager", 2800], manager: ["Restaurant Manager", 2400], staff: ["Chef", 2100] };
  const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = ym(now);
  const lastMonth = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  let salaryCount = 0;
  for (const u of staffUsers) {
    const [position, base] = POSITION[u.role] || ["Staff", 1900];
    for (const [month, paid] of [[lastMonth, true], [thisMonth, false]]) {
      const bonus = paid ? 100 : 0;
      await db.collection("staff_salaries").updateOne(
        { staff: u._id, month },
        {
          $set: {
            staffName: u.name, position, baseSalary: base, bonus, deductions: 0, netPay: base + bonus,
            paymentStatus: paid ? "paid" : "pending", paymentMethod: "bank", paidDate: paid ? new Date(now.getFullYear(), now.getMonth(), 1) : null,
            note: "Demo salary", deletedAt: null, updatedAt: now,
          },
          $setOnInsert: { staff: u._id, month, createdAt: now },
        },
        { upsert: true },
      );
      salaryCount++;
    }
  }
  console.log(`Also: ${LOCATIONS.length} stock locations, ${recipeCount} recipes, ${moves.length} stock movements (${WASTE.length} waste), ${salaryCount} salary records.`);

  const low = INGREDIENTS.filter((i) => i[4] <= i[5]).length;
  console.log(`Inventory demo ready: ${SUPPLIERS.length} suppliers, ${INGREDIENTS.length} ingredients (${low} low on stock), ${n} purchase orders.`);
  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect();
  process.exit(1);
});
