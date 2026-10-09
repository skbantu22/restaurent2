import { NextResponse } from "next/server";
import mongoose from "mongoose";
import Stripe from "stripe";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";
import ProductModel from "@/models/Product.model";
import CouponModel from "@/models/Coupon.model";
// Explicit import to register the Media schema in Mongoose runtime
import MediaModel from "@/models/Media.model";
import sendTelegramOrder from "@/lib/sendTelegramOrder";
import { consumeOrderStock } from "@/lib/inventory/inventory.service";
import { getRestaurantSettings } from "@/lib/settings.server";
import { fireServerPurchaseConversion } from "@/lib/meta/firePurchaseConversion";
import { customMealPrice } from "@/lib/mealDeal";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const getAbsoluteImageUrl = (image, origin) => {
  if (!image || typeof image !== "string") return "";

  const value = image.trim();

  try {
    const url = new URL(value, origin);

    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }

    return "";
  } catch {
    return "";
  }
};

export async function POST(req) {
  try {
    await connectDB();

    // Guarantee Media model registration before querying
    if (!mongoose.models.Media) {
      mongoose.model("Media", MediaModel.schema);
    }

    const settings = await getRestaurantSettings();
    const currency = (settings.business.currencyCode || "GBP").toLowerCase();

    const body = await req.json().catch(() => ({}));
    const {
      customer,
      items,
      coupon,
      userId,
      orderType = "delivery",
      paymentMethod = "stripe",
    } = body;

    if (!customer?.name || !customer?.phone) {
      return NextResponse.json(
        { success: false, message: "Missing customer info" },
        { status: 400 },
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart empty" },
        { status: 400 },
      );
    }

    // Validation: Delivery-তে ক্যাশ পেমেন্ট অফ রাখার জন্য সিকিউরিটি চেক
    if (orderType === "delivery" && paymentMethod === "cod") {
      return NextResponse.json(
        {
          success: false,
          message: "Cash on delivery is not allowed for delivery orders.",
        },
        { status: 400 },
      );
    }

    // ==============================
    // FETCH PRODUCTS
    // ==============================
    // ==============================
    // FETCH REAL PRODUCTS ONLY
    // ==============================

    // A Custom Meal bundle's burger selection is a real product id
    // nested in item.items, not on the top-level item itself — has to
    // be included here too, or the lookup below never finds it and the
    // bundle's actual burger silently gets dropped from the order.
    const productIds = items
      .flatMap((item) => [
        item.productId,
        ...(Array.isArray(item.items) ? item.items.map((child) => child.productId) : []),
      ])
      .filter(
        (id) =>
          id &&
          !String(id).startsWith("extra-") &&
          !String(id).startsWith("drink-") &&
          !String(id).startsWith("category-") &&
          mongoose.Types.ObjectId.isValid(id),
      );

    const dbProducts = await ProductModel.find({
      _id: { $in: productIds },
    })
      .populate("media", "secure_url")
      .lean();

    const productMap = new Map(dbProducts.map((p) => [String(p._id), p]));
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";
    // ==============================
    // CLEAN & VALIDATE ITEMS
    // ==============================
    // Shared by top-level cart items and a bundle's nested selections —
    // a Custom Meal's burger/extras/drinks get exactly the same
    // server-side re-pricing a top-level item would, so nesting them
    // inside a bundle is never a way to smuggle a tampered price past
    // the server.
    function cleanSingleItem(it) {
      const id = String(it.productId || "");

      // ==============================
      // CUSTOM EXTRA / DRINK / CATEGORY
      // ==============================
      if (
        id.startsWith("extra-") ||
        id.startsWith("drink-") ||
        id.startsWith("category-")
      ) {
        const itemType = id.startsWith("extra-")
          ? "extra"
          : id.startsWith("drink-")
            ? "drink"
            : "category";

        // Frontend থেকে name না এলে productId থেকে name তৈরি করবে
        const fallbackName = id
          .replace(/^extra-/, "")
          .replace(/^drink-/, "")
          .replace(/^category-/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

        const itemName = it.name || it.title || it.label || fallbackName;

        // Category is informational only (the chosen base protein) —
        // never trust a client-sent price for it, it must be £0.
        const itemPrice =
          itemType === "category"
            ? 0
            : Number(it.sellingPrice ?? it.price ?? it.amount ?? 0);

        return {
          itemType,
          customId: id,
          name: itemName,
          image: getAbsoluteImageUrl(it.image, origin),
          price: itemPrice,
          quantity: Math.max(1, Number(it.quantity || 1)),
          notes: it.notes || "",
        };
      }

      // ==============================
      // NORMAL PRODUCT
      // ==============================
      const product = productMap.get(id);

      if (!product) return null;

      const unitPrice = Number(product.sellingPrice || product.price || 0);

      return {
        itemType: "product",
        productId: product._id,
        name: product.name,
        image: product.media?.[0]?.secure_url || "",
        price: unitPrice,
        quantity: Math.max(1, Number(it.quantity || 1)),
        notes: it.notes || "",
      };
    }

    const clean = items
      .map((it) => {
        const id = String(it.productId || "");

        // ==============================
        // CUSTOM MEAL BUNDLE — one order line, re-price every nested
        // selection server-side (never trust the client's bundle total)
        // ==============================
        if (id.startsWith("bundle-")) {
          const nestedRaw = Array.isArray(it.items) ? it.items : [];
          const nestedClean = nestedRaw.map(cleanSingleItem).filter(Boolean);

          if (nestedClean.length === 0) return null;

          const bundleTotal = nestedClean.reduce(
            (sum, child) => sum + child.price * child.quantity,
            0,
          );

          // Custom Meal deal: 20% off the combined selections, applied
          // here rather than trusting whatever price the client sent —
          // and only for a complete meal (burger + side + drink), the
          // same rule the builder enforces before adding to cart.
          const has = (type) => nestedClean.some((c) => c.itemType === type);
          const isCompleteMeal = has("product") && has("extra") && has("drink");
          const bundlePrice = isCompleteMeal
            ? customMealPrice(bundleTotal)
            : bundleTotal;

          return {
            itemType: "bundle",
            customId: id,
            name: it.name || it.title || "Custom Meal",
            image: getAbsoluteImageUrl(it.image, origin),
            price: bundlePrice,
            quantity: Math.max(1, Number(it.quantity || 1)),
            notes: it.notes || "",
            items: nestedClean,
          };
        }

        return cleanSingleItem(it);
      })
      .filter(Boolean);

    if (clean.length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid items found in cart" },
        { status: 400 },
      );
    }

    // ==============================
    // CALCULATE TOTALS (GBP)
    // ==============================
    const subtotal = clean.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Pickup হলে ডেলিভারি ফি ০ হবে
    const deliveryFee = orderType === "pickup" ? 0 : settings.business.deliveryFee;

    let discount = 0;
    let couponData = {
      code: "",
      discountPercentage: 0,
    };

    if (coupon?.code) {
      const couponDoc = await CouponModel.findOne({
        code: {
          $regex: new RegExp(`^${coupon.code.trim()}$`, "i"),
        },
        deletedAt: null,
      }).lean();

      if (couponDoc && subtotal >= (couponDoc.minShoppingAmount || 0)) {
        discount = Number(
          ((subtotal * couponDoc.discountPercentage) / 100).toFixed(2),
        );
        couponData = {
          code: couponDoc.code,
          discountPercentage: couponDoc.discountPercentage,
        };
      }
    }

    const total = Math.max(
      Number((subtotal + deliveryFee - discount).toFixed(2)),
      0,
    );

    const tempId = new mongoose.Types.ObjectId();

    // ==============================
    // CREATE PENDING ORDER
    // ==============================
    const isStripe = paymentMethod === "stripe";

    const orderDocs = await OrderModel.create(
      [
        {
          _id: tempId,
          userId: userId || null,
          orderType: orderType, // Dynamic orderType (delivery / pickup)
          customer: {
            name: customer.name,
            phone: customer.phone,
            email: customer.email || "",
          },
          deliveryAddress: {
            address: customer.address || "",
            city: customer.city || "",
            postcode: customer.postcode || "",
            notes: customer.notes || "",
          },
          items: clean,
          subtotal,
          deliveryFee,
          discount,
          total,
          coupon: couponData,
          payment: {
            method: paymentMethod, // Dynamic payment method (stripe / cod)
            status: "pending", // Payment status 'pending' স্কিমায় অ্যালাউড থাকলে ঠিক আছে, নতুবা 'unpaid' দিতে পারেন
            stripeSessionId: "",
            paymentIntentId: "",
            transactionId: "",
            paidAt: null,
          },
          orderStatus: "placed", // Schema enum অনুযায়ী 'pending'-এর বদলে 'placed' করা হলো
          statusHistory: [
            {
              status: "placed", // Schema enum অনুযায়ী 'pending'-এর বদলে 'placed' করা হলো
            },
          ],
          notes: customer.orderNotes || "",
        },
      ],
      { validateBeforeSave: true },
    );

    const order = orderDocs[0];
    const orderNumber = order.orderNumber;

    // Send Telegram notification
    await sendTelegramOrder(order);

    // যদি পেমেন্ট মেথড ক্যাশ (COD/Pickup Cash) হয়, তবে সরাসরি সাকসেস পেজে রিডাইরেক্ট করার রেসপন্স পাঠাবে
    if (!isStripe) {
      // Cash/pickup orders have no later payment-confirmation step, so
      // "placed" here is the order-confirmed moment — consume ingredient
      // stock now. Idempotent and never throws; a stock hiccup must
      // never stop the order from being accepted.
      await consumeOrderStock(order);

      // Server-side conversion — reliable even if the customer's
      // browser never loads /order/success.
      await fireServerPurchaseConversion(order, origin);

      return NextResponse.json({
        success: true,
        orderId: order._id.toString(),
        orderNumber,
      });
    }

    // ==============================
    // CREATE STRIPE SESSION (GBP £)
    // ==============================

    const lineItems = clean.map((item) => {
      const productData = {
        name: item.name,
      };

      if (item.image && typeof item.image === "string") {
        let imageUrl = item.image;

        // Relative image URL হলে absolute URL বানাবে
        if (imageUrl.startsWith("/")) {
          imageUrl = `${origin}${imageUrl}`;
        }

        // Stripe শুধুমাত্র absolute http/https URL accept করে
        if (/^https?:\/\//i.test(imageUrl)) {
          productData.images = [imageUrl];
        }
      }

      return {
        price_data: {
          currency,
          product_data: productData,
          unit_amount: Math.round(item.price * 100),
        },
        quantity: item.quantity,
      };
    });

    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency,
          product_data: {
            name: "Delivery Fee",
          },
          unit_amount: Math.round(deliveryFee * 100), // convert to pence
        },
        quantity: 1,
      });
    }

    // Stripe coupon discount handling (if discount applied)
    let discounts = [];
    if (discount > 0) {
      const stripeCoupon = await stripe.coupons.create({
        amount_off: Math.round(discount * 100), // pence
        currency,
        duration: "once",
        name: `Discount (${couponData.code})`,
      });
      discounts.push({ coupon: stripeCoupon.id });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      discounts: discounts.length > 0 ? discounts : undefined,
      client_reference_id: order._id.toString(),
      customer_email: customer.email || undefined,
      success_url: `${origin}/order/success?orderId=${order._id.toString()}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout?canceled=true`,
      metadata: {
        orderId: order._id.toString(),
        orderNumber: orderNumber,
      },
    });

    // Update order with the generated Stripe Session ID
    await OrderModel.findByIdAndUpdate(order._id, {
      $set: {
        "payment.stripeSessionId": session.id,
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
      orderId: order._id.toString(),
      orderNumber,
    });
  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        message: err?.message || "Something went wrong",
      },
      { status: 500 },
    );
  }
}
