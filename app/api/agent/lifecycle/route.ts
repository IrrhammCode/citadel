import { NextResponse } from "next/server";
import { z } from "zod";
import { apiGuard } from "@/lib/server/api-guard";
import {
  getServerStore,
  saveServerStoreAsync,
  getAllAgentLoopStatuses,
  saveAgentLoopStatus,
} from "@/lib/server/store";
import { unscheduleAgentRun } from "@/lib/server/redis";

const schema = z.object({
  systemId: z.string(),
  action: z.enum(["stop", "emergency_stop", "revoke_permission", "remove"]),
});

export async function POST(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const { systemId, action } = schema.parse(await request.json());
    const store = getServerStore();
    const isCustom = store.customSystems.some((s) => s.id === systemId);

    if (action === "remove" && !isCustom) {
      return NextResponse.json(
        { error: "Only custom agents can be removed from the registry." },
        { status: 400 },
      );
    }

    if (action === "revoke_permission" && !store.permissions.some((p) => p.systemId === systemId)) {
      return NextResponse.json({ error: "No permission found for this agent." }, { status: 404 });
    }

    const loop = getAllAgentLoopStatuses()[systemId];
    if (loop) {
      saveAgentLoopStatus({ ...loop, isRunning: false });
    }
    await unscheduleAgentRun(systemId);

    const next = { ...store };

    if (action === "emergency_stop" || action === "stop") {
      const config = next.autonomyConfigs[systemId];
      if (config) {
        next.autonomyConfigs = {
          ...next.autonomyConfigs,
          [systemId]: {
            ...config,
            emergencyStop: action === "emergency_stop",
            lastUpdated: Date.now(),
          },
        };
      }
    }

    if (action === "revoke_permission" || action === "remove") {
      next.permissions = next.permissions.filter((p) => p.systemId !== systemId);
    }

    if (action === "remove") {
      next.customSystems = next.customSystems.filter((s) => s.id !== systemId);
      next.agentGoals = next.agentGoals.filter((g) => g.systemId !== systemId);
      const loops = { ...next.agentLoops };
      delete loops[systemId];
      next.agentLoops = loops;
      const autonomy = { ...next.autonomyConfigs };
      delete autonomy[systemId];
      next.autonomyConfigs = autonomy;
      const trust = { ...next.trustScores };
      delete trust[systemId];
      next.trustScores = trust;
    }

    await saveServerStoreAsync(next);

    return NextResponse.json({ ok: true, action, systemId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Lifecycle action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
