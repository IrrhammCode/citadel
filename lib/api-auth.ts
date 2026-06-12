import { NextResponse } from "next/server";
import { isProductionDeploy } from "@/lib/env";
import { isMutationAuthExempt } from "@/lib/api-routes";

export function isMutationRoute(pathname: string, method: string): boolean {
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return false;
  if (!pathname.startsWith("/api/")) return false;
  if (isMutationAuthExempt(pathname)) return false;
  return true;
}

export function verifyApiAuth(request: Request): NextResponse | null {
  const secret = process.env.CITADEL_API_SECRET;

  if (isProductionDeploy() && !secret) {
    return NextResponse.json(
      { error: "Server misconfigured: CITADEL_API_SECRET required in production" },
      { status: 503 },
    );
  }

  if (!secret) return null;

  const header = request.headers.get("x-citadel-secret");
  if (header === secret) return null;

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return null;
      if (appUrl && origin === appUrl) return null;
    } catch {
      /* invalid origin */
    }
  }

  return NextResponse.json(
    { error: "Unauthorized — set x-citadel-secret or call from same origin" },
    { status: 401 },
  );
}
