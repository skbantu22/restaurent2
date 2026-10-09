import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import OrderModel from "@/models/Order.model";

// GET /api/pos/recent-orders
// Backs the POS's "Recent Orders" panel. Reads the same Order
// collection website orders use (filtered to source: "pos") — no
// separate order database.
export async function GET() {
  try {
    await connectDB();

    const auth = await isAuthenticated(["admin", "manager", "staff"]);
    if (!auth.isAuth) {
      return response(false, 401, "Unauthorized.");
    }

    const orders = await OrderModel.find({ source: "pos" })
      .select("orderNumber customer.name orderType total orderStatus payment.method createdAt")
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    return response(true, 200, "Recent orders fetched successfully.", orders);
  } catch (error) {
    return catchError(error);
  }
}
