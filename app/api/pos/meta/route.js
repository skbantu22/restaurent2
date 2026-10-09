import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import OrderModel from "@/models/Order.model";
import UserModel from "@/models/User.model";
import { getRestaurantSettings } from "@/lib/settings.server";

// GET /api/pos/meta — tables (with which are busy) and waiters for the POS
export async function GET() {
  try {
    const auth = await isAuthenticated(["admin", "manager", "staff"]);
    if (!auth.isAuth) return response(false, 401, "Unauthorized.");
    await connectDB();

    const settings = await getRestaurantSettings();
    const tables = settings.tables?.length ? settings.tables : ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8"];

    // A table is busy while it has an unpaid, not-cancelled dine-in order
    const open = await OrderModel.find({
      deletedAt: null,
      orderType: "dine_in",
      table: { $ne: "" },
      orderStatus: { $ne: "cancelled" },
      "payment.status": "pending",
    })
      .select("table total orderNumber")
      .lean();

    const busy = {};
    for (const o of open) {
      busy[o.table] = busy[o.table] || { total: 0, orders: [] };
      busy[o.table].total = Math.round((busy[o.table].total + o.total) * 100) / 100;
      busy[o.table].orders.push({ _id: o._id, orderNumber: o.orderNumber });
    }

    const staff = await UserModel.find({ deletedAt: null, role: { $in: ["staff", "manager", "admin"] } })
      .select("name role")
      .sort({ name: 1 })
      .lean();

    return response(true, 200, "POS meta.", {
      tables: tables.map((name) => ({ name, busy: !!busy[name], ...(busy[name] || {}) })),
      waiters: staff.map((s) => ({ _id: s._id, name: s.name, role: s.role })),
    });
  } catch (error) {
    return catchError(error);
  }
}
