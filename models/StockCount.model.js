import mongoose from "mongoose";

// ============================================================
// STOCK COUNT
// ============================================================
// A count snapshots each ingredient's expected stock at start time,
// lets a manager enter actual counted quantities, computes variance +
// cost impact, and on submit creates one ADJUSTMENT StockMovement per
// non-zero-variance line — never touching currentStock directly.

export const STOCK_COUNT_STATUSES = ["OPEN", "SUBMITTED", "CANCELLED"];

const stockCountLineSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },

    // Snapshotted from Ingredient.currentStock when the count started.
    expectedStock: {
      type: Number,
      required: true,
      min: 0,
    },

    // Snapshotted averageCost, used to compute costImpact even if the
    // ingredient's cost changes later.
    unitCostSnapshot: {
      type: Number,
      default: 0,
      min: 0,
    },

    // null until a manager enters a physical count.
    actualStock: {
      type: Number,
      default: null,
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false },
);

const stockCountSchema = new mongoose.Schema(
  {
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockLocation",
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: STOCK_COUNT_STATUSES,
      default: "OPEN",
      index: true,
    },

    // Variance % (of expectedStock) beyond which `reason` becomes
    // mandatory for that line before the count can be submitted.
    varianceThresholdPercent: {
      type: Number,
      default: 5,
      min: 0,
    },

    lines: {
      type: [stockCountLineSchema],
      default: [],
      validate: {
        validator: (v) => v.length > 0,
        message: "Stock count must contain at least one ingredient.",
      },
    },

    notes: { type: String, trim: true, default: "" },

    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

const StockCountModel =
  mongoose.models.StockCount ||
  mongoose.model("StockCount", stockCountSchema, "stock_counts");

export default StockCountModel;
