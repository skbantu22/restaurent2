import mongoose from "mongoose";
import crypto from "crypto";

const ORDER_STATUSES = [
  "placed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

const PAYMENT_STATUSES = ["pending", "paid", "failed", "cancelled", "refunded"];

// A Custom Meal's burger/extra/drink selections, nested one level deep
// inside an OrderItemSchema entry with itemType "bundle" — see
// OrderItemSchema.items below. Deliberately a plain flat shape (not a
// recursive OrderItemSchema) since bundle children are never
// themselves bundles.
const BundleChildItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
    itemType: {
      type: String,
      enum: ["product", "extra", "drink", "category"],
      default: "product",
      required: true,
    },
    customId: { type: String, default: "", trim: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
  },
  { _id: false },
);

const OrderItemSchema = new mongoose.Schema(
  {
    // Real MongoDB product
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },

    // Item type. "category" was added for the custom-meal builder's
    // informational £0 base-protein line (e.g. "Category: Beef") —
    // see /api/checkout's category- handling. "bundle" is the custom
    // meal builder's whole package as ONE order line (see `items`
    // below for its burger/extra/drink breakdown) rather than each
    // selection being its own separate top-level order item.
    itemType: {
      type: String,
      enum: ["product", "extra", "drink", "category", "bundle"],
      default: "product",
      required: true,
    },

    // Used for extra/drink/bundle items
    customId: {
      type: String,
      default: "",
      trim: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    // Only present when itemType === "bundle" — the burger/extra/drink
    // selections that make up this Custom Meal, so the kitchen still
    // sees exactly what to prepare even though it's one order line.
    items: {
      type: [BundleChildItemSchema],
      default: undefined,
    },
  },
  {
    _id: false,
  },
);

const PaymentSchema = new mongoose.Schema(
  {
    method: {
      // "cash"/"card"/"split" added for POS (Phase 5) alongside the
      // existing website methods — "cod" and "stripe" are unchanged.
      type: String,
      enum: ["cod", "stripe", "cash", "card", "split"],
      default: "stripe",
    },

    status: {
      type: String,
      enum: PAYMENT_STATUSES,
      default: "pending",
    },

    stripeSessionId: {
      type: String,
      default: "",
    },

    paymentIntentId: {
      type: String,
      default: "",
    },

    transactionId: {
      type: String,
      default: "",
    },

    paidAt: {
      type: Date,
      default: null,
    },

    // ---- POS cash handling ----
    cashReceived: { type: Number, default: null },
    changeDue: { type: Number, default: null },

    // ---- Split payment architecture ----
    // Not exposed in a full UI yet, but the shape exists so a POS
    // order can already record "£10 cash + £5 card" without a later
    // schema change: method="split" with this breakdown.
    splitPayments: {
      type: [
        {
          method: { type: String, enum: ["cash", "card", "stripe", "cod"] },
          amount: { type: Number, min: 0 },
        },
      ],
      default: [],
      _id: false,
    },
  },
  {
    _id: false,
  },
);

const OrderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    orderNumber: {
      type: String,
      unique: true,
      index: true,
    },

    // Client-generated key (POS only, for now) used to guard against
    // duplicate order creation from a double-submit/network retry. A
    // sparse unique index means website orders (which never set this)
    // are completely unaffected.
    idempotencyKey: {
      type: String,
      default: null,
    },

    orderType: {
      // "dine_in"/"takeaway" added for the in-store POS (Phase 5).
      // "pickup" continues to mean customer collection (website and
      // POS both use it — no separate "collection" value needed).
      type: String,
      enum: ["delivery", "pickup", "dine_in", "takeaway"],
      default: "delivery",
      index: true,
    },

    // Where the order was created. Existing website orders are
    // unaffected — this defaults to "website" so nothing already in
    // the database needs a migration.
    source: {
      type: String,
      enum: ["website", "pos"],
      default: "website",
      index: true,
    },

    // Dine-in table identifier (POS only).
    table: {
      type: String,
      trim: true,
      default: "",
    },

    // Staff member who rang up a POS sale.
    cashierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    customer: {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        default: "",
        trim: true,
        lowercase: true,
      },
    },

    deliveryAddress: {
      type: {
        address: {
          type: String,
          default: "",
          trim: true,
        },

        city: {
          type: String,
          default: "",
          trim: true,
        },

        postcode: {
          type: String,
          default: "",
          trim: true,
        },

        notes: {
          type: String,
          default: "",
          trim: true,
        },
      },
      default: {},
    },

    items: {
      type: [OrderItemSchema],
      default: [],
      required: true,
      validate: {
        validator: (v) => v.length > 0,
        message: "Order must contain at least one item.",
      },
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    deliveryFee: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    payment: {
      type: PaymentSchema,
      required: true,
      default: () => ({
        method: "stripe",
        status: "pending",
      }),
    },

    orderStatus: {
      type: String,
      enum: ORDER_STATUSES,
      default: "placed", // ✅ fixed
      index: true,
    },

    statusHistory: {
      type: [
        {
          status: {
            type: String,
            enum: ORDER_STATUSES,
          },

          updatedAt: {
            type: Date,
            default: Date.now,
          },

          updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
          },
        },
      ],
      default: [],
    },

    coupon: {
      code: {
        type: String,
        default: "",
        trim: true,
      },

      discountPercentage: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    // ✅ Soft Delete
    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Active Order
OrderSchema.virtual("isActive").get(function () {
  return !["delivered", "cancelled"].includes(this.orderStatus);
});

// Index
OrderSchema.index({
  userId: 1,
  orderStatus: 1,
  createdAt: -1,
});

OrderSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } },
);

// Generate Order Number
OrderSchema.pre("validate", function () {
  if (!this.orderNumber) {
    this.orderNumber =
      "ORD-" + crypto.randomBytes(4).toString("hex").toUpperCase();
  }
});

// Status History
OrderSchema.pre("save", function () {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.orderStatus,
      updatedAt: new Date(),
    });
  }

  if (!this.isNew && this.isModified("orderStatus")) {
    this.statusHistory.push({
      status: this.orderStatus,
      updatedAt: new Date(),
    });
  }
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
