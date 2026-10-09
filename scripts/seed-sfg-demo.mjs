// Demo data for Shawon Food Gate: staff/admin logins, customers, coupons
// and realistic orders built from the seeded menu. Run AFTER seed:menu.
//
//   node --env-file=.env.local scripts/seed-sfg-demo.mjs
//
// Re-runnable: users/coupons are upserted; demo orders (order numbers
// starting "SFG-D") are deleted and re-created. Real orders are untouched.

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const DB_NAME = process.env.MONGODB_DB || "Ecommarce";

const DEMO_PASSWORD = "Shawon@123";

const STAFF = [
  { name: "Shawon Admin", email: "admin@shawonfoodgate.co.uk", role: "admin", phone: "020 3995 6692" },
  { name: "Rahim Uddin", email: "manager@shawonfoodgate.co.uk", role: "manager", phone: "07700 900101" },
  { name: "Kitchen Staff", email: "kitchen@shawonfoodgate.co.uk", role: "staff", phone: "07700 900102" },
];

const CUSTOMERS = [
  ["Aisha Rahman", "07700 900201", "12 Woodgrange Rd", "E7 0EP"],
  ["Mohammed Ali", "07700 900202", "45 Romford Rd", "E7 8HX"],
  ["Sarah Thompson", "07700 900203", "8 Sebert Rd", "E7 0NJ"],
  ["Imran Hossain", "07700 900204", "102 Katherine Rd", "E6 1EN"],
  ["Fatima Begum", "07700 900205", "23 Station Rd", "E12 5BP"],
  ["James Wilson", "07700 900206", "67 Upton Ln", "E7 9PB"],
  ["Nadia Chowdhury", "07700 900207", "5 Earlham Grove", "E7 9AW"],
  ["Daniel Okafor", "07700 900208", "31 The Grove", "E15 1EL"],
];

const COUPONS = [
  { code: "WELCOME10", discountPercentage: 10, minShoppingAmount: 15 },
  { code: "FAMILY15", discountPercentage: 15, minShoppingAmount: 35 },
  { code: "KACCHI5", discountPercentage: 5, minShoppingAmount: 10 },
];

// Typical baskets, by product name from the seeded menu
const BASKETS = [
  [["Sultan's Kacchi Biryani", 2], ["Mango Lassi", 2]],
  [["Big English Breakfast", 1], ["Karak Chai", 1]],
  [["Whole Peri Peri Chicken", 1], ["Peri Salted Fries", 2], ["Mint Lemon Mojito", 2]],
  [["Chicken Karahi", 1], ["Garlic Naan", 2], ["Plain Rice", 1]],
  [["Mega Kebab Box", 1], ["Classic Fries", 1]],
  [["Platter for 2 People", 1], ["Butter Naan", 2], ["Forest Gate Cooler", 2]],
  [["Dhaka Breakfast Platter", 2]],
  [["Classic Smash", 2], ["Meal Upgrade (Fries + Soft Drink)", 2]],
  [["Chicken Biryani", 1], ["Chicken Samosa (2 pcs)", 1], ["Masala Chai", 1]],
  [["Lamb Chops (4 pcs)", 1], ["Spicy Rice", 1], ["Pistachio Cake", 1]],
  [["Peri Rice Chicken Bowl", 1], ["Fresh Orange Juice", 1]],
  [["Full English Breakfast", 2], ["Latte", 2]],
  [["Nawabi Morog Polao", 1], ["Shorshe Ilish", 1], ["Firni", 2]],
  [["Platter for 4 People", 1], ["Lotus Biscoff Milkshake", 2], ["Oreo Milkshake", 2]],
  [["Chicken Döner", 1], ["Lamb Döner", 1], ["Onion Rings", 1]],
  [["Korean Spicy Beef Noodles", 1], ["Iced Latte", 1]],
];

const STATUS_FLOW = ["placed", "preparing", "ready", "out_for_delivery", "delivered"];

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const round2 = (n) => Math.round(n * 100) / 100;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Run with: node --env-file=.env.local scripts/seed-sfg-demo.mjs");
    process.exit(1);
  }
  await mongoose.connect(uri, { dbName: DB_NAME });
  const db = mongoose.connection.db;
  const users = db.collection("users");
  const coupons = db.collection("coupons");
  const orders = db.collection("orders");
  const products = db.collection("products");
  const medias = db.collection("medias");

  const hash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const now = new Date();

  // ---- users ----
  const upsertUser = async (u) => {
    const res = await users.findOneAndUpdate(
      { email: u.email },
      {
        $set: { ...u, password: hash, isEmailVerified: true, deletedAt: null, showroomId: "main", updatedAt: now },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    return res?.value ?? res;
  };

  for (const s of STAFF) await upsertUser(s);

  const customerDocs = [];
  for (const [name, phone, address, postcode] of CUSTOMERS) {
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`;
    customerDocs.push(
      await upsertUser({ name, email, role: "user", phone, address: `${address}, ${postcode}`, city: "London" }),
    );
  }

  // ---- coupons ----
  const validity = new Date(now.getTime() + 90 * 86400000);
  for (const c of COUPONS) {
    await coupons.updateOne(
      { code: c.code },
      { $set: { ...c, validity, deletedAt: null, updatedAt: now }, $setOnInsert: { createdAt: now } },
      { upsert: true },
    );
  }

  // ---- orders ----
  const prodDocs = await products.find({ deletedAt: null }).toArray();
  const mediaById = new Map((await medias.find({}).toArray()).map((m) => [String(m._id), m.secure_url]));
  const byName = new Map(prodDocs.map((p) => [p.name, p]));
  if (!byName.size) {
    console.error("No products found — run `npm run seed:menu` first.");
    process.exit(1);
  }

  await orders.deleteMany({ orderNumber: { $regex: /^SFG-D/ } });

  const docs = [];
  const TOTAL = 45;
  for (let i = 0; i < TOTAL; i++) {
    const basket = BASKETS[i % BASKETS.length];
    const items = basket
      .map(([name, qty]) => {
        const p = byName.get(name);
        if (!p) return null;
        return {
          productId: p._id,
          itemType: "product",
          customId: "",
          name: p.name,
          image: mediaById.get(String(p.media?.[0])) || "",
          price: p.sellingPrice,
          quantity: qty,
          notes: i % 7 === 0 ? "Extra spicy please 🌶️" : "",
        };
      })
      .filter(Boolean);
    if (!items.length) continue;

    // spread over the last 14 days, newest first; first 6 are "live" today
    const live = i < 6;
    const created = live
      ? new Date(now.getTime() - (i * 9 + 3) * 60000)
      : new Date(now.getTime() - (1 + rand() * 13) * 86400000 - rand() * 10 * 3600000);

    const isDelivery = rand() < 0.6;
    const orderType = isDelivery ? "delivery" : "pickup";
    const cust = customerDocs[i % customerDocs.length];
    const [, phone, address, postcode] = CUSTOMERS[i % CUSTOMERS.length];

    let status;
    if (live) {
      status = ["placed", "placed", "preparing", "preparing", "ready", isDelivery ? "out_for_delivery" : "ready"][i];
    } else {
      status = rand() < 0.07 ? "cancelled" : "delivered";
    }

    const subtotal = round2(items.reduce((s, it) => s + it.price * it.quantity, 0));
    const deliveryFee = isDelivery ? pick([1.99, 2.49, 2.99]) : 0;
    const coupon = rand() < 0.2 ? pick(COUPONS) : null;
    const discount = coupon && subtotal >= coupon.minShoppingAmount ? round2((subtotal * coupon.discountPercentage) / 100) : 0;
    const total = round2(subtotal + deliveryFee - discount);

    const method = rand() < 0.75 ? "stripe" : "cod";
    const paid = status !== "cancelled" && (method === "stripe" || status === "delivered");
    const paymentStatus = status === "cancelled" ? (method === "stripe" ? "refunded" : "cancelled") : paid ? "paid" : "pending";

    const flow = status === "cancelled" ? ["placed", "cancelled"] : STATUS_FLOW.slice(0, STATUS_FLOW.indexOf(status) + 1).filter((s) => isDelivery || s !== "out_for_delivery");
    const statusHistory = flow.map((s, k) => ({ status: s, updatedAt: new Date(created.getTime() + k * 8 * 60000), updatedBy: null }));

    docs.push({
      userId: cust._id,
      orderNumber: `SFG-D${String(1001 + i)}`,
      idempotencyKey: null,
      orderType,
      source: rand() < 0.85 ? "website" : "pos",
      table: "",
      cashierId: null,
      customer: { name: cust.name, phone, email: cust.email },
      deliveryAddress: isDelivery
        ? { address, city: "London", postcode, notes: i % 5 === 0 ? "Please ring the bell" : "" }
        : { address: "", city: "", postcode: "", notes: "" },
      items,
      subtotal,
      deliveryFee,
      discount,
      total,
      payment: {
        method,
        status: paymentStatus,
        stripeSessionId: method === "stripe" ? `cs_test_demo_${1001 + i}` : "",
        paymentIntentId: method === "stripe" ? `pi_test_demo_${1001 + i}` : "",
        transactionId: "",
        paidAt: paid ? new Date(created.getTime() + 60000) : null,
        cashReceived: null,
        changeDue: null,
        splitPayments: [],
      },
      orderStatus: status,
      statusHistory,
      coupon: { code: discount ? coupon.code : "", discountPercentage: discount ? coupon.discountPercentage : 0 },
      notes: "",
      deletedAt: null,
      createdAt: created,
      updatedAt: statusHistory[statusHistory.length - 1].updatedAt,
    });
  }

  await orders.insertMany(docs);

  console.log(`Demo data ready: ${STAFF.length} staff, ${customerDocs.length} customers, ${COUPONS.length} coupons, ${docs.length} orders.`);
  console.log(`Admin login: ${STAFF[0].email} / ${DEMO_PASSWORD}`);
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect();
  process.exit(1);
});
