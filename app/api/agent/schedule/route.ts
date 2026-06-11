import { NextResponse } from "next/server";
import { z } from "zod";
import { AgentScheduler } from "@/lib/agent/scheduler";

const addScheduleSchema = z.object({
  systemId: z.string(),
  intervalMinutes: z.number().min(1).max(1440),
});

const removeScheduleSchema = z.object({
  systemId: z.string(),
});

// ── GET — Get all schedules ─────────────────────────────────

export async function GET() {
  try {
    const scheduler = AgentScheduler.getInstance();
    const status = scheduler.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get schedules";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Add schedule ─────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = addScheduleSchema.parse(await request.json());

    const scheduler = AgentScheduler.getInstance();
    const schedule = scheduler.addSchedule(body.systemId, body.intervalMinutes);

    return NextResponse.json({
      success: true,
      schedule,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to add schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── DELETE — Remove schedule ────────────────────────────────

export async function DELETE(request: Request) {
  try {
    const body = removeScheduleSchema.parse(await request.json());

    const scheduler = AgentScheduler.getInstance();
    scheduler.removeSchedule(body.systemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to remove schedule";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
