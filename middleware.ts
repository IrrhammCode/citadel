import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isMutationRoute, verifyApiAuth } from "@/lib/api-auth";
import { isDeprecatedApiRoute } from "@/lib/api-routes";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  if (isDeprecatedApiRoute(pathname)) {
    return NextResponse.json(
      {
        error: "This API has been removed. Use the core pipeline: /api/agent/loop, /api/agent/autonomy, /api/store.",
        migration: "/register-agent",
      },
      { status: 410 },
    );
  }

  if (isMutationRoute(pathname, request.method)) {
    const authError = verifyApiAuth(request);
    if (authError) return authError;
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
