import { NextResponse } from "next/server";
import { getAutonomyConfig, setAutonomyConfig, setAutonomyLevel, needsApproval, getPendingApprovals, approveRequest, rejectRequest } from "@/lib/agent/autonomy";

// ── GET — Get autonomy config ───────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get("systemId");
    const type = searchParams.get("type") || "config";

    if (type === "pending") {
      return NextResponse.json(getPendingApprovals(systemId || undefined));
    }

    if (!systemId) {
      return NextResponse.json({ error: "systemId required" }, { status: 400 });
    }

    return NextResponse.json(getAutonomyConfig(systemId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get autonomy config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Update autonomy config ───────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body.action === "setLevel") {
      setAutonomyLevel(body.systemId, body.level);
      return NextResponse.json({ success: true });
    }

    if (body.action === "updateConfig") {
      setAutonomyConfig(body.config);
      return NextResponse.json({ success: true });
    }

    if (body.action === "approve") {
      approveRequest(body.id, "CFO");
      return NextResponse.json({ success: true });
    }

    if (body.action === "reject") {
      rejectRequest(body.id, "CFO");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update autonomy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
