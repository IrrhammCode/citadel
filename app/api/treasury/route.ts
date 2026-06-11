import { NextResponse } from "next/server";
import { getTreasuryBalance, getBudgetAllocations, getTreasuryStats, updateBudgetAllocation } from "@/lib/treasury/contract";

// ── GET — Get treasury info ─────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "stats";

    switch (type) {
      case "stats":
        return NextResponse.json(getTreasuryStats());
      case "allocations":
        return NextResponse.json(getBudgetAllocations());
      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get treasury info";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── POST — Update budget allocation ─────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { systemId, amount, operation } = body;

    if (!systemId || !amount || !operation) {
      return NextResponse.json(
        { error: "systemId, amount, and operation required" },
        { status: 400 },
      );
    }

    const allocation = updateBudgetAllocation(systemId, amount, operation);
    return NextResponse.json({ success: true, allocation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update allocation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
