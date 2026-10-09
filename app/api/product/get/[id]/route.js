import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import { isValidObjectId } from "mongoose";
import ProductModel from "@/models/Product.model";

export async function GET(request, context) {
  try {
    const auth = await isAuthenticated("admin");

    if (!auth?.isAuth) {
      return response(false, 403, "Unauthorized.");
    }

    await connectDB();

    const params = await context?.params;
    const id = String(params?.id || "").trim();

    console.log("PRODUCT GET ID:", id);

    if (!isValidObjectId(id)) {
      return response(false, 400, "Invalid product object id.");
    }

    const data = await ProductModel.findOne({
      _id: id,
    })
      .populate("media", "_id secure_url")
      .lean();

    console.log("PRODUCT FOUND:", data);

    if (!data) {
      return response(false, 404, "Product not found.");
    }

    return response(true, 200, "Product found.", data);
  } catch (error) {
    console.error("PRODUCT GET ERROR:", error);
    return catchError(error);
  }
}
