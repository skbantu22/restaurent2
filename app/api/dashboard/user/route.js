import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";

export async function GET() {
  try {
    await connectDB();

    const auth = await isAuthenticated("user");

    if (!auth?.isAuth) {
      return response(false, 401, "Unauthorized");
    }

    const userId = auth.userId;

    // Restaurant orders store name/price/image on each item, so only the
    // product link is populated (the old fashion-shop "variantId" is gone)
    const recentOrders = await OrderModel.find({ userId, deletedAt: null })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("items.productId", "name slug")
      .lean();

    const totalOrder = await OrderModel.countDocuments({ userId, deletedAt: null });

    return response(true, 200, "Dashboard info.", {
      recentOrders,
      totalOrder,
    });
  } catch (error) {
    console.error("Dashboard user API error:", error);
    return catchError(error);
  }
}
