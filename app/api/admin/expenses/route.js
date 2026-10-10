import { z } from "zod";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ExpenseModel, { EXPENSE_CATEGORIES } from "@/models/Expense.model";
import { firstOfMonthYmd, londonDate, r2, todayYmd } from "@/lib/admin/dates";

const expenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(["cash", "bank", "card"]).default("cash"),
  paidTo: z.string().trim().optional().default(""),
  note: z.string().trim().optional().default(""),
});

// GET /api/admin/expenses?from&to&category
export async function GET(request) {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();
    const sp = request.nextUrl.searchParams;
    const from = sp.get("from") || firstOfMonthYmd();
    const to = sp.get("to") || todayYmd();
    const category = sp.get("category") || "";
    const q = { deletedAt: null, date: { $gte: londonDate(from), $lte: londonDate(to, true) }, ...(category ? { category } : {}) };
    const list = await ExpenseModel.find(q).sort({ date: -1, createdAt: -1 }).lean();
    const byCategory = {};
    for (const e of list) byCategory[e.category] = r2((byCategory[e.category] || 0) + e.amount);
    return response(true, 200, "Expenses.", {
      from, to, categories: EXPENSE_CATEGORIES, expenses: list,
      total: r2(list.reduce((s, e) => s + e.amount, 0)), byCategory,
    });
  } catch (error) {
    return catchError(error);
  }
}

export async function POST(request) {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();
    const parsed = expenseSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return response(false, 400, "Please check the expense details.");
    const d = parsed.data;
    const doc = await ExpenseModel.create({ ...d, date: londonDate(d.date), createdBy: auth.userId || null });
    return response(true, 201, "Expense added.", doc);
  } catch (error) {
    return catchError(error);
  }
}
