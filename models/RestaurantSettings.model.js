import mongoose from "mongoose";

// Singleton document (a single row, upserted via findOneAndUpdate({}, ...))
// holding restaurant-wide identity and business-rule config, following the
// same pattern as models/FbTrackingSetting.model.js. Read through
// lib/settings.server.js's getRestaurantSettings(), which creates this
// document with defaults on first read if it doesn't exist yet.
const openingHourSchema = new mongoose.Schema(
  {
    day: {
      type: String,
      enum: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      required: true,
    },
    open: { type: String, default: "08:00" },
    close: { type: String, default: "23:59" },
    closed: { type: Boolean, default: false },
  },
  { _id: false },
);

const restaurantSettingsSchema = new mongoose.Schema(
  {
    general: {
      name: { type: String, default: "Shawon Food Gate", trim: true },
      logoUrl: { type: String, default: "", trim: true },
      address: { type: String, default: "179 Forest Ln, London E7 9BB", trim: true },
      phone: { type: String, default: "020 3995 6692", trim: true },
      email: { type: String, default: "", trim: true },
    },
    business: {
      currencyCode: { type: String, default: "GBP", trim: true, uppercase: true },
      currencySymbol: { type: String, default: "£", trim: true },
      // Display/reporting only — does not change checkout totals.
      taxRate: { type: Number, default: 0, min: 0, max: 100 },
      deliveryFee: { type: Number, default: 3.99, min: 0 },
      minOrderAmount: { type: Number, default: 0, min: 0 },
      openingHours: { type: [openingHourSchema], default: [] },
    },
    orders: {
      posOrderPrefix: { type: String, default: "SFG-", trim: true },
      receiptFooterText: {
        type: String,
        default: "Thank you for your order!",
        trim: true,
      },
    },
    // Dine-in tables shown in the POS (AmarSolution-style "Select Table")
    tables: {
      type: [String],
      default: ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11", "T12"],
    },
    // Waiter names for the POS "Select Waiter" dropdown
    waiters: { type: [String], default: [] },
    payments: {
      cashEnabled: { type: Boolean, default: true },
      cardEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

const RestaurantSettingsModel =
  mongoose.models.RestaurantSettings ||
  mongoose.model("RestaurantSettings", restaurantSettingsSchema);

export default RestaurantSettingsModel;
