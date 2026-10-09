import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { connectDB } from "@/lib/databaseconnection";
import {
  calculateOrderTotals,
  OrderCalculationError,
  POS_DELIVERY_FEE,
} from "@/lib/pos/calculateOrderTotals";
import { getNextPosOrderNumber } from "@/lib/pos/orderNumber";
import OrderModel from "@/models/Order.model";
import CounterModel from "@/models/Counter.model";

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function makeProductMap(products) {
  return new Map(products.map((p) => [String(p._id), p]));
}

// ============================================================
// Pure calculation logic — no DB required. This is the function the
// live /api/pos/checkout route calls for every order; the client can
// never influence price/discount/total math directly (it only ever
// sends productId + quantity, never a price).
// ============================================================
test("calculateOrderTotals: pure order math", async (t) => {
  const burger = { _id: "p1", name: "Smashed Burger", sellingPrice: 10, active: true, available: true };
  const fries = { _id: "p2", name: "Fries", sellingPrice: 3.5, active: true, available: true };
  const outOfStock = { _id: "p3", name: "Milkshake", sellingPrice: 4, active: true, available: false };

  const productMap = makeProductMap([burger, fries, outOfStock]);

  await t.test("pickup order: no delivery fee", () => {
    const result = calculateOrderTotals({
      cartItems: [{ productId: "p1", quantity: 2 }],
      productMap,
      orderType: "pickup",
      paymentMethod: "card",
    });

    assert.equal(result.subtotal, 20);
    assert.equal(result.deliveryFee, 0);
    assert.equal(result.total, 20);
  });

  await t.test("delivery order: applies the standard delivery fee", () => {
    const result = calculateOrderTotals({
      cartItems: [{ productId: "p1", quantity: 1 }],
      productMap,
      orderType: "delivery",
      paymentMethod: "card",
    });

    assert.equal(result.deliveryFee, POS_DELIVERY_FEE);
    assert.equal(result.total, 10 + POS_DELIVERY_FEE);
  });

  await t.test("fixed discount is subtracted and clamped to subtotal", () => {
    const result = calculateOrderTotals({
      cartItems: [{ productId: "p1", quantity: 1 }], // £10
      productMap,
      orderType: "pickup",
      discountType: "fixed",
      discountValue: 999, // absurd client input, must be clamped
      paymentMethod: "card",
    });

    assert.equal(result.discount, 10);
    assert.equal(result.total, 0);
  });

  await t.test("percentage discount is computed server-side", () => {
    const result = calculateOrderTotals({
      cartItems: [{ productId: "p1", quantity: 1 }, { productId: "p2", quantity: 1 }], // £13.50
      productMap,
      orderType: "pickup",
      discountType: "percentage",
      discountValue: 10,
      paymentMethod: "card",
    });

    assert.equal(result.subtotal, 13.5);
    assert.equal(result.discount, 1.35);
    assert.equal(result.total, 12.15);
  });

  await t.test("cash payment computes change due and rejects insufficient cash", () => {
    const result = calculateOrderTotals({
      cartItems: [{ productId: "p1", quantity: 2 }, { productId: "p2", quantity: 1 }], // £23.50
      productMap,
      orderType: "pickup",
      paymentMethod: "cash",
      cashReceived: 30,
    });

    assert.equal(result.total, 23.5);
    assert.equal(result.changeDue, 6.5);

    assert.throws(
      () =>
        calculateOrderTotals({
          cartItems: [{ productId: "p1", quantity: 1 }],
          productMap,
          orderType: "pickup",
          paymentMethod: "cash",
          cashReceived: 5,
        }),
      OrderCalculationError,
    );
  });

  await t.test("an unavailable product cannot be added, even if its id is sent", () => {
    assert.throws(
      () =>
        calculateOrderTotals({
          cartItems: [{ productId: "p3", quantity: 1 }],
          productMap,
          orderType: "pickup",
          paymentMethod: "card",
        }),
      OrderCalculationError,
    );
  });

  await t.test("a bogus/tampered client price field is simply ignored — DB price always wins", () => {
    const result = calculateOrderTotals({
      cartItems: [{ productId: "p1", quantity: 1, price: 0.01 }], // client tries to fake the price
      productMap,
      orderType: "pickup",
      paymentMethod: "card",
    });

    assert.equal(result.items[0].price, 10); // real DB price, not the injected 0.01
    assert.equal(result.total, 10);
  });

  await t.test("invalid quantity is rejected", () => {
    assert.throws(
      () =>
        calculateOrderTotals({
          cartItems: [{ productId: "p1", quantity: -1 }],
          productMap,
          orderType: "pickup",
          paymentMethod: "card",
        }),
      OrderCalculationError,
    );
  });
});

// ============================================================
// Integration: order number sequence + idempotency (needs the DB)
// ============================================================
let dbAvailable = true;

test("POS order number + idempotency (integration)", { concurrency: false }, async (t) => {
  await t.test("setup: connect to database", async (t) => {
    try {
      await connectDB();
      // Ensure the new idempotencyKey unique index has actually been
      // built on the (large, pre-existing) orders collection before
      // the duplicate-key test below relies on it — index creation
      // happens in the background otherwise.
      await OrderModel.init();
    } catch (err) {
      dbAvailable = false;
      t.skip(`MongoDB unreachable: ${err.message}`);
    }
  });

  if (!dbAvailable) {
    t.skip("Remaining tests require a database connection.");
    return;
  }

  const orderIds = [];

  t.after(async () => {
    await OrderModel.deleteMany({ _id: { $in: orderIds } });
    await mongoose.connection.close();
  });

  await t.test("getNextPosOrderNumber produces sequential SL-xxxxxx numbers", async () => {
    const before = await CounterModel.findById("pos_order_seq").lean();
    const startingSeq = before?.seq || 0;

    const first = await getNextPosOrderNumber();
    const second = await getNextPosOrderNumber();

    assert.equal(first, `SL-${100000 + startingSeq + 1}`);
    assert.equal(second, `SL-${100000 + startingSeq + 2}`);
  });

  await t.test("duplicate idempotencyKey is rejected at the database level", async () => {
    const key = `PHASE5TEST-${RUN_ID}`;

    const first = await OrderModel.create({
      orderNumber: `SL-TEST-${RUN_ID}-A`,
      idempotencyKey: key,
      source: "pos",
      orderType: "pickup",
      customer: { name: "Test", phone: "N/A" },
      items: [{ itemType: "product", name: "Test Item", price: 5, quantity: 1 }],
      subtotal: 5,
      total: 5,
      payment: { method: "cash", status: "paid" },
    });
    orderIds.push(first._id);

    await assert.rejects(
      () =>
        OrderModel.create({
          orderNumber: `SL-TEST-${RUN_ID}-B`,
          idempotencyKey: key, // same key — simulates a double-submit
          source: "pos",
          orderType: "pickup",
          customer: { name: "Test", phone: "N/A" },
          items: [{ itemType: "product", name: "Test Item", price: 5, quantity: 1 }],
          subtotal: 5,
          total: 5,
          payment: { method: "cash", status: "paid" },
        }),
      (err) => err.code === 11000,
    );

    const count = await OrderModel.countDocuments({ idempotencyKey: key });
    assert.equal(count, 1, "only one order should exist for this idempotency key");
  });

  await t.test("website orders (no idempotencyKey) are unaffected by the new unique index", async () => {
    const order = await OrderModel.create({
      orderType: "pickup",
      customer: { name: "Website Test", phone: "0000000000" },
      items: [{ itemType: "product", name: "Test Item", price: 5, quantity: 1 }],
      subtotal: 5,
      total: 5,
      payment: { method: "stripe", status: "pending" },
    });
    orderIds.push(order._id);

    const secondOrder = await OrderModel.create({
      orderType: "pickup",
      customer: { name: "Website Test 2", phone: "0000000001" },
      items: [{ itemType: "product", name: "Test Item", price: 5, quantity: 1 }],
      subtotal: 5,
      total: 5,
      payment: { method: "stripe", status: "pending" },
    });
    orderIds.push(secondOrder._id);

    assert.equal(order.idempotencyKey, null);
    assert.equal(secondOrder.idempotencyKey, null);
  });
});
