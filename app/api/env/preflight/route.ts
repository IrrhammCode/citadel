import { NextResponse } from "next/server";
import { getProductionReadiness, getEnv } from "@/lib/env";
import { VeniceService } from "@/lib/venice/service";
import { getStoreBackendName } from "@/lib/server/backends";
import { isRedisConfigured } from "@/lib/server/redis";
import { isBaiFallbackConfigured } from "@/lib/fallback/bai";

export async function GET() {
  try {
    const readiness = getProductionReadiness();
    const { server } = getEnv();

    let veniceHealth = { ok: false, latencyMs: 0, model: "none", authMethod: readiness.authMethod };
    if (readiness.venice) {
      const health = await VeniceService.healthCheck();
      veniceHealth = {
        ok: health.ok,
        latencyMs: health.latencyMs,
        model: health.model,
        authMethod: health.authMethod,
      };
    }

    let sessionAddress: string | null = null;
    if (readiness.sessionAccount) {
      try {
        const { getSessionAccount } = await import("@/lib/metamask/session-account");
        sessionAddress = getSessionAccount().address;
      } catch {
        sessionAddress = null;
      }
    }

    let postgresOk = false;
    if (readiness.database) {
      try {
        const { postgresBackend } = await import("@/lib/server/backends/postgres");
        await postgresBackend.load();
        postgresOk = true;
      } catch {
        postgresOk = false;
      }
    }

    let redisOk = false;
    if (isRedisConfigured()) {
      try {
        const { getRedis } = await import("@/lib/server/redis");
        const client = await getRedis();
        redisOk = !!(await client?.ping());
      } catch {
        redisOk = false;
      }
    }

    const fallbackActive = isBaiFallbackConfigured();

    return NextResponse.json({
      ready: readiness.ready && (veniceHealth.ok || fallbackActive) && (!readiness.database || postgresOk),
      checks: {
        venice: {
          configured: readiness.venice,
          healthy: veniceHealth.ok,
          authMethod: veniceHealth.authMethod,
          model: server.VENICE_MODEL,
          latencyMs: veniceHealth.latencyMs,
          baiFallback: !!process.env.FALLBACK_BAI_API_KEY,
        },
        sessionAccount: {
          configured: readiness.sessionAccount,
          safeForProduction: readiness.sessionAccountSafe,
          address: sessionAddress,
        },
        rpc: {
          configured: readiness.rpc,
          url: server.SEPOLIA_RPC_URL.replace(/\/\/.*@/, "//***@"),
        },
        database: {
          configured: readiness.database,
          healthy: postgresOk,
          backend: getStoreBackendName(),
        },
        redis: {
          configured: readiness.redis,
          healthy: redisOk,
        },
        apiSecret: {
          configured: readiness.apiSecret,
        },
        slack: {
          configured: readiness.slack,
          requiredInProduction: process.env.NODE_ENV === "production",
        },
        walletApproval: {
          required: process.env.CITADEL_REQUIRE_WALLET_APPROVAL === "true" || process.env.NODE_ENV === "production",
          cfoAllowlistConfigured: readiness.cfoAllowlist,
        },
        webhooks: {
          oneshotSecret: readiness.oneshotWebhook,
          requiredInProduction: process.env.NODE_ENV === "production",
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preflight failed";
    return NextResponse.json({ error: message, ready: false }, { status: 500 });
  }
}
