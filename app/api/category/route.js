import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError } from "@/lib/helperfunction";
import CategoryModel from "@/models/category.model";
import MediaModel from "@/models/Media.model";

export async function GET(request) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;

    const start = parseInt(searchParams.get("start") || "0", 10);
    const size = parseInt(searchParams.get("size") || "100", 10);
    const deleteType = searchParams.get("deleteType");
    const globalFilter = searchParams.get("globalFilter") || "";

    let sorting = [];

    try {
      sorting = JSON.parse(searchParams.get("sorting") || "[]");
    } catch {
      sorting = [];
    }

    const matchQuery = {};

    if (deleteType === "SD") {
      matchQuery.deletedAt = null;
    } else if (deleteType === "PD") {
      matchQuery.deletedAt = { $ne: null };
    } else {
      matchQuery.deletedAt = null;
    }

    // Storefront OUR MENU: skip Bangladeshi Special categories
    if (searchParams.get("menu") === "1") {
      matchQuery.isBangladeshiSpecial = { $ne: true };
    }

    // Homepage Bangladeshi Special section: only those categories
    if (searchParams.get("special") === "1") {
      matchQuery.isBangladeshiSpecial = true;
    }

    if (globalFilter) {
      matchQuery.$or = [
        { name: { $regex: globalFilter, $options: "i" } },
        { slug: { $regex: globalFilter, $options: "i" } },
      ];
    }

    const sortQuery = {};

    sorting.forEach((item) => {
      sortQuery[item.id] = item.desc ? -1 : 1;
    });

    const categories = await CategoryModel.find(matchQuery)
      .populate({
        path: "media",
        select: "secure_url thumbnail_url public_id alt",
      })
      .sort(Object.keys(sortQuery).length ? sortQuery : { createdAt: -1 })
      .skip(start)
      .limit(size)
      .lean();

    const totalRowCount = await CategoryModel.countDocuments(matchQuery);

    return NextResponse.json({
      success: true,
      data: categories,
      meta: {
        totalRowCount,
      },
    });
  } catch (error) {
    return catchError(error);
  }
}
