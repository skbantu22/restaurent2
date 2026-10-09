import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";
import ProductModel from "@/models/Product.model";
import MediaModel from "@/models/Media.model";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    // 🔓 Public API Route: Read-only access for storefront & admin table
    await connectDB();

    const sp = request.nextUrl.searchParams;

    const start = parseInt(sp.get("start") || "0", 10);
    const size = parseInt(sp.get("size") || sp.get("limit") || "10", 10);
    const globalFilter = (sp.get("globalFilter") || "").trim();

    // 🟢 Query Filters
    const categoryParam = sp.get("category");
    const isMostLovedParam = sp.get("isMostLoved");
    const deleteType = sp.get("deleteType");

    let sorting = [];
    try {
      sorting = JSON.parse(sp.get("sorting") || "[]");
    } catch {
      sorting = [];
    }

    // Base Match Query
    const baseMatch = {};

    // 🟢 1. Soft Delete Filter
    if (deleteType === "SD") {
      baseMatch.deletedAt = null;
    } else if (deleteType === "PD") {
      baseMatch.deletedAt = { $ne: null };
    } else {
      // ডিফল্টভাবে শুধু এক্টিভ (ডিলেট না হওয়া) প্রোডাক্ট ফিল্টার হবে
      baseMatch.deletedAt = null;
    }

    // 🟢 2. Category Filter (Category ID বা String সাপোর্ট)
    if (categoryParam) {
      if (mongoose.Types.ObjectId.isValid(categoryParam)) {
        baseMatch.category = new mongoose.Types.ObjectId(categoryParam);
      } else {
        baseMatch.category = categoryParam;
      }
    }

    // 🟢 3. isMostLoved Filter (Boolean / String / Number সাপোর্ট)
    if (isMostLovedParam === "true" || isMostLovedParam === "1") {
      baseMatch.isMostLoved = { $in: [true, "true", 1] };
    }

    // 🟢 4. Sorting Logic
    const sortQuery = {};
    sorting.forEach((s) => {
      sortQuery[s.id] = s.desc ? -1 : 1;
    });

    const finalSort = Object.keys(sortQuery).length
      ? sortQuery
      : { createdAt: -1 };

    // 🟢 5. Global Search Filter
    if (globalFilter) {
      const isNumeric = !isNaN(Number(globalFilter));

      baseMatch.$or = [
        {
          name: {
            $regex: globalFilter,
            $options: "i",
          },
        },
        {
          slug: {
            $regex: globalFilter,
            $options: "i",
          },
        },
      ];

      if (isNumeric) {
        baseMatch.$or.push(
          { mrp: Number(globalFilter) },
          { sellingPrice: Number(globalFilter) },
        );
      }
    }

    // 📦 Database Fetch
    const [products, totalRowCount] = await Promise.all([
      ProductModel.find(baseMatch)
        .populate({
          path: "media",
          select: "secure_url thumbnail_url url public_id",
        })
        .populate({
          path: "category",
          select: "name",
        })
        .sort(finalSort)
        .skip(start)
        .limit(size)
        .lean(),
      ProductModel.countDocuments(baseMatch),
    ]);

    // 🧼 Response Mapping
    const data = products.map((item) => ({
      _id: item._id,
      name: item.name,
      calories: item.calories, // ✅ ADD THIS

      slug: item.slug,
      sku: item.sku || "",
      mrp: item.mrp,
      sellingPrice: item.sellingPrice,
      discountPercentage: item.discountPercentage,
      description: item.description || "",
      badge: item.badge || "",
      isMostLoved: Boolean(item.isMostLoved),
      active: item.active !== false,
      available: item.available !== false,
      posVisible: item.posVisible !== false,
      media:
        item.media?.map((img) => ({
          _id: img._id,
          url: img.secure_url || img.url || "",
          thumbnail: img.thumbnail_url || img.secure_url || img.url || "",
        })) || [],
      category: item.category?.name || item.category || "",
      categoryId: item.category?._id ? String(item.category._id) : (item.category ? String(item.category) : ""),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      deletedAt: item.deletedAt,
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: {
        totalRowCount,
      },
    });
  } catch (error) {
    console.error("PRODUCT API ERROR:", error);

    return catchError(error);
  }
}
