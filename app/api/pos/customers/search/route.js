import { connectDB } from "@/lib/databaseconnection";
import { response, catchError } from "@/lib/helperfunction";
import { isAuthenticated } from "@/lib/auth.server";
import UserModel from "@/models/User.model";

// GET /api/pos/customers/search?q=...
// Separate from the existing admin-only /api/customers route
// (deliberately not modified — this is a minimal, staff-accessible,
// POS-scoped lookup so cashiers can find a returning customer without
// widening access to the full admin customer management screen).
export async function GET(request) {
  try {
    await connectDB();

    const auth = await isAuthenticated(["admin", "manager", "staff"]);
    if (!auth.isAuth) {
      return response(false, 401, "Unauthorized.");
    }

    const q = (request.nextUrl.searchParams.get("q") || "").trim();
    if (q.length < 2) {
      return response(true, 200, "Customers fetched successfully.", []);
    }

    const customers = await UserModel.find({
      role: "user",
      deletedAt: null,
      $or: [
        { name: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ],
    })
      .select("name phone email address city")
      .limit(10)
      .lean();

    return response(true, 200, "Customers fetched successfully.", customers);
  } catch (error) {
    return catchError(error);
  }
}
