import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import Posorder from "@/models/posorder.model";
import ShowroomProductVariant from "@/models/ShowroomProductVariant.model";

export async function POST(req) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectDB();

    const body = await req.json();
    const { items, total, paymentMethod, showroomId, orderType, userId } = body;

    if (!items?.length) {
      throw new Error("Cart is empty");
    }

    if (!showroomId) {
      throw new Error("Showroom ID required");
    }

    if (!total || total <= 0) {
      throw new Error("Invalid total");
    }

    const orderNumber =
      "ORD-" + Date.now() + "-" + Math.floor(Math.random() * 1000);

    // ---------------- STOCK CHECK + DEDUCT (ATOMIC STYLE) ----------------
    for (const item of items) {
      const result = await ShowroomProductVariant.updateOne(
        {
          showroomId,
          "variants.variantId": item.variantId,
          "variants.stock": { $gte: item.qty },
        },
        {
          $inc: {
            "variants.$.stock": -item.qty,
          },
        },
        { session },
      );

      if (result.modifiedCount === 0) {
        throw new Error(`Insufficient stock or conflict for ${item.variantId}`);
      }
    }

    // ---------------- CREATE ORDER ----------------
    const order = await Posorder.create(
      [
        {
          orderNumber,
          items,
          total,
          paymentMethod: paymentMethod || "cash",
          showroomId,
          orderType: orderType || "pos",
          userId: userId || null,
          status: "delivered",
          createdAt: new Date(),
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    return Response.json({
      success: true,
      message: "Order created successfully",
      order: order[0],
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ SHOWROOM ORDER ERROR:");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);

    return Response.json(
      { success: false, message: error.message },
      { status: 400 },
    );
  }
}
