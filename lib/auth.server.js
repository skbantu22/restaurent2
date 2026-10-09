
import { cookies } from "next/headers";
import { jwtVerify } from "jose";

// `role` accepts either a single role string (existing behaviour,
// exact match — every current call site like isAuthenticated("admin")
// keeps working unchanged) or an array of roles, in which case the
// user's role must be one of them. Omit `role` entirely to only check
// that the user is logged in.
export const isAuthenticated = async (role) => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("access_token")?.value;
    if (!token) return { isAuth: false };

    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SECRET_KEY)
    );

    if (role) {
      const allowedRoles = Array.isArray(role) ? role : [role];
      if (!allowedRoles.includes(payload?.role)) return { isAuth: false };
    }

    return { isAuth: true, userId: payload?.id || payload?.userId, role: payload?.role };
  } catch {
    return { isAuth: false };
  }
};

// Thin, explicit alias for call sites that want to read as a permission
// check rather than a single-role comparison, e.g.
// requireRole(["admin", "manager"]). Behaves identically to
// isAuthenticated(rolesArray) above.
export const requireRole = async (roles) => isAuthenticated(roles);
