import { connectDB } from "@/lib/databaseconnection";
import { catchError, response } from "@/lib/helperfunction";
import UserModel from "@/models/User.model";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

// One-click admin login for client demos — no password.
// Only works while DEMO_ADMIN_LOGIN=true is set in the environment; remove
// that variable (and NEXT_PUBLIC_DEMO_ADMIN_LOGIN) before going live.
const DEMO_ADMIN_EMAIL = process.env.DEMO_ADMIN_EMAIL || "admin@shawonfoodgate.co.uk";

export async function POST() {
  try {
    if (process.env.DEMO_ADMIN_LOGIN !== "true") {
      return response(false, 403, "Demo login is disabled.");
    }
    if (!process.env.SECRET_KEY) {
      return response(false, 500, "SECRET_KEY is not set in env.");
    }

    await connectDB();
    const user = await UserModel.findOne({
      email: DEMO_ADMIN_EMAIL,
      role: "admin",
      deletedAt: null,
    }).lean();

    if (!user) {
      return response(false, 404, "Demo admin not found. Run `npm run seed:demo` first.");
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

    return response(true, 200, "Welcome to the admin panel (demo).", {
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
