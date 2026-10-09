import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";

export async function PUT(request) {
  try {
    await connectDB();

    const payload = await request.json();

    console.log("STATUS UPDATE PAYLOAD:", payload);

    const { _id, status, orderStatus } = payload;

    const newStatus = status || orderStatus;

    if (!_id) {
      return response(false, 400, "Order ID is required");
    }

    if (!newStatus) {
      return response(false, 400, "Order status is required");
    }

    const allowedStatus = [
      "placed",
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "unverified",
    ];

    if (!allowedStatus.includes(newStatus)) {
      return response(false, 400, "Invalid order status");
    }

    const order = await OrderModel.findById(_id);

    if (!order) {
      return response(false, 404, "Order not found");
    }

    // update status
    order.orderStatus = newStatus;

    // create history if missing
    if (!Array.isArray(order.statusHistory)) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status: newStatus,
      updatedAt: new Date(),
    });

    await order.save();

    return response(true, 200, "Order status updated successfully", {
      orderStatus: order.orderStatus,
      statusHistory: order.statusHistory,
    });
  } catch (error) {
    console.log("UPDATE STATUS ERROR:", error);

    return catchError(error);
  }
}
