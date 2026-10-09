import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";

export async function GET() {
  try {
    const auth = await isAuthenticated("admin");

    if (!auth.isAuth) {
      return response(false, 403, "Unauthorized.");
    }

    await connectDB();

    const orderStatus = await OrderModel.aggregate([
      {
        $group: {
          _id: {
            $ifNull: ["$orderStatus", "pending"],
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          count: -1,
        },
      },
    ]);

    return response(true, 200, "Data found", orderStatus);
  } catch (error) {
    return catchError(error);
  }
}
