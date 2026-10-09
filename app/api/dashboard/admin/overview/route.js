import { catchError, response } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import OrderModel from "@/models/Order.model";
import ProductModel from "@/models/Product.model";
import UserModel from "@/models/User.model";
import SupplierModel from "@/models/Supplier.model";
import IngredientModel from "@/models/Ingredient.model";
import PurchaseOrderModel from "@/models/PurchaseOrder.model";
import { getRestaurantSettings } from "@/lib/settings.server";

// Dashboard overview: headline cards, monthly sales for the current year,
// top 10 foods & customers this month, and outstanding (unpaid) amounts.
// Cancelled and soft-deleted orders are excluded everywhere.

// Start of "today" / this month / this year in UK time, as UTC Dates
function londonStart(unit) {
  const now = new Date();
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const y = Number(parts.year);
  const m = unit === "year" ? 1 : Number(parts.month);
  const d = unit === "day" ? Number(parts.day) : 1;
  // London is UTC+0 or UTC+1; build midnight London then correct the offset
  const guess = new Date(Date.UTC(y, m - 1, d));
  const londonHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "numeric", hourCycle: "h23" }).format(guess),
  );
  return new Date(guess.getTime() - londonHour * 3600000);
}

const live = { deletedAt: null, orderStatus: { $ne: "cancelled" } };

export async function GET() {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");

    await connectDB();

    const today = londonStart("day");
    const month = londonStart("month");
    const year = londonStart("year");

    const week = new Date(today.getTime() - 6 * 86400000);
    const [customers, products, suppliers, todayAgg, monthly, topFoods, topCustomers, receivable, todayCounts, lowStock, payable, kitchenAgg, byTypeAgg, weekAgg, bestToday, openTables, settings] =
      await Promise.all([
        UserModel.countDocuments({ deletedAt: null, role: "user" }),
        ProductModel.countDocuments({ deletedAt: null }),
        SupplierModel.countDocuments({ deletedAt: null }),

        OrderModel.aggregate([
          { $match: { ...live, createdAt: { $gte: today } } },
          { $group: { _id: null, total: { $sum: "$total" }, orders: { $sum: 1 } } },
        ]),

        OrderModel.aggregate([
          { $match: { ...live, createdAt: { $gte: year } } },
          {
            $group: {
              _id: { $month: { date: "$createdAt", timezone: "Europe/London" } },
              total: { $sum: "$total" },
              orders: { $sum: 1 },
            },
          },
        ]),

        OrderModel.aggregate([
          { $match: { ...live, createdAt: { $gte: month } } },
          { $unwind: "$items" },
          {
            $group: {
              _id: "$items.name",
              qty: { $sum: "$items.quantity" },
              amount: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
            },
          },
          { $sort: { qty: -1, amount: -1 } },
          { $limit: 10 },
        ]),

        OrderModel.aggregate([
          { $match: { ...live, createdAt: { $gte: month } } },
          {
            $group: {
              _id: { $ifNull: ["$customer.phone", "$customer.name"] },
              name: { $first: "$customer.name" },
              phone: { $first: "$customer.phone" },
              orders: { $sum: 1 },
              amount: { $sum: "$total" },
            },
          },
          { $sort: { amount: -1 } },
          { $limit: 10 },
        ]),

        // Unpaid (cash on collection / pending card) orders not yet cancelled
        OrderModel.aggregate([
          { $match: { ...live, "payment.status": "pending" } },
          {
            $group: {
              _id: { $ifNull: ["$customer.phone", "$customer.name"] },
              name: { $first: "$customer.name" },
              phone: { $first: "$customer.phone" },
              orders: { $sum: 1 },
              amount: { $sum: "$total" },
            },
          },
          { $sort: { amount: -1 } },
          { $limit: 10 },
        ]),

        OrderModel.aggregate([
          { $match: { deletedAt: null, createdAt: { $gte: today } } },
          { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
        ]),

        // Ingredients at or below their minimum stock level
        IngredientModel.find({
          deletedAt: null,
          minimumStock: { $gt: 0 },
          $expr: { $lte: ["$currentStock", "$minimumStock"] },
        })
          .select("name currentStock minimumStock usageUnit")
          .sort({ currentStock: 1 })
          .limit(10)
          .lean(),

        // Goods received from suppliers (purchase orders have no payment
        // tracking yet, so received orders are treated as payable)
        PurchaseOrderModel.aggregate([
          { $match: { status: { $in: ["RECEIVED", "PARTIALLY_RECEIVED"] } } },
          { $group: { _id: "$supplier", amount: { $sum: "$total" }, orders: { $sum: 1 } } },
          { $lookup: { from: "suppliers", localField: "_id", foreignField: "_id", as: "s" } },
          { $sort: { amount: -1 } },
          { $limit: 10 },
        ]),

        // Kitchen queue right now (any day)
        OrderModel.aggregate([
          { $match: { deletedAt: null, orderStatus: { $in: ["placed", "preparing", "ready"] } } },
          { $group: { _id: "$orderStatus", count: { $sum: 1 } } },
        ]),

        // Today by order type
        OrderModel.aggregate([
          { $match: { ...live, createdAt: { $gte: today } } },
          { $group: { _id: "$orderType", count: { $sum: 1 }, total: { $sum: "$total" } } },
        ]),

        // Last 7 days
        OrderModel.aggregate([
          { $match: { ...live, createdAt: { $gte: week } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Europe/London" } }, total: { $sum: "$total" }, orders: { $sum: 1 } } },
        ]),

        // Best selling today
        OrderModel.aggregate([
          { $match: { ...live, createdAt: { $gte: today } } },
          { $unwind: "$items" },
          { $group: { _id: "$items.name", qty: { $sum: "$items.quantity" }, amount: { $sum: { $multiply: ["$items.price", "$items.quantity"] } }, image: { $first: "$items.image" } } },
          { $sort: { qty: -1 } },
          { $limit: 5 },
        ]),

        // Open (unpaid) dine-in bills per table
        OrderModel.aggregate([
          { $match: { deletedAt: null, orderType: "dine_in", table: { $ne: "" }, orderStatus: { $ne: "cancelled" }, "payment.status": "pending" } },
          { $group: { _id: "$table", total: { $sum: "$total" }, since: { $min: "$createdAt" } } },
        ]),

        getRestaurantSettings(),
      ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const byMonth = new Map(monthly.map((m) => [m._id, m]));
    const round = (n) => Math.round((n || 0) * 100) / 100;

    return response(true, 200, "Dashboard overview.", {
      cards: {
        customers,
        products,
        suppliers,
        todaySale: round(todayAgg[0]?.total),
        todayOrders: todayAgg[0]?.orders || 0,
      },
      todayStatus: Object.fromEntries(todayCounts.map((s) => [s._id, s.count])),
      salesByMonth: months.map((label, i) => ({
        month: label,
        total: round(byMonth.get(i + 1)?.total),
        orders: byMonth.get(i + 1)?.orders || 0,
      })),
      topFoods: topFoods.map((f) => ({ name: f._id, qty: f.qty, amount: round(f.amount) })),
      topCustomers: topCustomers.map((c) => ({ name: c.name, phone: c.phone, orders: c.orders, amount: round(c.amount) })),
      kitchen: Object.fromEntries(kitchenAgg.map((k) => [k._id, k.count])),
      byType: Object.fromEntries(byTypeAgg.map((t) => [t._id, { count: t.count, total: round(t.total) }])),
      week: Array.from({ length: 7 }, (_, i) => {
        const d = new Date(week.getTime() + i * 86400000 + 12 * 3600000);
        const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(d);
        const w = weekAgg.find((x) => x._id === key);
        return { date: key, day: new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short" }).format(d), total: round(w?.total), orders: w?.orders || 0 };
      }),
      bestToday: bestToday.map((b) => ({ name: b._id, qty: b.qty, amount: round(b.amount), image: b.image })),
      tables: (settings.tables?.length ? settings.tables : []).map((name) => {
        const o = openTables.find((t) => t._id === name);
        return { name, busy: !!o, total: round(o?.total), since: o?.since || null };
      }),
      lowStock: lowStock.map((i) => ({ name: i.name, stock: i.currentStock, minimum: i.minimumStock, unit: i.usageUnit })),
      suppliersPayable: payable.map((p) => ({ name: p.s?.[0]?.companyName || "Supplier", orders: p.orders, amount: round(p.amount) })),
      receivable: receivable.map((c) => ({ name: c.name, phone: c.phone, orders: c.orders, amount: round(c.amount) })),
    });
  } catch (error) {
    return catchError(error);
  }
}
