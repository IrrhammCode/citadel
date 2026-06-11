import { NextResponse } from "next/server";
import {
  analyzeSpendingPatterns,
  generateForecast,
  getRecommendedAllocation,
  detectAnomalies,
  getForecastSummary,
} from "@/lib/analytics/predictive";

// ── GET — Predictive budgeting analytics ────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "summary";
    const systemId = searchParams.get("systemId") || undefined;

    switch (type) {
      case "summary":
        return NextResponse.json(getForecastSummary(systemId));

      case "patterns":
        if (!systemId) {
          return NextResponse.json(
            { error: "systemId required for patterns" },
            { status: 400 },
          );
        }
        return NextResponse.json(analyzeSpendingPatterns(systemId));

      case "forecast":
        if (!systemId) {
          return NextResponse.json(
            { error: "systemId required for forecast" },
            { status: 400 },
          );
        }
        return NextResponse.json(generateForecast(systemId));

      case "allocation":
        return NextResponse.json(getRecommendedAllocation());

      case "anomalies": {
        const lookbackDays = parseInt(
          searchParams.get("lookbackDays") || "7",
        );
        return NextResponse.json(detectAnomalies(systemId, lookbackDays));
      }

      default:
        return NextResponse.json(
          { error: "Invalid type. Use: summary, patterns, forecast, allocation, anomalies" },
          { status: 400 },
        );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to get predictive analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
