import mongoose from "mongoose";

// New, additive model. Deliberately NOT the same concept as the
// existing retail "showroom" (User.showroomId / ShowroomProductVariant).
// A StockLocation represents a physical storage area for restaurant
// inventory (kitchen line, dry store, walk-in freezer, etc.). It does
// not replace or interact with the showroom fields, which remain
// untouched for the existing retail POS.

export const STOCK_LOCATION_TYPES = [
  "KITCHEN",
  "STORAGE",
  "FREEZER",
  "FRIDGE",
  "SHOWROOM",
  "OTHER",
];

const stockLocationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Location name is required"],
      trim: true,
      unique: true,
    },

    code: {
      type: String,
      required: [true, "Location code is required"],
      trim: true,
      uppercase: true,
      unique: true,
    },

    type: {
      type: String,
      enum: STOCK_LOCATION_TYPES,
      default: "OTHER",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    // The location website/POS sales are deducted from when no more
    // specific location is known. Only one location should be default
    // at a time — enforced by the partial unique index below.
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

stockLocationSchema.index(
  { isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);

const StockLocationModel =
  mongoose.models.StockLocation ||
  mongoose.model("StockLocation", stockLocationSchema, "stock_locations");

export default StockLocationModel;
