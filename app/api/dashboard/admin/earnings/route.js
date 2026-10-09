import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";

// Powers the dashboard's "Earnings" chart for each period toggle.
// Replaces the old /monthly-sales route, which matched a `status` field
// that doesn't exist on the Order model (real field is `orderStatus`)
// against values ('processing'/'shipped') that aren't valid enum values
// either — so the chart was always empty.
export async function GET(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return response(false, 403, "Unauthorized.");
    }

    await connectDB();

    const range = request.nextUrl.searchParams.get("range") || "monthly";
    const baseMatch = { deletedAt: null, orderStatus: { $ne: "cancelled" } };

    let groupId;
    let dateMatch = {};

    if (range === "today") {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      dateMatch = { createdAt: { $gte: startOfDay } };
      groupId = { hour: { $hour: "$createdAt" } };
    } else if (range === "weekly") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      dateMatch = { createdAt: { $gte: sevenDaysAgo } };
      groupId = {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" },
        day: { $dayOfMonth: "$createdAt" },
      };
    } else {
      // this calendar year only — otherwise e.g. Sep last year and Sep
      // this year were summed into the same "Sep" bar
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      dateMatch = { createdAt: { $gte: startOfYear } };
      groupId = { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } };
    }

    const earnings = await OrderModel.aggregate([
      { $match: { ...baseMatch, ...dateMatch } },
      { $group: { _id: groupId, totalSales: { $sum: "$total" } } },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1, "_id.hour": 1 } },
    ]);

    return response(true, 200, "Data found", earnings);
  } catch (error) {
    return catchError(error);
  }
}
