import mongoose from "mongoose";
import { UNIT_ENUM } from "@/lib/inventory/units";

// ============================================================
// RECIPE / BOM
// ============================================================
// Product (existing model, untouched) --> Recipe --> RecipeItem[] --> Ingredient
//
// Recipe items are embedded subdocuments rather than a separate
// collection: they are always read/written together with their parent
// recipe and never queried independently, so embedding keeps recipe
// edits atomic without adding an extra collection. (If independent
// querying of recipe items is ever needed, they can be split out later
// without touching Ingredient/StockMovement.)
//
// A product can have multiple recipe *versions* over time; only one
// may be `active` at a time and that is the one used for sales/costing.
//
// Forward-compatibility for modifiers (spec section 9): the inventory
// service's consumeIngredients()/recordSale() operate on a plain list
// of {ingredientId, quantity, unit} entries, not specifically "recipe
// items". A future Modifier feature (e.g. "Extra Patty" -> +1 Beef
// Patty) can reuse the exact same {ingredient, quantity, unit,
// wastagePercentage} shape and simply contribute extra entries to that
// list before consumeIngredients() is called — no changes needed here.

const recipeItemSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: [0, "Recipe item quantity cannot be negative"],
    },

    unit: {
      type: String,
      enum: UNIT_ENUM,
      required: true,
    },

    // Extra % of `quantity` lost in prep (trim, spillage, etc.). Applied
    // when the service explodes a recipe into ingredient consumption.
    wastagePercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // Optional items (e.g. garnish) are excluded from automatic
    // consumption explosion for now — see recordSale() in the
    // inventory service. Reserved for future POS/modifier logic.
    optional: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const recipeSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    name: {
      type: String,
      trim: true,
      default: "",
    },

    version: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    items: {
      type: [recipeItemSchema],
      default: [],
      validate: {
        validator: (v) => v.length > 0,
        message: "Recipe must contain at least one ingredient.",
      },
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

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Only one active recipe version per product should exist at a time.
// Enforced in the service layer (activating a new version deactivates
// the previous one in the same transaction) — this index just protects
// against accidental double-active rows via direct writes.
recipeSchema.index(
  { product: 1, active: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true },
  },
);

recipeSchema.index({ product: 1, version: 1 }, { unique: true });

const RecipeModel =
  mongoose.models.Recipe || mongoose.model("Recipe", recipeSchema, "recipes");

export default RecipeModel;
