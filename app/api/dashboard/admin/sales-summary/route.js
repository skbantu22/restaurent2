import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";

// Dashboard "Sales Overview": today vs yesterday, this month vs last
// month, and a day-by-day series for this month's graph. Website and POS
// orders are both Order documents; cancelled orders are excluded. Days
// are counted in the restaurant's timezone, not the server's.
const TZ = "Europe/London";

// Wall-clock parts of `date` in TZ
function partsInTz(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, Number(p.value)]),
  );
  return parts;
}

// UTC instant of midnight at the start of y-m-d in TZ
function startOfDayInTz(y, m, d) {
  const guess = new Date(Date.UTC(y, m - 1, d));
  const p = partsInTz(guess);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return new Date(guess.getTime() - (asUtc - guess.getTime()));
}

const pad = (n) => String(n).padStart(2, "0");

export async function GET() {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) {
      return response(false, 403, "Unauthorized.");
    }

    await connectDB();

    const now = partsInTz(new Date());
    const todayStart = startOfDayInTz(now.year, now.month, now.day);
    const yesterdayStart = startOfDayInTz(now.year, now.month, now.day - 1);
    const monthStart = startOfDayInTz(now.year, now.month, 1);
    const lastMonthStart = startOfDayInTz(now.year, now.month - 1, 1);
    // same point in last month, so the month comparison is like-for-like
    const lastMonthSamePoint = new Date(
      lastMonthStart.getTime() + (Date.now() - monthStart.getTime()),
    );

    const baseMatch = { deletedAt: null, orderStatus: { $ne: "cancelled" } };

    const periodTotals = (from, to) => ({
      $match: { ...baseMatch, createdAt: { $gte: from, ...(to ? { $lt: to } : {}) } },
    });
    const sumStage = {
      $group: { _id: null, sales: { $sum: "$total" }, orders: { $sum: 1 } },
    };

    const [today, yesterday, thisMonth, lastMonthToDate, daily] = await Promise.all([
      OrderModel.aggregate([periodTotals(todayStart), sumStage]),
      OrderModel.aggregate([periodTotals(yesterdayStart, todayStart), sumStage]),
      OrderModel.aggregate([periodTotals(monthStart), sumStage]),
      OrderModel.aggregate([periodTotals(lastMonthStart, lastMonthSamePoint), sumStage]),
      OrderModel.aggregate([
        periodTotals(monthStart),
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
            sales: { $sum: "$total" },
            orders: { $sum: 1 },
          },
        },
      ]),
    ]);

    const pick = (r) => ({
      sales: Math.round((r[0]?.sales || 0) * 100) / 100,
      orders: r[0]?.orders || 0,
    });

    const byDay = Object.fromEntries(daily.map((d) => [d._id, d]));
    const series = Array.from({ length: now.day }, (_, i) => {
      const key = `${now.year}-${pad(now.month)}-${pad(i + 1)}`;
      return {
        date: key,
        day: i + 1,
        sales: Math.round((byDay[key]?.sales || 0) * 100) / 100,
        orders: byDay[key]?.orders || 0,
      };
    });

    const monthLabel = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      month: "long",
      year: "numeric",
    }).format(new Date());

    return response(true, 200, "Sales summary.", {
      monthLabel,
      today: pick(today),
      yesterday: pick(yesterday),
      thisMonth: pick(thisMonth),
      lastMonthToDate: pick(lastMonthToDate),
      daily: series,
    });
  } catch (error) {
    return catchError(error);
  }
}
