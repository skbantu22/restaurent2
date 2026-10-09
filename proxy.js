import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { WEBSITE_LOGIN, WEBSITE_USER_DASHBOARD } from "@/Route/Websiteroute";

import { ADMIN_DASHBOARD } from "@/Route/Adminpannelroute";

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get("access_token")?.value;

  const isAuthRoute = pathname.startsWith("/auth");

  // ❌ NO TOKEN
  if (!token) {
    if (isAuthRoute) return NextResponse.next();

    return NextResponse.redirect(new URL(WEBSITE_LOGIN, request.url));
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.SECRET_KEY),
    );

    const role = payload?.role;

    // 🔁 If logged-in user goes to auth pages → redirect by role
    if (isAuthRoute) {
      if (role === "admin") {
        return NextResponse.redirect(new URL(ADMIN_DASHBOARD, request.url));
      }

      if (role === "staff") {
        return NextResponse.redirect(new URL("/admin/pos", request.url));
      }

      return NextResponse.redirect(
        new URL(WEBSITE_USER_DASHBOARD, request.url),
      );
    }

    // 🔒 ADMIN ONLY ROUTES
    if (pathname.startsWith("/admin")) {
      if (role !== "admin" && role !== "staff") {
        return NextResponse.redirect(new URL(WEBSITE_LOGIN, request.url));
      }
    }

    // 🔒 STAFF RULE (optional strict control)
    if (pathname.startsWith("/admin/pos")) {
      if (role !== "staff" && role !== "admin") {
        return NextResponse.redirect(new URL(WEBSITE_LOGIN, request.url));
      }
    }

    // 🔒 USER ACCOUNT ONLY
    if (pathname.startsWith("/my-account")) {
      if (role !== "user") {
        return NextResponse.redirect(new URL(WEBSITE_LOGIN, request.url));
      }
    }

    return NextResponse.next();
  } catch (err) {
    const res = NextResponse.redirect(new URL(WEBSITE_LOGIN, request.url));

    res.cookies.delete("access_token");
    return res;
  }
}

export const config = {
  matcher: ["/admin/:path*", "/my-account/:path*", "/auth/:path*"],
};
