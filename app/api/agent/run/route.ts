import { NextResponse } from "next/server";

/** Removed — use PATCH /api/agent/loop */
export async function POST() {
  return NextResponse.json(
    {
      error: "Gone",
      message: "Use PATCH /api/agent/loop with { systemId } instead.",
      migration: "/api/agent/loop",
    },
    { status: 410 },
  );
}
