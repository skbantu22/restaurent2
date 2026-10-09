import mongoose from "mongoose";
import slugify from "slugify";
import { UNIT_ENUM } from "@/lib/inventory/units";

// ============================================================
// INGREDIENT / STOCK ITEM
// ============================================================
// This is a brand new collection. It is intentionally NOT related to
// ProductVariant/ShowroomProductVariant (retail color/size stock) —
// those remain untouched. An Ingredient is a raw stock item consumed
// via Recipe/BOM when a menu Product is sold (Beef Patty, Bun, Sauce...).
//
// All stock quantities (currentStock, minimumStock, parLevel,
// maximumStock) are tracked in `usageUnit`. See lib/inventory/units.js.

const ingredientSchema = new mongoose.Schema(
  {
    ingredientCode: {
      type: String,
      required: [true, "Ingredient code is required"],
      trim: true,
      uppercase: true,
      unique: true,
    },

    name: {
      type: String,
      required: [true, "Ingredient name is required"],
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // Free-text grouping (e.g. "Protein", "Dairy", "Produce", "Packaging").
    // Deliberately a plain string, NOT a ref to the Category collection —
    // Category is a customer-facing menu concept, this is a back-of-house
    // grouping and the two must not be confused.
    category: {
      type: String,
      trim: true,
      default: "",
    },

    // Base/stock-keeping unit. Kept as its own field per spec, but must
    // always equal usageUnit — defaulted automatically if omitted, see
    // the pre-validate hook below. Exists so a display/report layer can
    // read a single canonical "unit" without knowing about the
    // purchase/usage distinction.
    unit: {
      type: String,
      enum: UNIT_ENUM,
    },

    purchaseUnit: {
      type: String,
      enum: UNIT_ENUM,
      required: [true, "Purchase unit is required"],
    },

    usageUnit: {
      type: String,
      enum: UNIT_ENUM,
      required: [true, "Usage unit is required"],
    },

    // How many usageUnits make up 1 purchaseUnit.
    // e.g. purchaseUnit=kg, usageUnit=g -> conversionFactor=1000.
    // If purchaseUnit === usageUnit this must be 1.
    conversionFactor: {
      type: Number,
      required: [true, "Conversion factor is required"],
      min: [0.000001, "Conversion factor must be greater than 0"],
      default: 1,
    },

    // ---- Stock levels (all in usageUnit) ----
    currentStock: {
      type: Number,
      required: true,
      min: [0, "Stock cannot go negative"],
      default: 0,
    },

    minimumStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    parLevel: {
      type: Number,
      min: 0,
      default: 0,
    },

    maximumStock: {
      type: Number,
      min: 0,
      default: 0,
    },

    // ---- Costing (GBP per usageUnit) ----
    averageCost: {
      type: Number,
      min: 0,
      default: 0,
    },

    lastPurchaseCost: {
      type: Number,
      min: 0,
      default: 0,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      default: null,
    },

    // Primary/default storage location. Phase 2 tracks a single
    // aggregate currentStock per ingredient; true per-location stock
    // splitting can be built later on top of StockMovement.location
    // history without changing this shape.
    location: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockLocation",
      default: null,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

ingredientSchema.index({ category: 1 });
ingredientSchema.index({ currentStock: 1 });

ingredientSchema.pre("validate", function () {
  if (!this.slug && this.name) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }

  if (!this.unit && this.usageUnit) {
    this.unit = this.usageUnit;
  }

  if (
    this.purchaseUnit === this.usageUnit &&
    (this.conversionFactor === undefined || this.conversionFactor === null)
  ) {
    this.conversionFactor = 1;
  }
});

const IngredientModel =
  mongoose.models.Ingredient ||
  mongoose.model("Ingredient", ingredientSchema, "ingredients");

export default IngredientModel;
