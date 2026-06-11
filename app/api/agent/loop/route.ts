import { NextResponse } from "next/server";
import { z } from "zod";
import { AgentManager } from "@/lib/agent/loop";

const startRequestSchema = z.object({
  systemId: z.string(),
  intervalMinutes: z.number().min(1).max(1440).optional(),
});

const stopRequestSchema = z.object({
  systemId: z.string(),
});

// ── GET — Get all agent statuses ────────────────────────────

export async function GET() {
  try {
    const manager = AgentManager.getInstance();
    const statuses = manager.getAllStatus();
    return NextResponse.json(statuses);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get statuses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Start an agent ───────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = startRequestSchema.parse(await request.json());

    const manager = AgentManager.getInstance();
    const agent = manager.startAgent(body.systemId, body.intervalMinutes ?? 60);

    return NextResponse.json({
      success: true,
      agent: agent.status,
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
    const body = stopRequestSchema.parse(await request.json());

    const manager = AgentManager.getInstance();
    manager.stopAgent(body.systemId);

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
