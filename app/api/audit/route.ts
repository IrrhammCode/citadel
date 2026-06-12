import { NextResponse } from "next/server";

/** Removed — use POST /api/audit-enhanced */
export async function POST() {
  return NextResponse.json(
    {
      error: "Gone",
      message: "Use POST /api/audit-enhanced instead (VeniceService fail-closed).",
      migration: "/api/audit-enhanced",
    },
    { status: 410 },
  );
}
