import { z } from "zod";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import OrderModel from "@/models/Order.model";
import ProductModel from "@/models/Product.model";
import MediaModel from "@/models/Media.model";
import { consumeOrderStock } from "@/lib/inventory/inventory.service";
import { getNextPosOrderNumber } from "@/lib/pos/orderNumber";
import { calculateOrderTotals, OrderCalculationError } from "@/lib/pos/calculateOrderTotals";
import { getRestaurantSettings } from "@/lib/settings.server";

const itemSchema = z.object({
  productId: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
  notes: z.string().trim().optional().default(""),
});

const bodySchema = z.object({
  // Dine-in/takeaway remain valid on the Order model itself (used
  // elsewhere already), but this POS is scoped to collection/delivery
  // per the current SmashedLDN takeaway/delivery operation.
  orderType: z.enum(["pickup", "delivery"]),
  customer: z.object({
    userId: z.string().trim().optional().nullable(),
    name: z.string().trim().optional().default("Walk-in Customer"),
    phone: z.string().trim().optional().default("N/A"),
    email: z.string().trim().optional().default(""),
  }),
  deliveryAddress: z
    .object({
      address: z.string().trim().optional().default(""),
      city: z.string().trim().optional().default(""),
      postcode: z.string().trim().optional().default(""),
      notes: z.string().trim().optional().default(""),
    })
    .optional()
    .default({}),
  items: z.array(itemSchema).min(1, "Cart is empty"),
  discountType: z.enum(["fixed", "percentage"]).optional().default("fixed"),
  discountValue: z.coerce.number().min(0).optional().default(0),
  notes: z.string().trim().optional().default(""),
  paymentMethod: z.enum(["cash", "card"]),
  cashReceived: z.coerce.number().min(0).optional().nullable(),
  // Client-generated once per checkout attempt (regenerated after
  // success/cart-clear). Retrying the same attempt (double-click,
  // network timeout + resend) reuses the same key.
  idempotencyKey: z.string().trim().min(1, "idempotencyKey is required"),
});

// POST /api/pos/checkout
// Creates a real Order document (source: "pos") — the restaurant POS
// deliberately uses the exact same Order model, statusHistory, and
// inventory-consumption pipeline as the website, per the architecture
// decision to unify order processing rather than keep the old
// disconnected POSOrder/ShowroomProductVariant retail flow. That older
// flow (/api/showroom-orders, the previous barcode-based /admin/pos)
// is left completely untouched for any retail use it may still have.
export async function POST(request) {
  try {
    await connectDB();

    // Any logged-in staff member can ring up a sale.
    const auth = await isAuthenticated(["admin", "manager", "staff"]);
    if (!auth.isAuth) {
      return response(false, 401, "Unauthorized.");
    }

    if (!mongoose.models.Media) {
      mongoose.model("Media", MediaModel.schema);
    }

    const payload = await request.json().catch(() => ({}));
    const validate = bodySchema.safeParse(payload);

    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields.", validate.error.flatten());
    }

    const data = validate.data;

    // ---- Idempotency: a retried/double-submitted request for the
    // same checkout attempt returns the order already created for it,
    // rather than creating a second one. ----
    const existing = await OrderModel.findOne({ idempotencyKey: data.idempotencyKey });
    if (existing) {
      return response(true, 200, "Order already created.", {
        order: existing,
        inventory: { alreadyProcessed: true },
        duplicate: true,
      });
    }

    // ---- Server-side authoritative pricing. The client never sends
    // (and this schema never accepts) a price — only productId/qty. ----
    const productIds = data.items
      .map((i) => i.productId)
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    const dbProducts = await ProductModel.find({ _id: { $in: productIds } })
      .populate("media", "secure_url")
      .lean();

    const productMap = new Map(dbProducts.map((p) => [String(p._id), p]));
    const settings = await getRestaurantSettings();

    let totals;
    try {
      totals = calculateOrderTotals({
        cartItems: data.items,
        productMap,
        orderType: data.orderType,
        discountType: data.discountType,
        discountValue: data.discountValue,
        paymentMethod: data.paymentMethod,
        cashReceived: data.paymentMethod === "cash" ? data.cashReceived : undefined,
        deliveryFee: settings.business.deliveryFee,
      });
    } catch (err) {
      if (err instanceof OrderCalculationError) {
        return response(false, 400, err.message);
      }
      throw err;
    }

    const orderNumber = await getNextPosOrderNumber();

    let order;
    try {
      order = await OrderModel.create({
        orderNumber,
        idempotencyKey: data.idempotencyKey,
        source: "pos",
        cashierId: auth.userId || null,
        orderType: data.orderType,
        userId: data.customer.userId || null,
        customer: {
          name: data.customer.name || "Walk-in Customer",
          phone: data.customer.phone || "N/A",
          email: data.customer.email || "",
        },
        deliveryAddress: data.orderType === "delivery" ? data.deliveryAddress : {},
        items: totals.items,
        subtotal: totals.subtotal,
        deliveryFee: totals.deliveryFee,
        discount: totals.discount,
        total: totals.total,
        payment: {
          method: data.paymentMethod,
          status: "paid",
          paidAt: new Date(),
          cashReceived: data.paymentMethod === "cash" ? data.cashReceived : null,
          changeDue: totals.changeDue,
        },
        orderStatus: "placed",
        notes: data.notes,
      });
    } catch (err) {
      // A concurrent duplicate submit can race past the findOne check
      // above; the unique index on idempotencyKey is the real
      // guarantee — treat a collision here as "already created".
      if (err?.code === 11000 && err?.keyPattern?.idempotencyKey) {
        const winner = await OrderModel.findOne({ idempotencyKey: data.idempotencyKey });
        return response(true, 200, "Order already created.", {
          order: winner,
          inventory: { alreadyProcessed: true },
          duplicate: true,
        });
      }
      throw err;
    }

    // Same inventory pipeline the website checkout/webhook use — never
    // throws, safe to retry, and a complete no-op until recipes exist.
    const inventoryResult = await consumeOrderStock(order);

    return response(true, 201, "Order created successfully.", {
      order,
      inventory: inventoryResult,
    });
  } catch (error) {
    console.error("POS CHECKOUT ERROR:", error);
    return catchError(error);
  }
}
