import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import PurchaseOrderModel from "@/models/PurchaseOrder.model";
import IngredientModel from "@/models/Ingredient.model";
import {
  applyStockMovementWithinSession,
  InventoryError,
  NotFoundError,
} from "@/lib/inventory/inventory.service";

/**
 * Marks a DRAFT purchase order as SENT (to the supplier). No stock
 * effect — stock only changes on receipt.
 */
export async function sendPurchaseOrder({ purchaseOrderId, userId }) {
  await connectDB();

  const po = await PurchaseOrderModel.findById(purchaseOrderId);
  if (!po) throw new NotFoundError("Purchase order not found");
  if (po.status !== "DRAFT") {
    throw new InventoryError(`Cannot send a purchase order with status ${po.status}`);
  }

  po.status = "SENT";
  po.updatedBy = userId || null;
  await po.save();

  return po;
}

export async function cancelPurchaseOrder({ purchaseOrderId, userId }) {
  await connectDB();

  const po = await PurchaseOrderModel.findById(purchaseOrderId);
  if (!po) throw new NotFoundError("Purchase order not found");
  if (["RECEIVED", "CANCELLED"].includes(po.status)) {
    throw new InventoryError(`Cannot cancel a purchase order with status ${po.status}`);
  }

  po.status = "CANCELLED";
  await po.save();

  return po;
}

/**
 * Records goods actually received against a SENT/PARTIALLY_RECEIVED
 * purchase order. Supports partial delivery — call this once per
 * delivery. Each call is its own atomic transaction: the PurchaseOrder
 * document (receivedQuantity per line, receivingEvents history,
 * status) and every ingredient's stock/ledger update all succeed or
 * all fail together.
 *
 * Stock only ever increases here — never when a PO is merely created
 * or sent.
 *
 * @param {string} purchaseOrderId
 * @param {{ingredient: string, quantityReceived: number}[]} lines
 * @param {string} locationId - where the goods are being received into
 * @param {string} [userId]
 */
export async function receivePurchaseOrder({
  purchaseOrderId,
  lines,
  locationId,
  userId = null,
}) {
  if (!locationId) throw new InventoryError("locationId is required");
  if (!lines?.length) throw new InventoryError("At least one line is required");

  await connectDB();
  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const po = await PurchaseOrderModel.findById(purchaseOrderId).session(session);
      if (!po) throw new NotFoundError("Purchase order not found");

      if (!["SENT", "PARTIALLY_RECEIVED"].includes(po.status)) {
        throw new InventoryError(
          `Cannot receive goods against a purchase order with status ${po.status}`,
        );
      }

      const eventIndex = po.receivingEvents.length;
      const movements = [];
      const appliedLines = [];

      for (const line of lines) {
        const item = po.items.find(
          (i) => String(i.ingredient) === String(line.ingredient),
        );

        if (!item) {
          throw new InventoryError(
            `Ingredient ${line.ingredient} is not on this purchase order`,
          );
        }

        const remaining = item.orderedQuantity - item.receivedQuantity;
        const qty = Math.min(Number(line.quantityReceived) || 0, remaining);

        if (qty <= 0) continue;

        const ingredient = await IngredientModel.findById(item.ingredient).session(session);
        if (!ingredient) {
          throw new NotFoundError(`Ingredient ${item.ingredient} not found`);
        }

        // item.purchasePrice is GBP per item.purchaseUnit — passed
        // through as-is; applyMovement() converts it to cost-per-
        // usageUnit itself (same as it does for quantity), so it must
        // NOT be pre-converted here too.
        const movement = await applyStockMovementWithinSession(session, {
          ingredientId: item.ingredient,
          locationId,
          type: "PURCHASE",
          direction: "IN",
          quantity: qty,
          unit: item.purchaseUnit,
          unitCost: item.purchasePrice,
          referenceType: "PURCHASE_ORDER",
          referenceId: `${po._id}:${eventIndex}`,
          referenceNumber: po.poNumber,
          userId,
        });

        item.receivedQuantity += qty;
        movements.push(movement);
        appliedLines.push({ ingredient: item.ingredient, quantityReceived: qty });
      }

      if (appliedLines.length === 0) {
        throw new InventoryError(
          "Nothing to receive — all lines are already fully received or zero.",
        );
      }

      po.receivingEvents.push({
        receivedAt: new Date(),
        receivedBy: userId || null,
        lines: appliedLines,
      });

      const fullyReceived = po.items.every(
        (item) => item.receivedQuantity >= item.orderedQuantity,
      );

      po.status = fullyReceived ? "RECEIVED" : "PARTIALLY_RECEIVED";
      if (fullyReceived) po.receivedBy = userId || po.receivedBy;

      await po.save({ session });

      result = { purchaseOrder: po, movements };
    });

    return result;
  } finally {
    await session.endSession();
  }
}
