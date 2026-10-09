import mongoose from "mongoose";
import { UNIT_ENUM } from "@/lib/inventory/units";

// ============================================================
// STOCK MOVEMENT LEDGER
// ============================================================
// This is the single source of truth for ingredient stock history.
// Every change to Ingredient.currentStock MUST be accompanied by a
// StockMovement document created in the same transaction — see
// lib/inventory/inventory.service.js. Movements are append-only
// (no update routes are exposed for this collection).

export const STOCK_MOVEMENT_TYPES = [
  "OPENING_BALANCE",
  "PURCHASE",
  "SALE",
  "WASTE",
  "ADJUSTMENT",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "COUNT",
  "RETURN",
  "REFUND",
  "PRODUCTION",
  "VOID",
];

// Movement types that ADD to currentStock. Everything else subtracts.
export const STOCK_INCREASING_TYPES = [
  "OPENING_BALANCE",
  "PURCHASE",
  "TRANSFER_IN",
  "RETURN",
  "REFUND",
  "PRODUCTION",
];

const stockMovementSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
      index: true,
    },

    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockLocation",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: STOCK_MOVEMENT_TYPES,
      required: true,
      index: true,
    },

    // Quantity as originally entered, in `unit`. Signed: positive for
    // stock-increasing movement types, negative for stock-decreasing ones.
    quantity: {
      type: Number,
      required: true,
    },

    unit: {
      type: String,
      enum: UNIT_ENUM,
      required: true,
    },

    // `quantity` converted into the ingredient's usageUnit — this is the
    // value actually applied to currentStock. Signed, same convention.
    normalizedQuantity: {
      type: Number,
      required: true,
    },

    previousStock: {
      type: Number,
      required: true,
      min: 0,
    },

    newStock: {
      type: Number,
      required: true,
      min: 0,
    },

    // GBP cost per usageUnit at the time of this movement.
    unitCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Signed GBP value impact of this movement (unitCost * normalizedQuantity,
    // same sign as normalizedQuantity).
    totalCost: {
      type: Number,
      default: 0,
    },

    // e.g. "ORDER", "POS_ORDER", "PURCHASE_ORDER", "STOCK_COUNT", "MANUAL", "TRANSFER"
    referenceType: {
      type: String,
      trim: true,
      default: "MANUAL",
      index: true,
    },

    // Stored as a string for flexibility (Order _id, PO number, etc.)
    referenceId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    // Human-readable reference, e.g. the orderNumber, for display without a join.
    referenceNumber: {
      type: String,
      trim: true,
      default: "",
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ---- Idempotency guard ----
// The same (referenceType, referenceId, ingredient, type) combination can
// only ever produce ONE ledger row. This is the hard, server-enforced
// backstop against duplicate Stripe webhook retries / double order
// completion described in the spec. Movements without a referenceId
// (ad-hoc manual adjustments) are excluded via the partial filter.
stockMovementSchema.index(
  { referenceType: 1, referenceId: 1, ingredient: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      referenceId: { $exists: true, $type: "string" },
    },
  },
);

// Ledger history lookups.
stockMovementSchema.index({ ingredient: 1, location: 1, createdAt: -1 });
stockMovementSchema.index({ type: 1, createdAt: -1 });

const StockMovementModel =
  mongoose.models.StockMovement ||
  mongoose.model("StockMovement", stockMovementSchema, "stock_movements");

export default StockMovementModel;
