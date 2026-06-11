import { NextResponse } from "next/server";
import { z } from "zod";

const startSchema = z.object({
  systemId: z.string(),
  intervalMinutes: z.number().min(1).max(1440).optional(),
});

const stopSchema = z.object({
  systemId: z.string(),
});

// In-memory store for agent statuses (persists during server lifetime)
// Note: In production, this would be in a database
const agentStatuses: Record<string, {
  systemId: string;
  isRunning: boolean;
  cycleCount: number;
  lastCycle: number;
  startedAt: number;
}> = {};

// ── GET — Get all agent statuses ────────────────────────────

export async function GET() {
  try {
    return NextResponse.json(agentStatuses);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get statuses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Start an agent ───────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = startSchema.parse(await request.json());
    const { systemId, intervalMinutes = 60 } = body;

    // Update status
    agentStatuses[systemId] = {
      systemId,
      isRunning: true,
      cycleCount: agentStatuses[systemId]?.cycleCount ?? 0,
      lastCycle: Date.now(),
      startedAt: Date.now(),
    };

    // In production, this would start a background job
    // For now, we simulate the agent starting
    console.log(`🚀 Agent ${systemId} started (interval: ${intervalMinutes}min)`);

    return NextResponse.json({
      success: true,
      agent: agentStatuses[systemId],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to start agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── DELETE — Stop an agent ──────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const body = stopSchema.parse(await request.json());
    const { systemId } = body;

    if (agentStatuses[systemId]) {
      agentStatuses[systemId].isRunning = false;
    }

    console.log(`⏹️ Agent ${systemId} stopped`);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to stop agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── PATCH — Run single cycle ────────────────────────────────

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { systemId } = body;

    // Increment cycle count
    if (agentStatuses[systemId]) {
      agentStatuses[systemId].cycleCount++;
      agentStatuses[systemId].lastCycle = Date.now();
    } else {
      agentStatuses[systemId] = {
        systemId,
        isRunning: false,
        cycleCount: 1,
        lastCycle: Date.now(),
        startedAt: Date.now(),
      };
    }

    // Call the think API to get a real decision
    try {
      const thinkRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/agent/think`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          state: {
            systemId,
            systemName: systemId,
            goal: `Manage ${systemId} operations`,
            budget: { total: 500, remaining: 350, spent: 150 },
            kpis: [
              { name: "Efficiency", target: 95, current: 88, unit: "%", isHigherBetter: true, status: "behind" },
            ],
            pendingTasks: [],
            recentTransactions: [],
          },
        }),
      });

      if (thinkRes.ok) {
        const decision = await thinkRes.json();
        
        // Store the decision in memory
        const memoryRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/agent/memory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemId,
            decision,
          }),
        });

        return NextResponse.json({
          success: true,
          agent: agentStatuses[systemId],
          decision,
        });
      }
    } catch (thinkError) {
      console.warn("Think API failed, returning status only:", thinkError);
    }

    return NextResponse.json({
      success: true,
      agent: agentStatuses[systemId],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to run cycle";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
