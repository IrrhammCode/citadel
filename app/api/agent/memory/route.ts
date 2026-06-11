import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getDecisions,
  getRecentDecisions,
  getPatterns,
  getLearnings,
  clearMemory,
  getMemoryContext,
} from "@/lib/agent/memory";

const getMemorySchema = z.object({
  systemId: z.string().optional(),
  type: z.enum(["decisions", "patterns", "learnings", "context"]).optional(),
  limit: z.number().min(1).max(100).optional(),
});

// ── GET — Get agent memory ──────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get("systemId");
    const type = searchParams.get("type") || "decisions";
    const limit = parseInt(searchParams.get("limit") || "50");

    switch (type) {
      case "decisions":
        if (systemId) {
          return NextResponse.json(getDecisions(systemId, limit));
        }
        return NextResponse.json(getRecentDecisions(limit));

      case "patterns":
        if (systemId) {
          return NextResponse.json(getPatterns(systemId));
        }
        return NextResponse.json([]);

      case "learnings":
        if (systemId) {
          return NextResponse.json(getLearnings(systemId, limit));
        }
        return NextResponse.json([]);

      case "context":
        if (!systemId) {
          return NextResponse.json(
            { error: "systemId required for context" },
            { status: 400 },
          );
        }
        return NextResponse.json(getMemoryContext(systemId));

      default:
        return NextResponse.json(
          { error: "Invalid type parameter" },
          { status: 400 },
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get memory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── DELETE — Clear agent memory ─────────────────────────────

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get("systemId");

    if (!systemId) {
      return NextResponse.json(
        { error: "systemId required" },
        { status: 400 },
      );
    }

    clearMemory(systemId);

    return NextResponse.json({
      success: true,
      message: `Memory cleared for ${systemId}`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to clear memory";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
