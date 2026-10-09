import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import OrderModel from "@/models/Order.model";

// GET /api/pos/orders?scope=ongoing|today
//   ongoing — not finished yet, or not paid yet (cancelled excluded)
//   today   — everything created since midnight (UK time)
function londonMidnight() {
  const now = new Date();
  const d = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  const offset = now.getTime() - d.getTime();
  d.setHours(0, 0, 0, 0);
  return new Date(d.getTime() + offset);
}

export async function GET(request) {
  try {
    const auth = await isAuthenticated(["admin", "manager", "staff"]);
    if (!auth.isAuth) return response(false, 401, "Unauthorized.");
    await connectDB();

    const scope = request.nextUrl.searchParams.get("scope") || "ongoing";
    const filter =
      scope === "today"
        ? { deletedAt: null, createdAt: { $gte: londonMidnight() } }
        : {
            deletedAt: null,
            orderStatus: { $ne: "cancelled" },
            $or: [{ orderStatus: { $nin: ["delivered"] } }, { "payment.status": "pending" }],
          };

    const orders = await OrderModel.find(filter)
      .select("orderNumber orderType table customer items total subtotal discount deliveryFee payment orderStatus notes source createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return response(true, 200, "POS orders.", orders);
  } catch (error) {
    return catchError(error);
  }
}
