import { NextResponse } from "next/server";
import { connectDB } from "@/lib/databaseconnection";
import ProductModel from "@/models/Product.model";
import CategoryModel from "@/models/category.model";
import MediaModel from "@/models/Media.model";

const MEAL_BUILDER_TYPES = ["beef", "chicken", "plant"];

export async function GET(req) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    if (!MEAL_BUILDER_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, message: "Invalid type" },
        { status: 400 },
      );
    }

    // Only products the admin explicitly tagged with this type in
    // Add/Edit Product > "Custom Meal Builder" show up here. Category
    // is deliberately ignored — an untagged ("None") product never
    // appears in the meal builder.
    const products = await ProductModel.find({
      deletedAt: null,
      mealBuilderType: type,
    })
      .populate("media")
      .populate("category", "name slug");

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error.message,
      },
      { status: 500 },
    );
  }
}
