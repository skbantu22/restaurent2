import { NextResponse } from "next/server";

import { stripe } from "@/lib/stripe";
import { connectDB } from "@/lib/databaseconnection";

import OrderModel from "@/models/Order.model";
import { consumeOrderStock } from "@/lib/inventory/inventory.service";
import { fireServerPurchaseConversion } from "@/lib/meta/firePurchaseConversion";

export const runtime = "nodejs";

export async function POST(req) {
  console.log("🔥 WEBHOOK API HIT");

  const body = await req.text();

  const signature = req.headers.get("stripe-signature");

  let event;

  // ============================
  // VERIFY STRIPE SIGNATURE
  // ============================

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );

    console.log("✅ Stripe webhook:", event.type);
  } catch (error) {
    console.error("Webhook signature error:", error.message);

    return NextResponse.json(
      {
        success: false,
        message: "Invalid signature",
      },
      {
        status: 400,
      },
    );
  }

  try {
    await connectDB();

    // ============================
    // PAYMENT SUCCESS
    // ============================

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const orderId = session.metadata?.orderId;

      console.log("Order ID:", orderId);

      if (!orderId) {
        return NextResponse.json({
          received: true,
        });
      }

      const order = await OrderModel.findById(orderId);

      if (!order) {
        console.log("Order not found");

        return NextResponse.json({
          received: true,
        });
      }

      // ============================
      // DUPLICATE PROTECTION
      // ============================

      if (order.payment.status === "paid") {
        console.log("Already processed");

        return NextResponse.json({
          received: true,
        });
      }

      // ============================
      // UPDATE PAYMENT
      // ============================

      order.payment.status = "paid";

      order.payment.stripeSessionId = session.id;

      order.payment.paymentIntentId = session.payment_intent || "";

      order.payment.transactionId = session.payment_intent || "";

      order.payment.paidAt = new Date();

      // ============================
      // CUSTOMER FRIENDLY STATUS
      // ============================

      order.orderStatus = "placed";

      order.statusHistory.push({
        status: "placed",

        updatedAt: new Date(),
      });

      await order.save();

      console.log("✅ Payment completed - Order Placed");

      // ============================
      // CONSUME INGREDIENT STOCK
      // ============================
      // Explodes each order item through its active Recipe/BOM and
      // records SALE stock movements via the inventory service.
      // Idempotent (safe on Stripe webhook retries) and never throws —
      // a payment that has already succeeded must never be blocked or
      // reported as failed because of inventory bookkeeping.

      await consumeOrderStock(order);

      // Server-side conversion — reliable even if the customer's
      // browser never loads /order/success (closed tab, ad blocker).
      await fireServerPurchaseConversion(order, process.env.NEXT_PUBLIC_APP_URL);
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error("Webhook processing error:", error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },

      {
        status: 500,
      },
    );
  }
}
