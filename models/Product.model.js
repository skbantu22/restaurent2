import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    calories: {
      type: Number,
      default: null,
    },

    mrp: { type: Number, required: true, min: 0 },

    sellingPrice: { type: Number, required: true, min: 0 },

    discountPercentage: { type: Number, min: 0, max: 100 },

    // 🟢 1. isMostLoved ফিল্ড যুক্ত করা হলো (Default: false)
    isMostLoved: { type: Boolean, default: false, index: true },
    // 🟢 2. Dynamic Badge ফিল্ড যুক্ত করা হলো (e.g. "must try", "popular")
    badge: { type: String, default: "", trim: true },

    // রেস্তোরাঁর জন্য প্রমোশন বা ট্যাগ (যেমন: combo, chef-special, trending)
    offers: {
      type: [String],
      enum: ["mega", "new", "top", "free", "combo", "chef-special"],
      default: [],
    },

    // Explicit admin-set tag for the Custom Meal builder's "Select
    // Beef/Chicken/Plant Based Items" step (components/ui/Application/
    // website/customorders.jsx). Additive to category-based matching in
    // /api/product/filter — a product qualifies if EITHER its category
    // maps to that base OR this field is set, so existing correctly
    // categorised burgers keep working without needing this set.
    mealBuilderType: {
      type: String,
      enum: ["", "beef", "chicken", "plant"],
      default: "",
    },

    freeDelivery: { type: Boolean, default: false },

    // ---- Restaurant/POS foundation fields (additive, all optional) ----
    // None of these are required so every existing product document
    // remains valid without a migration.
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    costPrice: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxRate: {
      type: Number,
      min: 0,
      default: 0,
    },

    taxCode: {
      type: String,
      trim: true,
      default: "",
    },

    active: {
      type: Boolean,
      default: true,
    },

    available: {
      type: Boolean,
      default: true,
    },

    posVisible: {
      type: Boolean,
      default: true,
    },

    onlineVisible: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    // Whether this product's stock is derived from a Recipe/BOM via the
    // inventory service. Defaults to false so nothing changes behaviour
    // until a recipe is actually attached and this is turned on.
    inventoryTracked: {
      type: Boolean,
      default: false,
    },

    media: [
      { type: mongoose.Schema.Types.ObjectId, ref: "Media", required: true },
    ],

    description: { type: String, required: true },

    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

// Indexes
productSchema.index({ category: 1, subcategory: 1 });
productSchema.index({ offers: 1 });

const ProductModel =
  mongoose.models.Product ||
  mongoose.model("Product", productSchema, "products");

export default ProductModel;
