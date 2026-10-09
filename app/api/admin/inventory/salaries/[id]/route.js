import mongoose from "mongoose";
import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import StaffSalaryModel from "@/models/StaffSalary.model";
import { salarySchema, toDoc } from "@/lib/inventory/salary";

// PATCH /api/admin/inventory/salaries/[id] — full edit, or just
// { paymentStatus: "paid" } to mark an entry paid
export async function PATCH(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid salary entry id.");
    }

    const entry = await StaffSalaryModel.findOne({ _id: id, deletedAt: null });
    if (!entry) return response(false, 404, "Salary entry not found.");

    const payload = await request.json();
    const merged = {
      staff: entry.staff ? String(entry.staff) : "",
      staffName: entry.staffName,
      position: entry.position,
      month: entry.month,
      baseSalary: entry.baseSalary,
      bonus: entry.bonus,
      deductions: entry.deductions,
      paymentStatus: entry.paymentStatus,
      paymentMethod: entry.paymentMethod,
      paidDate: entry.paidDate ? entry.paidDate.toISOString() : "",
      note: entry.note,
      ...payload,
    };

    const validate = salarySchema.safeParse(merged);
    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields.", validate.error.flatten());
    }

    entry.set(toDoc(validate.data));
    await entry.save();

    return response(true, 200, "Salary entry updated.", entry);
  } catch (error) {
    return catchError(error);
  }
}

// DELETE /api/admin/inventory/salaries/[id] (soft delete)
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response(false, 400, "Invalid salary entry id.");
    }

    const entry = await StaffSalaryModel.findOneAndUpdate(
      { _id: id, deletedAt: null },
      { deletedAt: new Date() },
    );
    if (!entry) return response(false, 404, "Salary entry not found.");

    return response(true, 200, "Salary entry deleted.");
  } catch (error) {
    return catchError(error);
  }
}
