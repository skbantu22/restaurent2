import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

// One-click demo login — no password. Body: { role: "admin" | "manager" | "staff" | "user" }.
// Only works while DEMO_ADMIN_LOGIN=true is set in the environment; remove
// that variable (and NEXT_PUBLIC_DEMO_ADMIN_LOGIN) before going live.
const DEMO_ACCOUNTS = {
  admin: process.env.DEMO_ADMIN_EMAIL || "admin@shawonfoodgate.co.uk",
  manager: "manager@shawonfoodgate.co.uk",
  staff: "kitchen@shawonfoodgate.co.uk",
  user: "aisha.rahman@example.com",
};

export async function POST(request) {
  try {
    if (process.env.DEMO_ADMIN_LOGIN !== "true") {
      return response(false, 403, "Demo login is disabled.");
    }
    if (!process.env.SECRET_KEY) {
      return response(false, 500, "SECRET_KEY is not set in env.");
    }

    const body = await request.json().catch(() => ({}));
    const role = DEMO_ACCOUNTS[body?.role] ? body.role : "admin";

    await connectDB();
    const user = await UserModel.findOne({ email: DEMO_ACCOUNTS[role], role, deletedAt: null }).lean();
    if (!user) {
      return response(false, 404, `Demo ${role} account not found. Run "npm run seed:demo" first.`);
    }

    const secret = new TextEncoder().encode(process.env.SECRET_KEY);
    const accessToken = await new SignJWT({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      showroomId: user.showroomId,
      phone: user.phone,
      address: user.address,
      city: user.city,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1d")
      .sign(secret);

    const cookieStore = await cookies();
    cookieStore.set("access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response(true, 200, `Logged in as demo ${role === "user" ? "customer" : role}.`, {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        showroomId: user.showroomId,
        phone: user.phone,
        address: user.address,
        city: user.city,
        avatar: user.avatar?.url ? { url: user.avatar.url } : null,
      },
    });
  } catch (error) {
    return catchError(error);
  }
}
