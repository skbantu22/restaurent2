import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { connectDB } from "@/lib/databaseconnection";
import { recordWaste, getWasteReport, InventoryError } from "@/lib/inventory/inventory.service";
import {
  sendPurchaseOrder,
  cancelPurchaseOrder,
  receivePurchaseOrder,
} from "@/lib/inventory/purchaseOrder.service";
import {
  startStockCount,
  recordStockCountEntries,
  submitStockCount,
} from "@/lib/inventory/stockCount.service";

import IngredientModel from "@/models/Ingredient.model";
import StockLocationModel from "@/models/StockLocation.model";
import StockMovementModel from "@/models/StockMovement.model";
import SupplierModel from "@/models/Supplier.model";
import PurchaseOrderModel from "@/models/PurchaseOrder.model";
import StockCountModel from "@/models/StockCount.model";

const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const created = {
  locationIds: [],
  ingredientIds: [],
  supplierIds: [],
  purchaseOrderIds: [],
  stockCountIds: [],
};

let dbAvailable = true;

test("Phase 4 — purchase orders, stock counts, waste", { concurrency: false }, async (t) => {
  await t.test("setup: connect to database", async (t) => {
    try {
      await connectDB();
    } catch (err) {
      dbAvailable = false;
      t.skip(`MongoDB unreachable: ${err.message}`);
    }
  });

  if (!dbAvailable) {
    t.skip("Remaining tests require a database connection.");
    return;
  }

  t.after(async () => {
    await Promise.all([
      StockCountModel.deleteMany({ _id: { $in: created.stockCountIds } }),
      PurchaseOrderModel.deleteMany({ _id: { $in: created.purchaseOrderIds } }),
      SupplierModel.deleteMany({ _id: { $in: created.supplierIds } }),
      StockMovementModel.deleteMany({ ingredient: { $in: created.ingredientIds } }),
      IngredientModel.deleteMany({ _id: { $in: created.ingredientIds } }),
      StockLocationModel.deleteMany({ _id: { $in: created.locationIds } }),
    ]);
    await mongoose.connection.close();
  });

  let kitchen, supplier, flour;

  await t.test("fixtures", async () => {
    kitchen = await StockLocationModel.create({
      name: `PHASE4TEST Kitchen ${RUN_ID}`,
      code: `P4T-KITCHEN-${RUN_ID}`,
      type: "KITCHEN",
    });
    created.locationIds.push(kitchen._id);

    supplier = await SupplierModel.create({
      supplierCode: `P4T-SUP-${RUN_ID}`,
      companyName: `PHASE4TEST Supplier ${RUN_ID}`,
    });
    created.supplierIds.push(supplier._id);

    flour = await IngredientModel.create({
      ingredientCode: `PHASE4TEST-FLOUR-${RUN_ID}`,
      name: `Flour ${RUN_ID}`,
      purchaseUnit: "kg",
      usageUnit: "kg",
      conversionFactor: 1,
    });
    created.ingredientIds.push(flour._id);
  });

  // ---- Purchase Orders ----

  let po;

  await t.test("PO: create as DRAFT does not change stock", async () => {
    po = await PurchaseOrderModel.create({
      supplier: supplier._id,
      items: [{ ingredient: flour._id, orderedQuantity: 100, purchaseUnit: "kg", purchasePrice: 2 }],
      vatRate: 20,
    });
    created.purchaseOrderIds.push(po._id);

    assert.equal(po.status, "DRAFT");
    assert.equal(po.subtotal, 200);
    assert.equal(po.vatAmount, 40);
    assert.equal(po.total, 240);

    const ingredient = await IngredientModel.findById(flour._id);
    assert.equal(ingredient.currentStock, 0, "creating a PO must never change stock");
  });

  await t.test("PO: cannot receive against a DRAFT order", async () => {
    await assert.rejects(() =>
      receivePurchaseOrder({
        purchaseOrderId: po._id,
        locationId: kitchen._id,
        lines: [{ ingredient: flour._id, quantityReceived: 50 }],
      }),
    );
  });

  await t.test("PO: send transitions DRAFT -> SENT", async () => {
    const sent = await sendPurchaseOrder({ purchaseOrderId: po._id });
    assert.equal(sent.status, "SENT");
  });

  await t.test("PO: partial receipt increases stock, updates averageCost, status PARTIALLY_RECEIVED", async () => {
    const { purchaseOrder, movements } = await receivePurchaseOrder({
      purchaseOrderId: po._id,
      locationId: kitchen._id,
      lines: [{ ingredient: flour._id, quantityReceived: 40 }],
    });

    assert.equal(purchaseOrder.status, "PARTIALLY_RECEIVED");
    assert.equal(movements.length, 1);
    assert.equal(movements[0].type, "PURCHASE");
    assert.equal(movements[0].newStock, 40);

    const ingredient = await IngredientModel.findById(flour._id);
    assert.equal(ingredient.currentStock, 40);
    assert.equal(ingredient.averageCost, 2);
    assert.equal(ingredient.lastPurchaseCost, 2);
  });

  await t.test("PO: second delivery completes the order -> RECEIVED", async () => {
    const { purchaseOrder } = await receivePurchaseOrder({
      purchaseOrderId: po._id,
      locationId: kitchen._id,
      lines: [{ ingredient: flour._id, quantityReceived: 60 }],
    });

    assert.equal(purchaseOrder.status, "RECEIVED");

    const ingredient = await IngredientModel.findById(flour._id);
    assert.equal(ingredient.currentStock, 100);

    const purchaseMovementCount = await StockMovementModel.countDocuments({
      referenceType: "PURCHASE_ORDER",
      referenceNumber: po.poNumber,
      type: "PURCHASE",
    });
    assert.equal(purchaseMovementCount, 2, "two distinct deliveries -> two ledger rows");
  });

  await t.test("PO: cannot cancel a fully received order", async () => {
    await assert.rejects(() => cancelPurchaseOrder({ purchaseOrderId: po._id }));
  });

  // ---- Stock Counts ----

  let stockCount;

  await t.test("Stock count: starting snapshots expected stock without changing it", async () => {
    stockCount = await startStockCount({
      locationId: kitchen._id,
      ingredientIds: [flour._id],
      varianceThresholdPercent: 5,
    });
    created.stockCountIds.push(stockCount._id);

    assert.equal(stockCount.status, "OPEN");
    assert.equal(stockCount.lines[0].expectedStock, 100);

    const ingredient = await IngredientModel.findById(flour._id);
    assert.equal(ingredient.currentStock, 100, "starting a count must not change stock");
  });

  await t.test("Stock count: large variance without a reason is rejected on submit", async () => {
    await recordStockCountEntries({
      stockCountId: stockCount._id,
      entries: [{ ingredient: flour._id, actualStock: 90 }], // 10% variance, no reason
    });

    await assert.rejects(
      () => submitStockCount({ stockCountId: stockCount._id }),
      InventoryError,
    );

    const ingredient = await IngredientModel.findById(flour._id);
    assert.equal(ingredient.currentStock, 100, "a rejected submit must not change stock");
  });

  await t.test("Stock count: submitting with a reason creates an ADJUSTMENT and updates stock", async () => {
    await recordStockCountEntries({
      stockCountId: stockCount._id,
      entries: [{ ingredient: flour._id, reason: "Spillage during prep" }],
    });

    const { stockCount: submitted, movements } = await submitStockCount({
      stockCountId: stockCount._id,
    });

    assert.equal(submitted.status, "SUBMITTED");
    assert.equal(movements.length, 1);
    assert.equal(movements[0].type, "COUNT");
    assert.equal(movements[0].newStock, 90);

    const ingredient = await IngredientModel.findById(flour._id);
    assert.equal(ingredient.currentStock, 90);
  });

  await t.test("Stock count: cannot submit the same count twice", async () => {
    await assert.rejects(() => submitStockCount({ stockCountId: stockCount._id }));

    const ingredient = await IngredientModel.findById(flour._id);
    assert.equal(ingredient.currentStock, 90, "resubmitting must not double-apply the adjustment");
  });

  // ---- Waste ----

  await t.test("Waste: recording waste decreases stock and appears in the waste report", async () => {
    const movement = await recordWaste({
      ingredientId: flour._id,
      locationId: kitchen._id,
      quantity: 5,
      unit: "kg",
      reason: "Spoilage",
    });

    assert.equal(movement.type, "WASTE");
    assert.equal(movement.newStock, 85);

    const ingredient = await IngredientModel.findById(flour._id);
    assert.equal(ingredient.currentStock, 85);

    const report = await getWasteReport();
    assert.ok(report.wasteToday.quantity >= 5);
    assert.ok(report.wasteByReason.some((r) => r.reason === "Spoilage"));
  });

  await t.test("Waste: a reason is required", async () => {
    await assert.rejects(() =>
      recordWaste({
        ingredientId: flour._id,
        locationId: kitchen._id,
        quantity: 1,
        unit: "kg",
        reason: "",
      }),
    );
  });
});
