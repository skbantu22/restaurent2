import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import StaffSalaryModel from "@/models/StaffSalary.model";
import { salarySchema, toDoc } from "@/lib/inventory/salary";

// GET /api/admin/inventory/salaries?month=YYYY-MM
export async function GET(request) {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const month = request.nextUrl.searchParams.get("month");
    const filter = { deletedAt: null };
    if (month && /^\d{4}-\d{2}$/.test(month)) filter.month = month;

    const entries = await StaffSalaryModel.find(filter)
      .sort({ month: -1, staffName: 1 })
      .lean();

    const totals = entries.reduce(
      (acc, e) => {
        acc.total += e.netPay;
        if (e.paymentStatus === "paid") acc.paid += e.netPay;
        else acc.pending += e.netPay;
        return acc;
      },
      { total: 0, paid: 0, pending: 0 },
    );

    return response(true, 200, "Salaries fetched successfully.", {
      entries,
      totals: {
        total: Math.round(totals.total * 100) / 100,
        paid: Math.round(totals.paid * 100) / 100,
        pending: Math.round(totals.pending * 100) / 100,
        staffCount: new Set(entries.map((e) => e.staffName.toLowerCase())).size,
      },
    });
  } catch (error) {
    return catchError(error);
  }
}

// POST /api/admin/inventory/salaries
export async function POST(request) {
  try {
    await connectDB();

    const { auth, error } = await guardInventoryRequest();
    if (error) return error;

    const validate = salarySchema.safeParse(await request.json());
    if (!validate.success) {
      return response(false, 400, "Invalid or missing fields.", validate.error.flatten());
    }

    const entry = await StaffSalaryModel.create({
      ...toDoc(validate.data),
      createdBy: auth.userId || null,
    });

    return response(true, 201, "Salary entry added.", entry);
  } catch (error) {
    return catchError(error);
  }
}
