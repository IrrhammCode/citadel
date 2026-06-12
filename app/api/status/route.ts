import { NextResponse } from "next/server";
import { getProductionReadiness, isProductionDeploy } from "@/lib/env";
import { isVeniceConfigured } from "@/lib/venice/client";
import {
  hydrateServerStore,
  getServerStore,
  getStoreVersion,
  getAllAgentLoopStatuses,
} from "@/lib/server/store";
import { getStoreBackendName } from "@/lib/server/backends";
import { isRedisConfigured } from "@/lib/server/redis";
import { isSessionAccountSafeForProduction } from "@/lib/metamask/session-account";

export async function GET() {
  try {
    await hydrateServerStore();
    const store = getServerStore();
    const readiness = getProductionReadiness();
    const loops = getAllAgentLoopStatuses();

    const warnings: string[] = [];
    let ok = readiness.ready;

    if (isProductionDeploy()) {
      if (!readiness.sessionAccount) {
        warnings.push("Session account missing or unsafe for production");
        ok = false;
      }
      if (!readiness.cfoAllowlist) {
        warnings.push("CFO_ALLOWED_SIGNERS not configured");
        ok = false;
      }
      if (!readiness.slack) {
        warnings.push("SLACK_WEBHOOK_URL not configured");
        ok = false;
      }
      if (!readiness.oneshotWebhook) {
        warnings.push("ONESHOT_WEBHOOK_SECRET not configured");
        ok = false;
      }
      if (!readiness.database) {
        warnings.push("DATABASE_URL required in production");
        ok = false;
      }
      if (!readiness.redis) {
        warnings.push("REDIS_URL required in production");
        ok = false;
      }
    }

    if (!isVeniceConfigured()) {
      warnings.push("Venice AI not configured");
    }

    let redisOk = false;
    if (isRedisConfigured()) {
      try {
        const { getRedis } = await import("@/lib/server/redis");
        redisOk = !!(await (await getRedis())?.ping());
      } catch {
        redisOk = false;
      }
    }

    return NextResponse.json({
      ok,
      timestamp: Date.now(),
      environment: process.env.NODE_ENV,
      readiness,
      venice: { configured: isVeniceConfigured() },
      session: {
        configured: readiness.sessionAccount,
        safeForProduction: isSessionAccountSafeForProduction(),
      },
      store: {
        backend: getStoreBackendName(),
        version: getStoreVersion(),
        agents: store.customSystems.length,
        permissions: store.permissions.length,
        pendingApprovals: (store.approvalRequests ?? []).filter((a) => a.status === "pending").length,
        auditRecords: store.auditLog.length,
        activityEvents: store.activity.length,
      },
      agents: {
        registered: store.customSystems.length,
        runningLoops: Object.values(loops).filter((l) => l.isRunning).length,
        totalCycles: Object.values(loops).reduce((sum, l) => sum + l.cycleCount, 0),
      },
      redis: { configured: isRedisConfigured(), healthy: redisOk },
      warnings,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}
