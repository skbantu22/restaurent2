import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import OrderModel from "@/models/Order.model";

// GET /api/pos/customers/recent
// Most recent distinct customers (by phone) across all orders —
// website and POS — so a cashier can quickly re-select someone who
// ordered recently without retyping their details. Reads from the
// existing Order collection only; does not create or duplicate any
// customer record.
export async function GET() {
  try {
    await connectDB();

    const auth = await isAuthenticated(["admin", "manager", "staff"]);
    if (!auth.isAuth) {
      return response(false, 401, "Unauthorized.");
    }

    const recent = await OrderModel.aggregate([
      { $match: { "customer.phone": { $exists: true, $nin: ["", "N/A"] } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$customer.phone",
          name: { $first: "$customer.name" },
          phone: { $first: "$customer.phone" },
          email: { $first: "$customer.email" },
          deliveryAddress: { $first: "$deliveryAddress" },
          lastOrderAt: { $first: "$createdAt" },
        },
      },
      { $sort: { lastOrderAt: -1 } },
      { $limit: 8 },
    ]);

    return response(true, 200, "Recent customers fetched successfully.", recent);
  } catch (error) {
    return catchError(error);
  }
}
