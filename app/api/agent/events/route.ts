import { NextResponse } from "next/server";
import { z } from "zod";
import { AgentEventBus, type AgentEventType } from "@/lib/agent/event-bus";

const getEventsSchema = z.object({
  type: z.string().optional(),
  source: z.string().optional(),
  target: z.string().optional(),
  since: z.number().optional(),
  limit: z.number().min(1).max(100).optional(),
});

// ── GET — Get events ────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as AgentEventType | null;
    const source = searchParams.get("source");
    const target = searchParams.get("target");
    const since = searchParams.get("since") ? parseInt(searchParams.get("since")!) : undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    const bus = AgentEventBus.getInstance();

    const events = bus.getEvents({
      type: type || undefined,
      source: source || undefined,
      target: target || undefined,
      since,
      limit,
    });

    return NextResponse.json({
      events,
      stats: bus.getStats(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get events";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Emit event ───────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const bus = AgentEventBus.getInstance();

    const event = await bus.emit({
      type: body.type || "custom",
      source: body.source || "api",
      target: body.target,
      data: body.data || {},
    });

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to emit event";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
