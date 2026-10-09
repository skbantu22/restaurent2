import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import StockCountModel from "@/models/StockCount.model";
import IngredientModel from "@/models/Ingredient.model";
import {
  applyStockMovementWithinSession,
  InventoryError,
  NotFoundError,
} from "@/lib/inventory/inventory.service";

/**
 * Starts a new stock count for a location: snapshots each ingredient's
 * current stock + cost as `expectedStock`/`unitCostSnapshot`. No stock
 * is changed by starting a count.
 */
export async function startStockCount({
  locationId,
  ingredientIds,
  varianceThresholdPercent = 5,
  userId = null,
  notes = "",
}) {
  await connectDB();

  if (!locationId) throw new InventoryError("locationId is required");

  const filter = { active: true };
  if (ingredientIds?.length) filter._id = { $in: ingredientIds };

  const ingredients = await IngredientModel.find(filter).lean();

  if (ingredients.length === 0) {
    throw new InventoryError("No matching active ingredients found to count.");
  }

  const lines = ingredients.map((ingredient) => ({
    ingredient: ingredient._id,
    expectedStock: ingredient.currentStock,
    unitCostSnapshot: ingredient.averageCost || 0,
    actualStock: null,
    reason: "",
  }));

  const stockCount = await StockCountModel.create({
    location: locationId,
    varianceThresholdPercent,
    lines,
    notes,
    startedBy: userId,
  });

  return stockCount;
}

/**
 * Records/updates the physically-counted quantity (and optional
 * reason) for one or more lines on an OPEN count. Does not touch
 * ingredient stock — that only happens on submitStockCount().
 */
export async function recordStockCountEntries({ stockCountId, entries }) {
  await connectDB();

  const stockCount = await StockCountModel.findById(stockCountId);
  if (!stockCount) throw new NotFoundError("Stock count not found");
  if (stockCount.status !== "OPEN") {
    throw new InventoryError(`Cannot edit a stock count with status ${stockCount.status}`);
  }

  for (const entry of entries) {
    const line = stockCount.lines.find(
      (l) => String(l.ingredient) === String(entry.ingredient),
    );
    if (!line) continue;

    if (entry.actualStock !== undefined) line.actualStock = entry.actualStock;
    if (entry.reason !== undefined) line.reason = entry.reason;
  }

  await stockCount.save();
  return stockCount;
}

function variancePercent(line) {
  if (line.expectedStock === 0) {
    return line.actualStock > 0 ? Infinity : 0;
  }
  return (Math.abs(line.actualStock - line.expectedStock) / line.expectedStock) * 100;
}

/**
 * Finalizes a stock count: every counted line (actualStock entered)
 * with a non-zero variance becomes one ADJUSTMENT StockMovement,
 * atomically. Lines whose variance exceeds varianceThresholdPercent
 * MUST have a reason, or submission is rejected up front (nothing is
 * written).
 */
export async function submitStockCount({ stockCountId, userId = null }) {
  await connectDB();

  const stockCount = await StockCountModel.findById(stockCountId);
  if (!stockCount) throw new NotFoundError("Stock count not found");
  if (stockCount.status !== "OPEN") {
    throw new InventoryError(`Cannot submit a stock count with status ${stockCount.status}`);
  }

  const countedLines = stockCount.lines.filter((l) => l.actualStock !== null);
  if (countedLines.length === 0) {
    throw new InventoryError("No lines have been counted yet.");
  }

  const missingReason = countedLines.filter(
    (line) =>
      line.actualStock !== line.expectedStock &&
      variancePercent(line) > stockCount.varianceThresholdPercent &&
      !line.reason,
  );

  if (missingReason.length > 0) {
    const err = new InventoryError(
      `${missingReason.length} line(s) exceed the ${stockCount.varianceThresholdPercent}% variance threshold and require a reason before submitting.`,
    );
    err.details = missingReason.map((l) => String(l.ingredient));
    throw err;
  }

  const session = await mongoose.startSession();

  try {
    let movements = [];

    await session.withTransaction(async () => {
      const freshCount = await StockCountModel.findById(stockCountId).session(session);

      for (const line of freshCount.lines) {
        if (line.actualStock === null || line.actualStock === line.expectedStock) continue;

        const variance = line.actualStock - line.expectedStock;

        const movement = await applyStockMovementWithinSession(session, {
          ingredientId: line.ingredient,
          locationId: freshCount.location,
          type: "COUNT",
          direction: variance > 0 ? "IN" : "OUT",
          quantity: Math.abs(variance),
          unit: (await IngredientModel.findById(line.ingredient).session(session)).usageUnit,
          referenceType: "STOCK_COUNT",
          referenceId: String(freshCount._id),
          reason: line.reason || "Stock count variance",
          userId,
        });

        movements.push(movement);
      }

      freshCount.status = "SUBMITTED";
      freshCount.submittedBy = userId;
      freshCount.submittedAt = new Date();
      await freshCount.save({ session });
    });

    const finalCount = await StockCountModel.findById(stockCountId).lean();
    return { stockCount: finalCount, movements };
  } finally {
    await session.endSession();
  }
}
