import { z } from "zod";
import { isAuthenticated } from "@/lib/auth.server";
import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";

const STAFF_ROLES = ["admin", "manager", "staff"];

// GET /api/admin/users — staff logins (admin / manager / staff)
export async function GET() {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Only an admin can manage users.");
    await connectDB();
    const users = await UserModel.find({ role: { $in: STAFF_ROLES } })
      .select("name email phone role deletedAt createdAt")
      .sort({ deletedAt: 1, role: 1, name: 1 })
      .lean();
    return response(true, 200, "Users.", users.map((u) => ({ ...u, active: !u.deletedAt, isMe: String(u._id) === String(auth.userId) })));
  } catch (error) {
    return catchError(error);
  }
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().toLowerCase().email("Valid email is required"),
  phone: z.string().trim().optional().default(""),
  role: z.enum(["admin", "manager", "staff"]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request) {
  try {
    const auth = await isAuthenticated("admin");
    if (!auth.isAuth) return response(false, 403, "Only an admin can manage users.");
    await connectDB();
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) return response(false, 400, parsed.error.issues[0]?.message || "Invalid details.");
    const d = parsed.data;
    if (await UserModel.exists({ email: d.email })) return response(false, 409, "A user with this email already exists.");
    const user = new UserModel({ ...d, isEmailVerified: true });
    await user.save(); // pre-save hook hashes the password
    return response(true, 201, "User created.", { _id: user._id, name: user.name, email: user.email, role: user.role });
  } catch (error) {
    return catchError(error);
  }
}
