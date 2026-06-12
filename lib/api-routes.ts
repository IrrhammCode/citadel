/** Scaffold / legacy API routes — return 410 in production middleware */
export const DEPRECATED_API_PREFIXES = [
  "/api/agent/run",
  "/api/audit",
  "/api/agent/council",
  "/api/agent/schedule",
  "/api/agent/learning",
  "/api/agent/simulate",
  "/api/agent/memory",
  "/api/defi",
  "/api/compliance",
  "/api/risk",
  "/api/crypto",
  "/api/treasury",
  "/api/analytics",
  "/api/automation",
  "/api/negotiate",
  "/api/suggestions",
  "/api/report",
  "/api/security",
  "/api/upgrade-7702",
  "/api/demo",
] as const;

export function isDeprecatedApiRoute(pathname: string): boolean {
  return DEPRECATED_API_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/** Routes that accept unauthenticated mutations (have their own auth) */
export const MUTATION_AUTH_EXEMPT = [
  "/api/webhook/",
  "/api/cron/agent-ticks",
] as const;

export function isMutationAuthExempt(pathname: string): boolean {
  return MUTATION_AUTH_EXEMPT.some(
    (p) => pathname === p || pathname.startsWith(p),
  );
}
