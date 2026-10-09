import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import ProductModel from "@/models/Product.model";
import CategoryModel from "@/models/category.model";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);

    const category = (searchParams.get("category") || "").trim();
    const q = (searchParams.get("q") || "").trim();

    const isMostLoved = searchParams.get("isMostLoved");
    const limit = parseInt(searchParams.get("limit") || "12", 10);

    const start = Math.max(parseInt(searchParams.get("start") || "0", 10), 0);
    const size = Math.min(
      Math.max(parseInt(searchParams.get("size") || limit, 10), 1),
      60,
    );

    const filter = {
      deletedAt: null,
    };

    // ✅ Most Loved Filter
    if (isMostLoved === "true") {
      filter.isMostLoved = true;
    }

    // ✅ Category
    if (category) {
      if (mongoose.Types.ObjectId.isValid(category)) {
        filter.category = new mongoose.Types.ObjectId(category);
      } else {
        const catDoc = await CategoryModel.findOne({ slug: category })
          .select("_id")
          .lean();

        if (!catDoc) {
          return NextResponse.json({
            success: true,
            items: [],
            total: 0,
            start,
            size,
          });
        }

        filter.category = catDoc._id;
      }
    }

    // ✅ Search
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } },
      ];
    }

    const [data, totalRowCount] = await Promise.all([
      ProductModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(start)
        .limit(size)
        .populate("category", "name slug")
        .populate("media")
        .lean(),

      ProductModel.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      items: data,
      total: totalRowCount,
      start,
      size,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
