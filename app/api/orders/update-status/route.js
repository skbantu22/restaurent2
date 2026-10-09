import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import OrderModel from "@/models/Order.model";
import { reverseOrderStock } from "@/lib/inventory/inventory.service";

export async function PUT(request) {
  try {
    await connectDB();

    // Any logged-in staff can progress an order through normal kitchen
    // statuses. Cancelling (or reopening a cancelled order) reverses/
    // re-affects stock and money, so that specific action is further
    // restricted below to admin/manager — normal staff never get it.
    const auth = await isAuthenticated(["admin", "manager", "staff"]);
    if (!auth.isAuth) {
      return response(false, 401, "Unauthorized.");
    }

    const payload = await request.json();

    console.log("UPDATE STATUS PAYLOAD:", payload);

    const { _id, status } = payload;

    if (!_id || !status) {
      return response(false, 400, "Order id and status are required.");
    }

    const orderData = await OrderModel.findById(_id);

    if (!orderData) {
      return response(false, 404, "Order not found.");
    }

    // Check same status
    if (orderData.orderStatus === status) {
      return response(false, 400, "Order already has this status.");
    }

    const isDangerousTransition = status === "cancelled" || orderData.orderStatus === "cancelled";

    if (isDangerousTransition && !["admin", "manager"].includes(auth.role)) {
      return response(
        false,
        403,
        "Only admin or manager can cancel an order or reopen a cancelled order.",
      );
    }

    // Update status
    orderData.orderStatus = status;

    await orderData.save();

    if (status === "cancelled") {
      // Reverses any ingredient stock this order already consumed
      // (e.g. it was paid/prepared before being cancelled). No-op if
      // nothing was consumed yet, and safe to call more than once.
      // Never throws — a stock reversal issue must never block the
      // cancellation itself from being recorded.
      await reverseOrderStock(orderData);
    }

    return response(true, 200, "Order status updated successfully.", {
      _id: orderData._id,
      orderStatus: orderData.orderStatus,
      statusHistory: orderData.statusHistory,
    });
  } catch (error) {
    console.log("STATUS UPDATE ERROR:", error);

    return catchError(error);
  }
}
