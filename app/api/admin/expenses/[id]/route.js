import mongoose from "mongoose";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import ExpenseModel from "@/models/Expense.model";
import { londonDate } from "@/lib/admin/dates";

const updateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  paymentMethod: z.enum(["cash", "bank", "card"]),
  paidTo: z.string().trim().optional().default(""),
  note: z.string().trim().optional().default(""),
});

export async function PUT(request, { params }) {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return response(false, 400, "Invalid id.");
    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return response(false, 400, "Please check the expense details.");
    const doc = await ExpenseModel.findOneAndUpdate({ _id: id, deletedAt: null }, { ...parsed.data, date: londonDate(parsed.data.date) }, { new: true });
    if (!doc) return response(false, 404, "Expense not found.");
    return response(true, 200, "Expense updated.", doc);
  } catch (error) {
    return catchError(error);
  }
}

export async function DELETE(request, { params }) {
  try {
    const auth = await isAuthenticated(["admin", "manager"]);
    if (!auth.isAuth) return response(false, 403, "Unauthorized.");
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return response(false, 400, "Invalid id.");
    const doc = await ExpenseModel.findOneAndUpdate({ _id: id, deletedAt: null }, { deletedAt: new Date() });
    if (!doc) return response(false, 404, "Expense not found.");
    return response(true, 200, "Expense deleted.");
  } catch (error) {
    return catchError(error);
  }
}
