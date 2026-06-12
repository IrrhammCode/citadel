import "server-only";
import { NextResponse } from "next/server";
import { verifyApiAuth } from "@/lib/api-auth";
import { checkRateLimit } from "@/lib/server/redis";
import { hydrateServerStore } from "@/lib/server/store";

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Auth + rate limit + fresh store hydrate for mutation handlers */
export async function apiGuard(request: Request): Promise<NextResponse | null> {
  const authError = verifyApiAuth(request);
  if (authError) return authError;

  const { allowed, remaining } = await checkRateLimit(
    `${clientIp(request)}:${new URL(request.url).pathname}`,
    120,
    60,
  );
  if (!allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", retryAfterSec: 60 },
      {
        status: 429,
        headers: { "X-RateLimit-Remaining": String(remaining) },
      },
    );
  }

  await hydrateServerStore();
  return null;
}
