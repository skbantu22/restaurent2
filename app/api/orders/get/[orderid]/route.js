import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";
import MediaModel from "@/models/Media.model";

export async function GET(request, { params }) {
  try {
    await connectDB();

    const { orderid } = await params;

    if (!orderid) {
      return response(false, 404, "Order not found.");
    }

    const orderData = await OrderModel.findOne({
      orderNumber: orderid,
    })
      .populate({
        path: "items.productId",
        select: "name slug media",
        populate: {
          path: "media",
          model: MediaModel,
        },
      })
      .lean();

    if (!orderData) {
      return response(false, 404, "Order not found.");
    }

    return response(true, 200, "Order found.", orderData);
  } catch (error) {
    console.error("Order details API error:", error);
    return catchError(error);
  }
}
