import { connectDB } from "@/lib/databaseconnection";
import ShowroomProduct from "@/models/ShowroomProductVariant.model";

import "@/models/Product.model";
import "@/models/Media.model";
import "@/models/ProductVariant.model ";

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    const showroomId = searchParams.get("showroomId");
    const q = searchParams.get("q") || "";

    // ---------------- BUILD FILTER ----------------
    const filter = {};

    // ONLY apply showroom filter if it exists
    if (showroomId) {
      filter.showroomId = showroomId;
    }

    // ---------------- FETCH DATA ----------------
    const data = await ShowroomProduct.find(filter)
      .populate({
        path: "productId",
        match: q
          ? {
              name: { $regex: q, $options: "i" },
            }
          : undefined,
        populate: {
          path: "media",
          select: "secure_url",
        },
      })
      .populate({
        path: "variants.variantId",
        select: "color size stock sellingPrice barcode",
      })
      .lean();

    // ---------------- REMOVE NULL PRODUCTS ----------------
    const filtered = data.filter((item) => item.productId);

    // ---------------- DEBUG LOGS ----------------
    console.log("SHOWROOM FILTER:", showroomId || "ALL");
    console.log("RAW COUNT:", data.length);
    console.log("FINAL COUNT:", filtered.length);

    // ---------------- RESPONSE ----------------
    return Response.json({
      success: true,
      items: filtered,
    });
  } catch (error) {
    console.log("POS API ERROR:", error);

    return Response.json(
      {
        success: false,
        message: "Server Error",
      },
      { status: 500 },
    );
  }
}
