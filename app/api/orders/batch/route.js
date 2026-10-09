import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json({
        success: true,
        orders: [],
      });
    }

    const ids = [
      ...new Set(
        idsParam
          .split(",")
          .map((id) => id.trim())
          .filter((id) => mongoose.Types.ObjectId.isValid(id)),
      ),
    ];

    if (!ids.length) {
      return NextResponse.json({
        success: true,
        orders: [],
      });
    }

    const orders = await OrderModel.find({
      _id: { $in: ids },
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (err) {
    console.error("BATCH ORDER ERROR:", err);

    return NextResponse.json(
      {
        success: false,
        message: err.message,
        orders: [],
      },
      {
        status: 500,
      },
    );
  }
}
