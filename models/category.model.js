import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      unique: true,
      trim: true,
    },

    slug: {
      type: String,
      required: [true, "Category slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true, // Fast lookup by slug in frontend routes
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    // ✅ FIXED: Array of ObjectIds referencing your Media model
    media: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Media",
      },
    ],

    // ✅ Soft Delete Support
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },

    // ---- Restaurant/admin foundation fields (additive, optional) ----
    active: {
      type: Boolean,
      default: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    // true = shown in the homepage "Bangladeshi Special" section (with its
    // products) INSTEAD of the "OUR MENU" grid and shop filters, e.g.
    // Dhaka Flavours. Unticked (default) categories go to OUR MENU.
    isBangladeshiSpecial: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true },
);

const CategoryModel =
  mongoose.models.Category ||
  mongoose.model("Category", categorySchema, "categories");

export default CategoryModel;
