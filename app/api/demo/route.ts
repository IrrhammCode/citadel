import { NextResponse } from "next/server";

// ── POST — Seed demo data ───────────────────────────────────

export async function POST() {
  try {
    // This endpoint triggers demo data seeding on the client side
    // The actual seeding happens in the browser via seedDemoData()
    return NextResponse.json({
      success: true,
      message: "Demo data seeding triggered. Call seedDemoData() on client side.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to seed demo data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
