import mongoose from "mongoose";
import { UNIT_ENUM } from "@/lib/inventory/units";

// ============================================================
// PURCHASE ORDER
// ============================================================
// Stock is NEVER increased just because a PurchaseOrder is created —
// only when goods are actually received, via
// lib/inventory/purchaseOrder.service.js -> receivePurchaseOrder(),
// which writes PURCHASE StockMovement rows and updates
// Ingredient.averageCost/lastPurchaseCost through the same guarded,
// transactional primitives as everything else in the inventory system.

export const PURCHASE_ORDER_STATUSES = [
  "DRAFT",
  "SENT",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "CANCELLED",
];

const purchaseOrderItemSchema = new mongoose.Schema(
  {
    ingredient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ingredient",
      required: true,
    },

    orderedQuantity: {
      type: Number,
      required: true,
      min: [0.000001, "Ordered quantity must be greater than 0"],
    },

    // Purchase orders are always placed in the ingredient's purchaseUnit.
    purchaseUnit: {
      type: String,
      enum: UNIT_ENUM,
      required: true,
    },

    // GBP cost per purchaseUnit for this order.
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    receivedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false },
);

const receivingEventSchema = new mongoose.Schema(
  {
    receivedAt: { type: Date, default: Date.now },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    lines: [
      {
        ingredient: { type: mongoose.Schema.Types.ObjectId, ref: "Ingredient" },
        quantityReceived: Number,
      },
    ],
  },
  { _id: false },
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },

    status: {
      type: String,
      enum: PURCHASE_ORDER_STATUSES,
      default: "DRAFT",
      index: true,
    },

    orderDate: {
      type: Date,
      default: Date.now,
    },

    expectedDeliveryDate: {
      type: Date,
      default: null,
    },

    items: {
      type: [purchaseOrderItemSchema],
      default: [],
      validate: {
        validator: (v) => v.length > 0,
        message: "Purchase order must contain at least one item.",
      },
    },

    subtotal: { type: Number, default: 0, min: 0 },
    vatRate: { type: Number, default: 0, min: 0, max: 100 },
    vatAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, default: 0, min: 0 },

    notes: { type: String, trim: true, default: "" },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    receivedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    receivingEvents: { type: [receivingEventSchema], default: [] },
  },
  { timestamps: true },
);

purchaseOrderSchema.pre("validate", function () {
  if (!this.poNumber) {
    this.poNumber = `PO-${Date.now().toString(36).toUpperCase()}`;
  }

  const subtotalPence = this.items.reduce(
    (sum, item) => sum + Math.round(item.orderedQuantity * item.purchasePrice * 100),
    0,
  );
  const vatPence = Math.round((subtotalPence * (this.vatRate || 0)) / 100);

  this.subtotal = subtotalPence / 100;
  this.vatAmount = vatPence / 100;
  this.total = (subtotalPence + vatPence) / 100;
});

const PurchaseOrderModel =
  mongoose.models.PurchaseOrder ||
  mongoose.model("PurchaseOrder", purchaseOrderSchema, "purchase_orders");

export default PurchaseOrderModel;
