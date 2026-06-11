import { NextResponse } from "next/server";
import { getRecentSecurityEvents, isGlobalEmergencyStop, activateGlobalEmergencyStop, deactivateGlobalEmergencyStop, getGuardians, addGuardian, removeGuardian, getPendingVotes, createGuardianVote, castVote } from "@/lib/security/circuit-breaker";

// ── GET — Get security info ─────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "events";

    switch (type) {
      case "events":
        const limit = parseInt(searchParams.get("limit") || "50");
        return NextResponse.json(getRecentSecurityEvents(limit));
      case "emergency":
        return NextResponse.json({ active: isGlobalEmergencyStop() });
      case "guardians":
        return NextResponse.json(getGuardians());
      case "votes":
        return NextResponse.json(getPendingVotes());
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get security info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Security actions ─────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();

    switch (body.action) {
      case "activateEmergency":
        activateGlobalEmergencyStop();
        return NextResponse.json({ success: true });

      case "deactivateEmergency":
        deactivateGlobalEmergencyStop();
        return NextResponse.json({ success: true });

      case "addGuardian":
        addGuardian(body.address, body.name);
        return NextResponse.json({ success: true });

      case "removeGuardian":
        removeGuardian(body.address);
        return NextResponse.json({ success: true });

      case "createVote":
        const vote = createGuardianVote(body.voteAction, body.target, body.requiredVotes);
        return NextResponse.json({ success: true, vote });

      case "castVote":
        castVote(body.voteId, body.guardian, body.vote);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to perform security action";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
