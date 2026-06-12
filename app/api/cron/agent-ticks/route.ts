import { NextResponse } from "next/server";
import { runServerCycle } from "@/lib/agent/server-cycle";
import {
  hydrateServerStore,
  saveAgentLoopStatus,
  getAgentLoopStatus,
} from "@/lib/server/store";
import {
  getDueAgentIds,
  rescheduleAgent,
  isRedisConfigured,
} from "@/lib/server/redis";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isRedisConfigured()) {
    return NextResponse.json({
      processed: 0,
      message: "Redis not configured — use in-process scheduler in dev",
    });
  }

  await hydrateServerStore();

  const { notifyExpiringPermissions } = await import("@/lib/server/permission-alerts");
  const expiryAlerts = await notifyExpiringPermissions();

  const due = await getDueAgentIds();
  const results: { systemId: string; ok: boolean; error?: string }[] = [];

  for (const systemId of due) {
    try {
      await runServerCycle(systemId);
      const current = getAgentLoopStatus(systemId);
      if (current) {
        saveAgentLoopStatus({
          ...current,
          cycleCount: current.cycleCount + 1,
          lastCycle: Date.now(),
          lastError: undefined,
        });
      }
      await rescheduleAgent(systemId);
      results.push({ systemId, ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Cycle failed";
      const current = getAgentLoopStatus(systemId);
      if (current) {
        saveAgentLoopStatus({ ...current, lastError: msg });
      }
      await rescheduleAgent(systemId);
      results.push({ systemId, ok: false, error: msg });
    }
  }

  return NextResponse.json({ processed: results.length, expiryAlerts, results });
}
