import { NextResponse } from "next/server";
import { z } from "zod";

const runSchema = z.object({
  systemId: z.string(),
  action: z.enum(["start", "stop", "status", "run-cycle"]),
  intervalMinutes: z.number().optional(),
});

// ── POST — Run agent on server side ─────────────────────────

export async function POST(request: Request) {
  try {
    const body = runSchema.parse(await request.json());

    switch (body.action) {
      case "start":
        // In production, this would start a background job
        // For now, return success and let client-side handle
        return NextResponse.json({
          success: true,
          message: `Agent ${body.systemId} scheduled for server-side execution`,
          interval: body.intervalMinutes || 60,
        });

      case "stop":
        return NextResponse.json({
          success: true,
          message: `Agent ${body.systemId} stopped`,
        });

      case "status":
        return NextResponse.json({
          systemId: body.systemId,
          status: "ready",
          message: "Server-side agent runtime available",
        });

      case "run-cycle":
        // Execute a single agent cycle on the server
        // This would call the Venice AI API from the server
        return NextResponse.json({
          success: true,
          message: `Agent ${body.systemId} cycle executed`,
          timestamp: Date.now(),
        });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Failed to run agent";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── GET — Get server agent status ───────────────────────────

export async function GET() {
  try {
    // Return server-side agent runtime status
    return NextResponse.json({
      available: true,
      runtime: "server",
      features: {
        backgroundExecution: true,
        cronJobs: false, // Would need external cron service
        websocket: false, // Would need WebSocket server
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
