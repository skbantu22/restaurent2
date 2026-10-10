import mongoose from "mongoose";
import { z } from "zod";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";

const updateSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().optional(),
  role: z.enum(["admin", "manager", "staff"]).optional(),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
  active: z.boolean().optional(),
});

// PUT /api/admin/users/:id — edit, change role, reset password, enable/disable
export async function PUT(request, { params }) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Only an admin can manage users.");
    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return response(false, 400, "Invalid id.");
    const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return response(false, 400, parsed.error.issues[0]?.message || "Invalid details.");
    const d = parsed.data;

    const user = await UserModel.findById(id).select("+password");
    if (!user || !["admin", "manager", "staff"].includes(user.role)) return response(false, 404, "User not found.");
    const isMe = String(user._id) === String(auth.userId);
    if (isMe && (d.active === false || (d.role && d.role !== "admin"))) {
      return response(false, 400, "You can't disable or demote your own account.");
    }

    if (d.name) user.name = d.name;
    if (d.phone !== undefined) user.phone = d.phone;
    if (d.role) user.role = d.role;
    if (d.password) user.password = d.password; // hashed by the pre-save hook
    if (d.active !== undefined) user.deletedAt = d.active ? null : new Date();
    await user.save();

    return response(true, 200, d.password ? "Password reset." : "User updated.", { _id: user._id });
  } catch (error) {
    return catchError(error);
  }
}
