import { NextResponse } from "next/server";
import {
  getProtocols,
  scanYieldOpportunities,
  getYieldSummary,
  getYieldHistory,
  calculateOptimalAllocation,
} from "@/lib/defi/yield-optimizer";

export async function GET() {
  try {
    const protocols = getProtocols();
    const opportunities = scanYieldOpportunities();
    const summary = getYieldSummary();
    const history = getYieldHistory(undefined, 7);
    const allocation = calculateOptimalAllocation(100_000, "moderate");

    return NextResponse.json({
      protocols,
      opportunities,
      summary,
      recentHistory: history,
      suggestedAllocation: allocation,
    });
  } catch (error) {
    console.error("DeFi API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch DeFi data" },
      { status: 500 },
    );
  }
}
