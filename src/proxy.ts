import { NextRequest, NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, isAdminSession } from "@/lib/admin-session";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isLoginPage = pathname === "/admin/login";
  const hasSession = isAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);

  if (isLoginPage && hasSession) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (!isLoginPage && !hasSession) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
