import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";

// Settings > My Profile > Change Password (logged-in staff account only)
export async function PUT(request) {
  try {
    await connectDB();

    const auth = await isAuthenticated(["admin", "manager", "staff"]);
    if (!auth?.isAuth) return response(false, 401, "Unauthorized");

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return response(false, 400, "Current and new password are required.");
    }
    if (String(newPassword).length < 8) {
      return response(false, 400, "New password must be at least 8 characters.");
    }

    const user = await UserModel.findOne({
      _id: auth.userId,
      deletedAt: null,
    }).select("+password");
    if (!user) return response(false, 404, "User not found.");

    const matches = await user.comparePassword(String(currentPassword));
    if (!matches) {
      return response(false, 400, "Current password is incorrect.");
    }

    // hashed by the User model's pre-save hook
    user.password = String(newPassword);
    await user.save();

    return response(true, 200, "Password changed successfully.");
  } catch (error) {
    return catchError(error);
  }
}
