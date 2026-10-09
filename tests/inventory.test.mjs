import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";

import { connectDB } from "@/lib/databaseconnection";
import { normalizeToUsageUnit } from "@/lib/inventory/units";
import {
  increaseStock,
  decreaseStock,
  recordSale,
  recordPurchase,
  getDefaultStockLocation,
  consumeOrderStock,
  reverseOrderStock,
  InsufficientStockError,
} from "@/lib/inventory/inventory.service";
import { getRecipeCosting } from "@/lib/inventory/costing.service";

import IngredientModel from "@/models/Ingredient.model";
import StockLocationModel from "@/models/StockLocation.model";
import StockMovementModel from "@/models/StockMovement.model";
import RecipeModel from "@/models/Recipe.model";
import CategoryModel from "@/models/category.model";
import ProductModel from "@/models/Product.model";
import OrderModel from "@/models/Order.model";

// Every document created by this suite is tagged with this run id and
// removed in the top-level `after` hook. Nothing outside these
// PHASE2TEST-prefixed documents (i.e. no existing product/category/
// order data) is ever read or written.
const RUN_ID = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const created = {
  locationIds: [],
  ingredientIds: [],
  categoryIds: [],
  productIds: [],
  recipeIds: [],
  orderIds: [],
};

let dbAvailable = true;

test("Phase 2 — restaurant inventory foundation", { concurrency: false }, async (t) => {
  await t.test("setup: connect to database", async (t) => {
    try {
      await connectDB();
    } catch (err) {
      dbAvailable = false;
      t.skip(`MongoDB unreachable in this environment: ${err.message}`);
    }
  });

  if (!dbAvailable) {
    t.skip("Remaining tests require a database connection.");
    return;
  }

  t.after(async () => {
    await Promise.all([
      OrderModel.deleteMany({ _id: { $in: created.orderIds } }),
      RecipeModel.deleteMany({ _id: { $in: created.recipeIds } }),
      ProductModel.deleteMany({ _id: { $in: created.productIds } }),
      CategoryModel.deleteMany({ _id: { $in: created.categoryIds } }),
      StockMovementModel.deleteMany({ ingredient: { $in: created.ingredientIds } }),
      IngredientModel.deleteMany({ _id: { $in: created.ingredientIds } }),
      StockLocationModel.deleteMany({ _id: { $in: created.locationIds } }),
    ]);
    await mongoose.connection.close();
  });

  // ---- shared fixtures ----
  let kitchen;
  let beefLedger; // plain kg ingredient, used for TEST B/C/D
  let beefRecipe; // kg purchase / g usage, used for TEST E/F/G
  let bun;

  await t.test("fixtures: create a stock location", async () => {
    kitchen = await StockLocationModel.create({
      name: `PHASE2TEST Kitchen ${RUN_ID}`,
      code: `P2T-KITCHEN-${RUN_ID}`,
      type: "KITCHEN",
    });
    created.locationIds.push(kitchen._id);
    assert.ok(kitchen._id);
  });

  await t.test("unit normalization: kg -> g uses the ingredient's conversionFactor", () => {
    const fakeIngredient = { purchaseUnit: "kg", usageUnit: "g", conversionFactor: 1000 };
    assert.equal(normalizeToUsageUnit(150, "g", fakeIngredient), 150);
    assert.equal(normalizeToUsageUnit(1, "kg", fakeIngredient), 1000);
    assert.throws(() => normalizeToUsageUnit(1, "l", fakeIngredient));
  });

  // TEST A: Create Beef Patty ingredient.
  await t.test("TEST A: create Beef Patty ingredient", async () => {
    beefLedger = await IngredientModel.create({
      ingredientCode: `PHASE2TEST-BEEF-LEDGER-${RUN_ID}`,
      name: `Beef Patty (ledger test) ${RUN_ID}`,
      purchaseUnit: "kg",
      usageUnit: "kg",
      conversionFactor: 1,
      location: kitchen._id,
    });
    created.ingredientIds.push(beefLedger._id);

    assert.ok(beefLedger._id);
    assert.equal(beefLedger.currentStock, 0);
  });

  // TEST B: Opening balance 20kg -> ledger OPENING_BALANCE +20kg.
  await t.test("TEST B: opening balance of 20kg is recorded on the ledger", async () => {
    const movement = await increaseStock({
      ingredientId: beefLedger._id,
      locationId: kitchen._id,
      type: "OPENING_BALANCE",
      quantity: 20,
      unit: "kg",
      referenceType: "MANUAL",
      reason: "Initial stock",
    });

    assert.equal(movement.type, "OPENING_BALANCE");
    assert.equal(movement.previousStock, 0);
    assert.equal(movement.newStock, 20);
    assert.equal(movement.normalizedQuantity, 20);

    const refreshed = await IngredientModel.findById(beefLedger._id);
    assert.equal(refreshed.currentStock, 20);
  });

  // TEST C: Decrease 2kg -> previousStock 20, newStock 18.
  await t.test("TEST C: decreasing 2kg updates previous/new stock and writes a ledger entry", async () => {
    const movement = await decreaseStock({
      ingredientId: beefLedger._id,
      locationId: kitchen._id,
      type: "ADJUSTMENT",
      direction: "OUT",
      quantity: 2,
      unit: "kg",
      reason: "Test manual decrease",
    });

    assert.equal(movement.previousStock, 20);
    assert.equal(movement.newStock, 18);

    const exists = await StockMovementModel.exists({ _id: movement._id, type: "ADJUSTMENT" });
    assert.ok(exists);
  });

  // TEST D: Attempt to decrease 19kg while only 18kg exist -> must fail,
  // and must NOT create a misleading ledger entry or change stock.
  await t.test("TEST D: decreasing beyond available stock is rejected and changes nothing", async () => {
    await assert.rejects(
      () =>
        decreaseStock({
          ingredientId: beefLedger._id,
          locationId: kitchen._id,
          type: "ADJUSTMENT",
          direction: "OUT",
          quantity: 19,
          unit: "kg",
          reason: "Should fail",
        }),
      InsufficientStockError,
    );

    const refreshed = await IngredientModel.findById(beefLedger._id);
    assert.equal(refreshed.currentStock, 18, "stock must be unchanged after a rejected decrease");

    const movementCount = await StockMovementModel.countDocuments({
      ingredient: beefLedger._id,
      reason: "Should fail",
    });
    assert.equal(movementCount, 0, "no ledger row should exist for the rejected decrease");
  });

  // ---- fixtures for recipe/sale tests ----
  let category, product;

  await t.test("fixtures: recipe ingredients, category and product", async () => {
    beefRecipe = await IngredientModel.create({
      ingredientCode: `PHASE2TEST-BEEF-RECIPE-${RUN_ID}`,
      name: `Beef Patty (recipe test) ${RUN_ID}`,
      purchaseUnit: "kg",
      usageUnit: "g",
      conversionFactor: 1000,
      location: kitchen._id,
    });
    created.ingredientIds.push(beefRecipe._id);

    bun = await IngredientModel.create({
      ingredientCode: `PHASE2TEST-BUN-${RUN_ID}`,
      name: `Burger Bun ${RUN_ID}`,
      purchaseUnit: "pcs",
      usageUnit: "pcs",
      conversionFactor: 1,
      location: kitchen._id,
    });
    created.ingredientIds.push(bun._id);

    await increaseStock({
      ingredientId: beefRecipe._id,
      locationId: kitchen._id,
      type: "OPENING_BALANCE",
      quantity: 5,
      unit: "kg",
      reason: "Initial stock",
    });

    await increaseStock({
      ingredientId: bun._id,
      locationId: kitchen._id,
      type: "OPENING_BALANCE",
      quantity: 50,
      unit: "pcs",
      reason: "Initial stock",
    });

    category = await CategoryModel.create({
      name: `PHASE2TEST Category ${RUN_ID}`,
      slug: `phase2test-category-${RUN_ID}`,
    });
    created.categoryIds.push(category._id);

    product = await ProductModel.create({
      name: `PHASE2TEST Smashed Burger ${RUN_ID}`,
      slug: `phase2test-smashed-burger-${RUN_ID}`,
      category: category._id,
      mrp: 10,
      sellingPrice: 10,
      description: "Test product for Phase 2 inventory foundation tests.",
      media: [],
    });
    created.productIds.push(product._id);
  });

  // TEST E + F: recipe with two items (Beef Patty 150g + Bun 1 pcs),
  // retrievable correctly.
  await t.test("TEST E/F: recipe with Beef Patty (150g) and Bun (1 pcs) can be created and retrieved", async () => {
    const recipe = await RecipeModel.create({
      product: product._id,
      name: "Smashed Burger",
      version: 1,
      active: true,
      items: [
        { ingredient: beefRecipe._id, quantity: 150, unit: "g" },
        { ingredient: bun._id, quantity: 1, unit: "pcs" },
      ],
    });
    created.recipeIds.push(recipe._id);

    const fetched = await RecipeModel.findById(recipe._id).lean();
    assert.equal(fetched.items.length, 2);
    assert.equal(fetched.items[0].quantity, 150);
    assert.equal(fetched.items[0].unit, "g");
    assert.equal(fetched.items[1].quantity, 1);
    assert.equal(fetched.items[1].unit, "pcs");
  });

  // TEST G: recordSale() consumes ingredients via the recipe exactly
  // once, even if called twice for the same order (idempotency).
  await t.test("TEST G: duplicate sale reference does not double-consume stock", async () => {
    const order = {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: `PHASE2TEST-ORD-${RUN_ID}`,
      items: [
        {
          productId: product._id,
          name: "PHASE2TEST Smashed Burger",
          itemType: "product",
          quantity: 1,
        },
      ],
    };
    created.orderIds.push(order._id); // not a real Order doc, just for cleanup symmetry

    const first = await recordSale({ order, locationId: kitchen._id });
    assert.equal(first.alreadyProcessed, false);
    assert.equal(first.movements.length, 2);

    const afterFirst = {
      beef: (await IngredientModel.findById(beefRecipe._id)).currentStock,
      bun: (await IngredientModel.findById(bun._id)).currentStock,
    };
    assert.equal(afterFirst.beef, 5000 - 150);
    assert.equal(afterFirst.bun, 50 - 1);

    // Simulate a Stripe webhook retry / duplicate POS submit for the same order.
    const second = await recordSale({ order, locationId: kitchen._id });
    assert.equal(second.alreadyProcessed, true);
    assert.equal(second.movements.length, 0);

    const afterSecond = {
      beef: (await IngredientModel.findById(beefRecipe._id)).currentStock,
      bun: (await IngredientModel.findById(bun._id)).currentStock,
    };
    assert.equal(afterSecond.beef, afterFirst.beef, "second call must not consume beef again");
    assert.equal(afterSecond.bun, afterFirst.bun, "second call must not consume bun again");

    const saleMovementCount = await StockMovementModel.countDocuments({
      referenceType: "ORDER",
      referenceId: String(order._id),
      type: "SALE",
    });
    assert.equal(saleMovementCount, 2, "exactly one SALE row per ingredient, never duplicated");
  });

  // TEST K (Phase 3): getDefaultStockLocation() resolves the location
  // explicitly flagged isDefault, regardless of what else exists.
  await t.test("TEST K: getDefaultStockLocation resolves the flagged default location", async () => {
    kitchen.isDefault = true;
    await kitchen.save();

    const resolved = await getDefaultStockLocation();
    assert.ok(resolved);
    assert.equal(String(resolved._id), String(kitchen._id));
    assert.equal(resolved.isDefault, true);
  });

  // TEST L (Phase 3): the checkout-route / webhook / cancellation
  // integration points (consumeOrderStock / reverseOrderStock) behave
  // correctly end-to-end and are independently idempotent from
  // recordSale/reverseSale's own guarantees (TEST G already covers
  // recordSale's own duplicate-safety).
  await t.test("TEST L: consumeOrderStock then reverseOrderStock round-trips stock correctly", async () => {
    const order = {
      _id: new mongoose.Types.ObjectId(),
      orderNumber: `PHASE2TEST-ORD-L-${RUN_ID}`,
      items: [
        {
          productId: product._id,
          name: "PHASE2TEST Smashed Burger",
          itemType: "product",
          quantity: 1,
        },
      ],
    };

    const beefBefore = (await IngredientModel.findById(beefRecipe._id)).currentStock;
    const bunBefore = (await IngredientModel.findById(bun._id)).currentStock;

    const consumeResult = await consumeOrderStock(order);
    assert.equal(consumeResult.skipped, undefined);
    assert.equal(consumeResult.alreadyProcessed, false);
    assert.equal(consumeResult.movements.length, 2);

    const beefAfterSale = (await IngredientModel.findById(beefRecipe._id)).currentStock;
    const bunAfterSale = (await IngredientModel.findById(bun._id)).currentStock;
    assert.equal(beefAfterSale, beefBefore - 150);
    assert.equal(bunAfterSale, bunBefore - 1);

    // Cancellation reverses exactly what was consumed.
    const reverseResult = await reverseOrderStock(order);
    assert.equal(reverseResult.alreadyProcessed, false);
    assert.equal(reverseResult.movements.length, 2);

    const beefAfterReverse = (await IngredientModel.findById(beefRecipe._id)).currentStock;
    const bunAfterReverse = (await IngredientModel.findById(bun._id)).currentStock;
    assert.equal(beefAfterReverse, beefBefore);
    assert.equal(bunAfterReverse, bunBefore);

    // Calling reverseOrderStock again for the same order must not
    // double-refund (idempotent).
    const secondReverse = await reverseOrderStock(order);
    assert.equal(secondReverse.alreadyProcessed, true);

    const beefFinal = (await IngredientModel.findById(beefRecipe._id)).currentStock;
    assert.equal(beefFinal, beefBefore);
  });

  // TEST H: existing Category schema (extended, not replaced) still
  // accepts documents shaped like the real website's categories.
  await t.test("TEST H: existing Category shape still validates", async () => {
    const doc = new CategoryModel({
      name: `PHASE2TEST validate-only ${RUN_ID}`,
      slug: `phase2test-validate-only-${RUN_ID}`,
      description: "",
    });
    await assert.doesNotReject(() => doc.validate());
  });

  // TEST I: existing Product shape (extended, not replaced) still
  // validates with only the fields the public website already sends.
  await t.test("TEST I: existing Product shape still validates", async () => {
    const doc = new ProductModel({
      name: "PHASE2TEST validate-only product",
      slug: `phase2test-validate-only-product-${RUN_ID}`,
      category: category._id,
      mrp: 5,
      sellingPrice: 5,
      description: "Existing-shape validation only, never saved.",
      media: [],
    });
    await assert.doesNotReject(() => doc.validate());
  });

  // TEST J: existing Order model still accepts exactly the shape
  // /api/checkout/route.js creates, and can be persisted/removed.
  await t.test("TEST J: existing Order model still works end-to-end", async () => {
    const order = await OrderModel.create({
      orderType: "pickup",
      customer: { name: "Phase 2 Test", phone: "0000000000", email: "" },
      items: [
        {
          itemType: "product",
          productId: product._id,
          name: "PHASE2TEST Smashed Burger",
          price: 10,
          quantity: 1,
        },
      ],
      subtotal: 10,
      deliveryFee: 0,
      discount: 0,
      total: 10,
      payment: { method: "stripe", status: "pending" },
      orderStatus: "placed",
    });
    created.orderIds.push(order._id);

    assert.ok(order.orderNumber.startsWith("ORD-"));
    assert.equal(order.statusHistory.length, 1);

    const refetched = await OrderModel.findById(order._id).lean();
    assert.equal(refetched.total, 10);
  });

  // TEST M (Phase 5): the new POS-shaped Order (source, dine_in table,
  // cash payment with change due) validates and round-trips on the
  // exact same Order model the website uses.
  await t.test("TEST M: POS-shaped order (dine_in, cash) works on the same Order model", async () => {
    const order = await OrderModel.create({
      source: "pos",
      orderType: "dine_in",
      table: "12",
      cashierId: null,
      customer: { name: "Walk-in Customer", phone: "N/A" },
      items: [
        {
          itemType: "product",
          productId: product._id,
          name: "PHASE2TEST Smashed Burger",
          price: 10,
          quantity: 2,
        },
      ],
      subtotal: 20,
      deliveryFee: 0,
      discount: 2,
      total: 18,
      payment: {
        method: "cash",
        status: "paid",
        paidAt: new Date(),
        cashReceived: 20,
        changeDue: 2,
      },
      orderStatus: "placed",
    });
    created.orderIds.push(order._id);

    assert.equal(order.source, "pos");
    assert.equal(order.table, "12");
    assert.equal(order.payment.method, "cash");
    assert.equal(order.payment.changeDue, 2);

    const refetched = await OrderModel.findById(order._id).lean();
    assert.equal(refetched.total, 18);
    assert.equal(refetched.source, "pos");
  });

  // TEST N (Phase 6): recipe costing math — Ingredient Cost + Packaging
  // Cost = Total Cost; Selling Price - Total Cost = Gross Profit.
  // Uses brand-new, zero-stock ingredients so their averageCost is set
  // exactly by a single purchase, with nothing else diluting it.
  await t.test("TEST N: recipe costing computes ingredient/total cost, gross profit, food cost %", async () => {
    const beefCosting = await IngredientModel.create({
      ingredientCode: `PHASE2TEST-BEEF-COSTING-${RUN_ID}`,
      name: `Beef Patty (costing test) ${RUN_ID}`,
      purchaseUnit: "kg",
      usageUnit: "g",
      conversionFactor: 1000,
    });
    created.ingredientIds.push(beefCosting._id);

    const bunCosting = await IngredientModel.create({
      ingredientCode: `PHASE2TEST-BUN-COSTING-${RUN_ID}`,
      name: `Bun (costing test) ${RUN_ID}`,
      purchaseUnit: "pcs",
      usageUnit: "pcs",
      conversionFactor: 1,
    });
    created.ingredientIds.push(bunCosting._id);

    await recordPurchase({
      ingredientId: beefCosting._id,
      locationId: kitchen._id,
      quantity: 1,
      unit: "kg",
      unitCost: 10, // £10/kg -> £0.01/g, from zero prior stock
    });

    await recordPurchase({
      ingredientId: bunCosting._id,
      locationId: kitchen._id,
      quantity: 1,
      unit: "pcs",
      unitCost: 0.2, // £0.20/pcs, from zero prior stock
    });

    // Only one recipe may be active per product — deactivate the v1
    // recipe from TEST E/F before activating this costing-test version.
    await RecipeModel.updateMany({ product: product._id, active: true }, { active: false });

    const costingRecipe = await RecipeModel.create({
      product: product._id,
      version: 2,
      active: true,
      items: [
        { ingredient: beefCosting._id, quantity: 150, unit: "g" },
        { ingredient: bunCosting._id, quantity: 1, unit: "pcs" },
      ],
    });
    created.recipeIds.push(costingRecipe._id);

    const costing = await getRecipeCosting(product._id);

    assert.ok(costing);
    assert.equal(costing.recipeVersion, 2);
    assert.equal(costing.ingredientCost, 1.7); // 150g * £0.01 + 1pcs * £0.20
    assert.equal(costing.packagingCost, 0);
    assert.equal(costing.totalCost, 1.7);
    assert.equal(costing.sellingPrice, 10);
    assert.equal(costing.grossProfit, 8.3);
    assert.equal(costing.foodCostPercent, 17);
  });
});
