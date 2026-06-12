import { NextResponse } from "next/server";
import { z } from "zod";
import { runServerCycle } from "@/lib/agent/server-cycle";
import {
  getAllAgentLoopStatuses,
  saveAgentLoopStatus,
  getServerPermission,
  hydrateServerStore,
  type AgentLoopStatus,
} from "@/lib/server/store";
import {
  scheduleAgentRun,
  unscheduleAgentRun,
  isRedisConfigured,
} from "@/lib/server/redis";
import { apiGuard } from "@/lib/server/api-guard";

const startSchema = z.object({
  systemId: z.string(),
  intervalMinutes: z.number().min(1).max(1440).optional(),
});

const stopSchema = z.object({
  systemId: z.string(),
});

const agentIntervals: Record<string, ReturnType<typeof setInterval>> = {};

function useInProcessScheduler(): boolean {
  return !isRedisConfigured();
}

function startInProcessInterval(systemId: string, intervalMinutes: number) {
  if (agentIntervals[systemId]) clearInterval(agentIntervals[systemId]);
  agentIntervals[systemId] = setInterval(
    () => runCycle(systemId).catch((e) => console.error(`[agent-loop] ${systemId}:`, e)),
    intervalMinutes * 60 * 1000,
  );
}

async function runCycle(systemId: string) {
  await hydrateServerStore();
  try {
    const result = await runServerCycle(systemId);
    const statuses = getAllAgentLoopStatuses();
    const current = statuses[systemId];
    if (current) {
      saveAgentLoopStatus({
        ...current,
        cycleCount: current.cycleCount + 1,
        lastCycle: Date.now(),
        lastError: undefined,
      });
    }
    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Cycle failed";
    const statuses = getAllAgentLoopStatuses();
    const current = statuses[systemId];
    if (current) {
      saveAgentLoopStatus({ ...current, lastError: msg });
    }
    throw error;
  }
}

export async function GET() {
  await hydrateServerStore();
  return NextResponse.json(getAllAgentLoopStatuses());
}

export async function POST(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const body = startSchema.parse(await request.json());
    const { systemId, intervalMinutes = 60 } = body;

    if (!getServerPermission(systemId)) {
      return NextResponse.json(
        { error: "No permission granted for this agent. Register via /register-agent first." },
        { status: 400 },
      );
    }

    const prev = getAllAgentLoopStatuses()[systemId];
    const status: AgentLoopStatus = {
      systemId,
      isRunning: true,
      cycleCount: prev?.cycleCount ?? 0,
      lastCycle: Date.now(),
      startedAt: prev?.startedAt ?? Date.now(),
      intervalMinutes,
    };
    saveAgentLoopStatus(status);

    try {
      await runCycle(systemId);
    } catch (err) {
      console.warn(`[agent-loop] Initial cycle failed for ${systemId}:`, err);
    }

    if (useInProcessScheduler()) {
      startInProcessInterval(systemId, intervalMinutes);
    } else {
      await scheduleAgentRun(systemId, intervalMinutes);
    }

    return NextResponse.json({
      success: true,
      agent: getAllAgentLoopStatuses()[systemId],
      scheduler: useInProcessScheduler() ? "in-process" : "redis",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to start agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const body = stopSchema.parse(await request.json());
    const { systemId } = body;

    if (agentIntervals[systemId]) {
      clearInterval(agentIntervals[systemId]);
      delete agentIntervals[systemId];
    }
    await unscheduleAgentRun(systemId);

    const current = getAllAgentLoopStatuses()[systemId];
    if (current) {
      saveAgentLoopStatus({ ...current, isRunning: false });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to stop agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const body = await request.json();
    const { systemId } = body as { systemId: string };

    if (!systemId) {
      return NextResponse.json({ error: "systemId required" }, { status: 400 });
    }

    if (!getServerPermission(systemId)) {
      return NextResponse.json(
        { error: "No permission granted for this agent." },
        { status: 400 },
      );
    }

    const prev = getAllAgentLoopStatuses()[systemId];
    if (!prev) {
      saveAgentLoopStatus({
        systemId,
        isRunning: false,
        cycleCount: 0,
        lastCycle: Date.now(),
        startedAt: Date.now(),
      });
    }

    const result = await runCycle(systemId);

    return NextResponse.json({
      success: true,
      agent: getAllAgentLoopStatuses()[systemId],
      decision: result.decision,
      outcomes: result.outcomes,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run cycle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
