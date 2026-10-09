import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import IngredientModel from "@/models/Ingredient.model";
import StockMovementModel, {
  STOCK_INCREASING_TYPES,
} from "@/models/StockMovement.model";
import RecipeModel from "@/models/Recipe.model";
import StockLocationModel from "@/models/StockLocation.model";
import { normalizeToUsageUnit } from "@/lib/inventory/units";
import { mulMoney, weightedAverageCost } from "@/lib/inventory/money";

// ============================================================
// INVENTORY SERVICE
// ============================================================
// The ONLY code path allowed to change Ingredient.currentStock or
// write to StockMovement. Every future POS sale, website order
// completion, purchase receipt, waste log, stock count, or transfer
// must call through here so stock math and the ledger can never drift
// apart or get duplicated across routes.
//
// Suggested waste reasons for a future Waste UI (spec section on Waste
// Management) — not enforced as an enum here, kept as free text so this
// phase doesn't have to guess the final UX.
export const SUGGESTED_WASTE_REASONS = [
  "Spoilage",
  "Expired",
  "Overproduction",
  "Burnt",
  "Dropped",
  "Preparation Waste",
  "Staff Meal",
  "Customer Complaint",
  "Unknown",
];

export class InventoryError extends Error {
  constructor(message, code = "INVENTORY_ERROR") {
    super(message);
    this.name = "InventoryError";
    this.code = code;
  }
}

export class InsufficientStockError extends InventoryError {
  constructor(message) {
    super(message, "INSUFFICIENT_STOCK");
    this.name = "InsufficientStockError";
  }
}

export class DuplicateMovementError extends InventoryError {
  constructor(message) {
    super(message, "DUPLICATE_MOVEMENT");
    this.name = "DuplicateMovementError";
  }
}

export class NotFoundError extends InventoryError {
  constructor(message) {
    super(message, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

const ALWAYS_OUT_TYPES = ["SALE", "WASTE", "TRANSFER_OUT"];
const FLEXIBLE_DIRECTION_TYPES = ["ADJUSTMENT", "COUNT", "VOID"];

function resolveDirection(type, explicitDirection) {
  if (STOCK_INCREASING_TYPES.includes(type)) {
    if (explicitDirection && explicitDirection !== "IN") {
      throw new InventoryError(`Movement type "${type}" can only increase stock`);
    }
    return "IN";
  }

  if (ALWAYS_OUT_TYPES.includes(type)) {
    if (explicitDirection && explicitDirection !== "OUT") {
      throw new InventoryError(`Movement type "${type}" can only decrease stock`);
    }
    return "OUT";
  }

  if (FLEXIBLE_DIRECTION_TYPES.includes(type)) {
    if (explicitDirection !== "IN" && explicitDirection !== "OUT") {
      throw new InventoryError(
        `direction ("IN" or "OUT") is required for movement type "${type}"`,
      );
    }
    return explicitDirection;
  }

  throw new InventoryError(`Unknown stock movement type "${type}"`);
}

async function runInTransaction(work) {
  await connectDB();
  const session = await mongoose.startSession();

  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

/**
 * Internal primitive: apply ONE guarded, ledgered stock change to ONE
 * ingredient, inside an existing transaction session. Not exported —
 * all public functions below are built on top of this.
 */
async function applyMovement(session, params) {
  const {
    ingredientId,
    locationId,
    type,
    quantity,
    unit,
    direction: explicitDirection,
    unitCost: unitCostOverride,
    referenceType = "MANUAL",
    referenceId = null,
    referenceNumber = "",
    reason = "",
    notes = "",
    userId = null,
    allowNegativeStock = false,
  } = params;

  if (!ingredientId) throw new InventoryError("ingredientId is required");
  if (!locationId) throw new InventoryError("locationId is required");
  if (!quantity || quantity <= 0) {
    throw new InventoryError("quantity must be a positive number");
  }

  const direction = resolveDirection(type, explicitDirection);

  const ingredient = await IngredientModel.findById(ingredientId).session(session);
  if (!ingredient) {
    throw new NotFoundError(`Ingredient ${ingredientId} not found`);
  }

  const normalizedMagnitude = normalizeToUsageUnit(quantity, unit, ingredient);
  const signedNormalized = direction === "IN" ? normalizedMagnitude : -normalizedMagnitude;
  const signedQuantity = direction === "IN" ? quantity : -quantity;

  const previousStock = ingredient.currentStock;

  const filter = { _id: ingredient._id };
  const update = { $inc: { currentStock: signedNormalized } };

  if (direction === "OUT" && !allowNegativeStock) {
    filter.currentStock = { $gte: normalizedMagnitude };
  }

  let unitCost = ingredient.averageCost || 0;

  if (type === "PURCHASE") {
    if (unitCostOverride === undefined || unitCostOverride === null) {
      throw new InventoryError("unitCost is required for PURCHASE movements");
    }

    // unitCostOverride is expressed per `unit` (e.g. £/kg if the
    // purchase was entered in kg) — convert to cost-per-usageUnit
    // using the same factor as the quantity conversion above, so
    // averageCost/lastPurchaseCost always stay in GBP-per-usageUnit,
    // matching Ingredient.averageCost everywhere else it's read.
    const costPerUsageUnit =
      unit === ingredient.usageUnit ? unitCostOverride : unitCostOverride / ingredient.conversionFactor;

    unitCost = costPerUsageUnit;

    const newAverageCost = weightedAverageCost(
      previousStock,
      ingredient.averageCost || 0,
      normalizedMagnitude,
      costPerUsageUnit,
    );

    update.$set = {
      averageCost: newAverageCost,
      lastPurchaseCost: costPerUsageUnit,
    };
  } else if (unitCostOverride !== undefined && unitCostOverride !== null) {
    // e.g. REFUND reversing a SALE at its original recorded cost.
    unitCost = unitCostOverride;
  }

  const updated = await IngredientModel.findOneAndUpdate(filter, update, {
    session,
    returnDocument: "after",
  });

  if (!updated) {
    throw new InsufficientStockError(
      `Insufficient stock for "${ingredient.name}": have ${previousStock}${ingredient.usageUnit}, need ${normalizedMagnitude}${ingredient.usageUnit}`,
    );
  }

  const totalCost = mulMoney(unitCost, signedNormalized);

  try {
    const [movement] = await StockMovementModel.create(
      [
        {
          ingredient: ingredient._id,
          location: locationId,
          type,
          quantity: signedQuantity,
          unit,
          normalizedQuantity: signedNormalized,
          previousStock,
          newStock: updated.currentStock,
          unitCost,
          totalCost,
          referenceType,
          referenceId: referenceId !== null && referenceId !== undefined ? String(referenceId) : null,
          referenceNumber,
          reason,
          notes,
          createdBy: userId || null,
        },
      ],
      { session },
    );

    return movement;
  } catch (err) {
    if (err?.code === 11000) {
      throw new DuplicateMovementError(
        `Movement already recorded for reference "${referenceId}" / ingredient "${ingredient.name}" / type "${type}"`,
      );
    }
    throw err;
  }
}

/**
 * Advanced escape hatch: applies one guarded, ledgered stock movement
 * inside a transaction session the CALLER already owns (e.g.
 * lib/inventory/purchaseOrder.service.js updating the PurchaseOrder
 * document and the ingredient stock atomically together). Most code
 * should use the higher-level functions below instead — this exists
 * so a caller that needs to combine a stock movement with changes to
 * another document doesn't have to duplicate applyMovement's logic.
 */
export async function applyStockMovementWithinSession(session, params) {
  return applyMovement(session, params);
}

// ============================================================
// PUBLIC API
// ============================================================

/**
 * Generic stock increase (PURCHASE, TRANSFER_IN, RETURN, PRODUCTION,
 * OPENING_BALANCE, or an explicit IN adjustment/count).
 */
export async function increaseStock(params) {
  return runInTransaction((session) =>
    applyMovement(session, { ...params, direction: "IN" }),
  );
}

/**
 * Generic guarded stock decrease (SALE, WASTE, TRANSFER_OUT, or an
 * explicit OUT adjustment/count). Fails if insufficient stock unless
 * allowNegativeStock is explicitly set.
 */
export async function decreaseStock(params) {
  return runInTransaction((session) =>
    applyMovement(session, { ...params, direction: "OUT" }),
  );
}

/**
 * Manual stock correction (e.g. after a stock count variance).
 * direction ("IN" | "OUT") is required.
 */
export async function adjustStock(params) {
  return runInTransaction((session) =>
    applyMovement(session, { ...params, type: params.type || "ADJUSTMENT" }),
  );
}

export async function recordWaste({
  ingredientId,
  locationId,
  quantity,
  unit,
  reason,
  notes = "",
  userId,
  referenceType = "MANUAL",
  referenceId = null,
  referenceNumber = "",
}) {
  if (!reason) throw new InventoryError("A reason is required to record waste");

  return runInTransaction((session) =>
    applyMovement(session, {
      ingredientId,
      locationId,
      type: "WASTE",
      direction: "OUT",
      quantity,
      unit,
      reason,
      notes,
      userId,
      referenceType,
      referenceId,
      referenceNumber,
    }),
  );
}

export async function recordPurchase({
  ingredientId,
  locationId,
  quantity,
  unit,
  unitCost,
  referenceType = "PURCHASE_ORDER",
  referenceId = null,
  referenceNumber = "",
  notes = "",
  userId,
}) {
  return runInTransaction((session) =>
    applyMovement(session, {
      ingredientId,
      locationId,
      type: "PURCHASE",
      direction: "IN",
      quantity,
      unit,
      unitCost,
      referenceType,
      referenceId,
      referenceNumber,
      notes,
      userId,
    }),
  );
}

/**
 * Explode an order's items through their active recipes and consume
 * ingredient stock, once, atomically. Safe to call multiple times for
 * the same order (Stripe webhook retries, duplicate POS submits) — a
 * second call for an order that already has SALE movements is a no-op.
 *
 * @param {object} order - plain object or mongoose doc with _id, orderNumber, items[]
 *   items[]: { productId, quantity, itemType } — itemType other than
 *   "product" (e.g. "extra"/"drink") and items without an active recipe
 *   are skipped (reported back in `warnings`), not treated as errors.
 * @param {string} locationId - StockLocation to deduct from
 * @param {string} [userId]
 * @param {string} [referenceType="ORDER"]
 */
export async function recordSale({
  order,
  locationId,
  userId = null,
  referenceType = "ORDER",
}) {
  if (!order?._id) throw new InventoryError("order._id is required");
  if (!locationId) throw new InventoryError("locationId is required");

  await connectDB();

  const referenceId = String(order._id);

  const alreadyProcessed = await StockMovementModel.exists({
    referenceType,
    referenceId,
    type: "SALE",
  });

  if (alreadyProcessed) {
    return { alreadyProcessed: true, movements: [], warnings: [] };
  }

  const warnings = [];
  const consumptionByIngredient = new Map(); // ingredientId -> normalized usageUnit quantity

  // A Custom Meal bundle is one order line with its burger/extra/drink
  // selections nested in `items` (see models/Order.model.js) — flatten
  // those into the same consumption loop as top-level items, otherwise
  // every bundle's ingredients would be silently skipped.
  const consumableItems = (order.items || []).flatMap((item) =>
    item.itemType === "bundle" && Array.isArray(item.items)
      ? item.items
      : [item],
  );

  for (const item of consumableItems) {
    if (item.itemType && item.itemType !== "product") {
      warnings.push(
        `Skipped "${item.name || item.itemType}": custom extra/drink items are not yet mapped to an ingredient.`,
      );
      continue;
    }

    if (!item.productId) continue;

    const recipe = await RecipeModel.findOne({
      product: item.productId,
      active: true,
    }).lean();

    if (!recipe) {
      warnings.push(`Skipped "${item.name}": no active recipe for this product.`);
      continue;
    }

    for (const recipeItem of recipe.items) {
      if (recipeItem.optional) continue;

      const ingredient = await IngredientModel.findById(recipeItem.ingredient).lean();
      if (!ingredient) {
        warnings.push(`Recipe references missing ingredient ${recipeItem.ingredient}`);
        continue;
      }

      const perUnitQty =
        recipeItem.quantity * (1 + (recipeItem.wastagePercentage || 0) / 100);
      const totalQty = perUnitQty * (item.quantity || 1);
      const normalizedQty = normalizeToUsageUnit(totalQty, recipeItem.unit, ingredient);

      const key = String(recipeItem.ingredient);
      consumptionByIngredient.set(
        key,
        (consumptionByIngredient.get(key) || 0) + normalizedQty,
      );
    }
  }

  if (consumptionByIngredient.size === 0) {
    return { alreadyProcessed: false, movements: [], warnings };
  }

  try {
    const movements = await runInTransaction(async (session) => {
      const results = [];

      for (const [ingredientId, normalizedQty] of consumptionByIngredient) {
        const ingredient = await IngredientModel.findById(ingredientId).session(session);
        if (!ingredient) continue;

        const movement = await applyMovement(session, {
          ingredientId,
          locationId,
          type: "SALE",
          direction: "OUT",
          quantity: normalizedQty,
          unit: ingredient.usageUnit,
          referenceType,
          referenceId,
          referenceNumber: order.orderNumber || "",
          reason: "Order sale",
          userId,
        });

        results.push(movement);
      }

      return results;
    });

    return { alreadyProcessed: false, movements, warnings };
  } catch (err) {
    if (err instanceof DuplicateMovementError) {
      // A concurrent call already committed these movements for this
      // order — treat as an idempotent no-op rather than an error.
      return { alreadyProcessed: true, movements: [], warnings };
    }
    throw err;
  }
}

/**
 * Reverse a previously recorded SALE for an order (refund/cancellation).
 * Idempotent: calling twice for the same order only creates REFUND
 * movements once.
 */
export async function reverseSale({
  order,
  locationId,
  userId = null,
  referenceType = "ORDER",
  reason = "Order refund/cancellation",
}) {
  if (!order?._id) throw new InventoryError("order._id is required");

  await connectDB();

  const referenceId = String(order._id);

  const alreadyReversed = await StockMovementModel.exists({
    referenceType,
    referenceId,
    type: "REFUND",
  });

  if (alreadyReversed) {
    return { alreadyProcessed: true, movements: [] };
  }

  const saleMovements = await StockMovementModel.find({
    referenceType,
    referenceId,
    type: "SALE",
  }).lean();

  if (saleMovements.length === 0) {
    return { alreadyProcessed: false, movements: [], note: "No SALE movements found to reverse" };
  }

  try {
    const movements = await runInTransaction(async (session) => {
      const results = [];

      for (const sale of saleMovements) {
        const movement = await applyMovement(session, {
          ingredientId: sale.ingredient,
          locationId: locationId || sale.location,
          type: "REFUND",
          direction: "IN",
          quantity: Math.abs(sale.normalizedQuantity),
          unit: (await IngredientModel.findById(sale.ingredient).session(session))
            ?.usageUnit,
          unitCost: sale.unitCost,
          referenceType,
          referenceId,
          referenceNumber: sale.referenceNumber,
          reason,
          userId,
        });

        results.push(movement);
      }

      return results;
    });

    return { alreadyProcessed: false, movements };
  } catch (err) {
    if (err instanceof DuplicateMovementError) {
      return { alreadyProcessed: true, movements: [] };
    }
    throw err;
  }
}

/**
 * Move stock between two locations. Both legs are recorded atomically
 * (or neither is).
 */
export async function transferStock({
  ingredientId,
  fromLocationId,
  toLocationId,
  quantity,
  unit,
  reason = "",
  notes = "",
  userId = null,
  referenceNumber = "",
  referenceId,
}) {
  if (!fromLocationId || !toLocationId) {
    throw new InventoryError("fromLocationId and toLocationId are required");
  }
  if (String(fromLocationId) === String(toLocationId)) {
    throw new InventoryError("fromLocationId and toLocationId must differ");
  }

  const transferRef =
    referenceId || `TR-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  return runInTransaction(async (session) => {
    const out = await applyMovement(session, {
      ingredientId,
      locationId: fromLocationId,
      type: "TRANSFER_OUT",
      direction: "OUT",
      quantity,
      unit,
      reason,
      notes,
      userId,
      referenceType: "TRANSFER",
      referenceId: transferRef,
      referenceNumber,
    });

    const inn = await applyMovement(session, {
      ingredientId,
      locationId: toLocationId,
      type: "TRANSFER_IN",
      direction: "IN",
      quantity,
      unit,
      reason,
      notes,
      userId,
      referenceType: "TRANSFER",
      referenceId: transferRef,
      referenceNumber,
    });

    return [out, inn];
  });
}

// ============================================================
// READ-ONLY QUERIES
// ============================================================

function stockStatus(ingredient) {
  if (ingredient.currentStock <= 0) return "OUT_OF_STOCK";
  if (ingredient.minimumStock > 0 && ingredient.currentStock <= ingredient.minimumStock) {
    return "LOW_STOCK";
  }
  if (ingredient.maximumStock > 0 && ingredient.currentStock > ingredient.maximumStock) {
    return "OVERSTOCKED";
  }
  return "OK";
}

export async function getStock({ ingredientId, activeOnly = true } = {}) {
  await connectDB();

  if (ingredientId) {
    const ingredient = await IngredientModel.findById(ingredientId).lean();
    if (!ingredient) throw new NotFoundError(`Ingredient ${ingredientId} not found`);
    return { ...ingredient, status: stockStatus(ingredient) };
  }

  const filter = activeOnly ? { active: true } : {};
  const ingredients = await IngredientModel.find(filter).sort({ name: 1 }).lean();

  return ingredients.map((ingredient) => ({
    ...ingredient,
    status: stockStatus(ingredient),
    stockValue: Number((ingredient.currentStock * (ingredient.averageCost || 0)).toFixed(2)),
  }));
}

export async function getStockMovements({
  ingredientId,
  locationId,
  type,
  referenceType,
  referenceId,
  from,
  to,
  page = 1,
  limit = 50,
} = {}) {
  await connectDB();

  const filter = {};
  if (ingredientId) filter.ingredient = ingredientId;
  if (locationId) filter.location = locationId;
  if (type) filter.type = type;
  if (referenceType) filter.referenceType = referenceType;
  if (referenceId) filter.referenceId = String(referenceId);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const safePage = Math.max(Number(page) || 1, 1);

  const [movements, total] = await Promise.all([
    StockMovementModel.find(filter)
      .populate("ingredient", "name ingredientCode usageUnit")
      .populate("location", "name code")
      .sort({ createdAt: -1 })
      .skip((safePage - 1) * safeLimit)
      .limit(safeLimit)
      .lean(),
    StockMovementModel.countDocuments(filter),
  ]);

  return { movements, total, page: safePage, limit: safeLimit };
}

export async function getInventoryDashboardSummary() {
  await connectDB();

  const ingredients = await IngredientModel.find({ active: true }).lean();

  let totalInventoryValue = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let overstockedCount = 0;
  const lowStockItems = [];
  const outOfStockItems = [];

  for (const ingredient of ingredients) {
    totalInventoryValue += ingredient.currentStock * (ingredient.averageCost || 0);

    const status = stockStatus(ingredient);
    if (status === "OUT_OF_STOCK") {
      outOfStockCount += 1;
      outOfStockItems.push(ingredient);
    } else if (status === "LOW_STOCK") {
      lowStockCount += 1;
      lowStockItems.push(ingredient);
    } else if (status === "OVERSTOCKED") {
      overstockedCount += 1;
    }
  }

  const recentMovements = await StockMovementModel.find({})
    .populate("ingredient", "name ingredientCode")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const recentWaste = await StockMovementModel.find({ type: "WASTE" })
    .populate("ingredient", "name ingredientCode")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return {
    totalIngredients: ingredients.length,
    totalInventoryValue: Number(totalInventoryValue.toFixed(2)),
    lowStockCount,
    outOfStockCount,
    overstockedCount,
    lowStockItems,
    outOfStockItems,
    recentMovements,
    recentWaste,
  };
}

export async function getTopConsumedIngredients({ from, to, limit = 10, types = ["SALE", "WASTE"] } = {}) {
  await connectDB();

  const match = { type: { $in: types } };
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from);
    if (to) match.createdAt.$lte = new Date(to);
  }

  const rows = await StockMovementModel.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$ingredient",
        totalConsumed: { $sum: { $abs: "$normalizedQuantity" } },
        totalCost: { $sum: { $abs: "$totalCost" } },
      },
    },
    { $sort: { totalConsumed: -1 } },
    { $limit: Math.min(Math.max(Number(limit) || 10, 1), 50) },
    {
      $lookup: {
        from: "ingredients",
        localField: "_id",
        foreignField: "_id",
        as: "ingredient",
      },
    },
    { $unwind: "$ingredient" },
    {
      $project: {
        _id: 0,
        ingredientId: "$_id",
        name: "$ingredient.name",
        ingredientCode: "$ingredient.ingredientCode",
        usageUnit: "$ingredient.usageUnit",
        totalConsumed: 1,
        totalCost: { $round: ["$totalCost", 2] },
      },
    },
  ]);

  return rows;
}

export async function getWasteReport() {
  await connectDB();

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  async function sumSince(date) {
    const rows = await StockMovementModel.aggregate([
      { $match: { type: "WASTE", createdAt: { $gte: date } } },
      {
        $group: {
          _id: null,
          quantity: { $sum: { $abs: "$normalizedQuantity" } },
          cost: { $sum: { $abs: "$totalCost" } },
        },
      },
    ]);
    return rows[0]
      ? { quantity: rows[0].quantity, cost: Number(rows[0].cost.toFixed(2)) }
      : { quantity: 0, cost: 0 };
  }

  const [wasteToday, wasteThisWeek, wasteThisMonth, topWastedIngredients, wasteByReasonRaw] =
    await Promise.all([
      sumSince(startOfToday),
      sumSince(startOfWeek),
      sumSince(startOfMonth),
      getTopConsumedIngredients({ types: ["WASTE"], limit: 10 }),
      StockMovementModel.aggregate([
        { $match: { type: "WASTE" } },
        {
          $group: {
            _id: "$reason",
            quantity: { $sum: { $abs: "$normalizedQuantity" } },
            cost: { $sum: { $abs: "$totalCost" } },
          },
        },
        { $sort: { cost: -1 } },
      ]),
    ]);

  const wasteByReason = wasteByReasonRaw.map((row) => ({
    reason: row._id || "Unspecified",
    quantity: row.quantity,
    cost: Number(row.cost.toFixed(2)),
  }));

  return { wasteToday, wasteThisWeek, wasteThisMonth, topWastedIngredients, wasteByReason };
}

// ============================================================
// ORDER INTEGRATION (Phase 3)
// ============================================================
// Thin, deliberately never-throwing wrappers around recordSale/
// reverseSale for the live website checkout + Stripe webhook + admin
// order-status routes to call. Inventory bookkeeping must never be
// able to block a real payment or order from completing — if stock
// can't be consumed for any reason (no location configured yet, no
// recipe for a product yet, a genuine insufficient-stock condition),
// that is logged and returned as `{ skipped: true, reason }`, never
// thrown back to the caller.

/**
 * Resolves which StockLocation website/POS sales should consume from:
 * the location explicitly flagged isDefault, or (until one is
 * configured) the oldest active location, or null if none exist yet.
 */
export async function getDefaultStockLocation() {
  await connectDB();

  const preferred = await StockLocationModel.findOne({
    isDefault: true,
    active: true,
  }).lean();

  if (preferred) return preferred;

  return StockLocationModel.findOne({ active: true }).sort({ createdAt: 1 }).lean();
}

/**
 * Call this exactly once per order, at the moment an order is
 * confirmed/paid (Stripe webhook success, or immediately for a cash/
 * pickup order that has no separate payment-confirmation step).
 * Safe to call multiple times for the same order — recordSale() is
 * idempotent. Never throws.
 */
export async function consumeOrderStock(order) {
  try {
    const location = await getDefaultStockLocation();

    if (!location) {
      console.warn(
        `[inventory] Skipped stock consumption for order ${order?._id}: no active StockLocation configured yet.`,
      );
      return { skipped: true, reason: "No active stock location configured yet." };
    }

    const result = await recordSale({ order, locationId: location._id });

    if (result.warnings?.length) {
      console.warn(`[inventory] Order ${order?._id} sale warnings:`, result.warnings);
    }

    return result;
  } catch (err) {
    console.error(`[inventory] consumeOrderStock failed for order ${order?._id}:`, err);
    return { skipped: true, reason: err.message };
  }
}

/**
 * Call this when an order that may have already consumed stock is
 * cancelled/refunded. Safe to call for an order that never consumed
 * anything (no-op) or twice for the same order (idempotent). Never
 * throws.
 */
export async function reverseOrderStock(order) {
  try {
    const location = await getDefaultStockLocation();

    const result = await reverseSale({
      order,
      locationId: location?._id,
    });

    return result;
  } catch (err) {
    console.error(`[inventory] reverseOrderStock failed for order ${order?._id}:`, err);
    return { skipped: true, reason: err.message };
  }
}
