import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import OrderModel from "@/models/Order.model";
import ExpenseModel from "@/models/Expense.model";
import PurchaseOrderModel from "@/models/PurchaseOrder.model";
import StaffSalaryModel from "@/models/StaffSalary.model";
import { firstOfMonthYmd, londonDate, r2, todayYmd, ymdOf } from "@/lib/admin/dates";

// GET /api/admin/accounts?from&to — cash book for Cash and Bank.
// In:  paid orders (cash / cash on collection -> Cash; card / online -> Bank)
// Out: expenses (by payment method), received supplier purchases (Bank),
//      paid salaries (by payment method)
export async function GET(request) {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();

    const sp = request.nextUrl.searchParams;
    const from = sp.get("from") || firstOfMonthYmd();
    const to = sp.get("to") || todayYmd();
    const range = { $gte: londonDate(from), $lte: londonDate(to, true) };

    const [orders, expenses, purchases, salaries] = await Promise.all([
      OrderModel.find({ deletedAt: null, orderStatus: { $ne: "cancelled" }, "payment.status": "paid", $or: [{ "payment.paidAt": range }, { "payment.paidAt": null, createdAt: range }] })
        .select("orderNumber total payment createdAt customer").lean(),
      ExpenseModel.find({ deletedAt: null, date: range }).lean(),
      PurchaseOrderModel.find({ status: { $in: ["RECEIVED", "PARTIALLY_RECEIVED"] }, orderDate: range }).populate("supplier", "companyName").lean(),
      StaffSalaryModel.find({ deletedAt: null, paymentStatus: "paid", paidDate: range }).lean(),
    ]);

    const tx = [];
    for (const o of orders) {
      const m = o.payment?.method;
      tx.push({
        date: o.payment?.paidAt || o.createdAt,
        account: m === "cash" || m === "cod" ? "Cash" : "Bank",
        direction: "in",
        type: m === "stripe" ? "Online sale" : m === "card" ? "Card sale" : "Cash sale",
        description: `${o.orderNumber} · ${o.customer?.name || "Guest"}`,
        amount: r2(o.total),
      });
    }
    for (const e of expenses) {
      tx.push({ date: e.date, account: e.paymentMethod === "cash" ? "Cash" : "Bank", direction: "out", type: "Expense", description: `${e.category}${e.paidTo ? ` · ${e.paidTo}` : ""}${e.note ? ` · ${e.note}` : ""}`, amount: r2(e.amount) });
    }
    for (const p of purchases) {
      tx.push({ date: p.orderDate, account: "Bank", direction: "out", type: "Supplier purchase", description: `${p.poNumber} · ${p.supplier?.companyName || "Supplier"}`, amount: r2(p.total) });
    }
    for (const s of salaries) {
      tx.push({ date: s.paidDate, account: s.paymentMethod === "cash" ? "Cash" : "Bank", direction: "out", type: "Salary", description: `${s.staffName} · ${s.month}`, amount: r2(s.netPay) });
    }
    tx.sort((a, b) => new Date(b.date) - new Date(a.date));

    const accounts = ["Cash", "Bank"].map((name) => {
      const own = tx.filter((t) => t.account === name);
      const moneyIn = r2(own.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0));
      const moneyOut = r2(own.filter((t) => t.direction === "out").reduce((s, t) => s + t.amount, 0));
      return { name, in: moneyIn, out: moneyOut, balance: r2(moneyIn - moneyOut), count: own.length };
    });

    const breakdown = {};
    for (const t of tx) breakdown[`${t.direction}|${t.type}`] = r2((breakdown[`${t.direction}|${t.type}`] || 0) + t.amount);

    return response(true, 200, "Accounts.", {
      from,
      to,
      accounts,
      total: { in: r2(accounts.reduce((s, a) => s + a.in, 0)), out: r2(accounts.reduce((s, a) => s + a.out, 0)), balance: r2(accounts.reduce((s, a) => s + a.balance, 0)) },
      breakdown: Object.entries(breakdown).map(([k, amount]) => ({ direction: k.split("|")[0], type: k.split("|")[1], amount })),
      transactions: tx.map((t) => ({ ...t, date: ymdOf(t.date) })),
    });
  } catch (error) {
    return catchError(error);
  }
}
