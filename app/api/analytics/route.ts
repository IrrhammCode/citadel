import { NextResponse } from "next/server";
import { generateExecutiveSummary, calculateAgentROI, generateCostOptimizations, analyzeVendorPerformance, generateBudgetForecasts } from "@/lib/analytics/reporting";

// ── GET — Get analytics ─────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary";

    switch (type) {
      case "summary":
        const startDate = parseInt(searchParams.get("startDate") || "0");
        const endDate = parseInt(searchParams.get("endDate") || String(Date.now()));
        return NextResponse.json(generateExecutiveSummary(startDate, endDate));

      case "roi":
        const systemId = searchParams.get("systemId");
        if (!systemId) {
          return NextResponse.json({ error: "systemId required" }, { status: 400 });
        }
        return NextResponse.json(calculateAgentROI(systemId));

      case "optimizations":
        return NextResponse.json(generateCostOptimizations());

      case "vendors":
        return NextResponse.json(analyzeVendorPerformance());

      case "forecasts":
        return NextResponse.json(generateBudgetForecasts());

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
