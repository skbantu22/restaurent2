import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { guardInventoryRequest } from "@/lib/inventory/apiAuth";
import UserModel from "@/models/User.model";

// GET /api/admin/inventory/salaries/staff — staff accounts to pick from
// in the salary entry form (admin, manager, staff roles)
export async function GET() {
  try {
    await connectDB();

    const { error } = await guardInventoryRequest();
    if (error) return error;

    const staff = await UserModel.find({
      deletedAt: null,
      role: { $in: ["admin", "manager", "staff"] },
    })
      .select("name email role")
      .sort({ name: 1 })
      .lean();

    return response(true, 200, "Staff fetched successfully.", staff);
  } catch (error) {
    return catchError(error);
  }
}
