import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import OrderModel from "@/models/Order.model";

const bodySchema = z.object({
  paymentMethod: z.enum(["cash", "card"]),
  cashReceived: z.coerce.number().min(0).optional().nullable(),
  complete: z.boolean().optional().default(false),
});

// POST /api/pos/orders/:id/pay — settle an order that was sent to the
// kitchen unpaid (dine-in table bill, pay-later takeaway).
export async function POST(request, { params }) {
  try {
    const auth = await isAuthenticated(["admin", "manager", "staff"]);
    if (!auth.isAuth) return response(false, 401, "Unauthorized.");
    await connectDB();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return response(false, 400, "Invalid order id.");

    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return response(false, 400, "Invalid payment details.");
    const { paymentMethod, cashReceived, complete } = parsed.data;

    const order = await OrderModel.findOne({ _id: id, deletedAt: null });
    if (!order) return response(false, 404, "Order not found.");
    if (order.orderStatus === "cancelled") return response(false, 400, "This order was cancelled.");
    if (order.payment?.status === "paid") return response(false, 400, "This order is already paid.");

    let changeDue = null;
    if (paymentMethod === "cash") {
      if (cashReceived == null || cashReceived < order.total) {
        return response(false, 400, "Cash received is less than the order total.");
      }
      changeDue = Math.round((cashReceived - order.total) * 100) / 100;
    }

    order.payment.method = paymentMethod;
    order.payment.status = "paid";
    order.payment.paidAt = new Date();
    order.payment.cashReceived = paymentMethod === "cash" ? cashReceived : null;
    order.payment.changeDue = changeDue;
    // Paying a dine-in bill normally means the guests are done
    if (complete || order.orderType === "dine_in") order.orderStatus = "delivered";
    await order.save();

    return response(true, 200, "Payment received.", { order, changeDue });
  } catch (error) {
    return catchError(error);
  }
}
