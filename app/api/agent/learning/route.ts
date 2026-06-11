import { NextRequest, NextResponse } from "next/server";
import {
  collectMarketSignals,
  analyzeMarketTrends,
  generateInsights,
  adaptAgentStrategy,
  getLearningHistory,
  runLearningCycle,
} from "@/lib/agent/market-learning";

// ──────────────────────────────────────────────
// GET  –  market signals, trends, insights & history
// ──────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sinceParam = url.searchParams.get("since");
    const limitParam = url.searchParams.get("limit");

    const since = sinceParam ? Number(sinceParam) : undefined;
    const limit = limitParam ? Number(limitParam) : undefined;

    const history = getLearningHistory({ since, limit });
    const trends = analyzeMarketTrends();

    return NextResponse.json({
      success: true,
      data: {
        ...history,
        trends,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// ──────────────────────────────────────────────
// POST  –  trigger a full learning cycle
// ──────────────────────────────────────────────

export async function POST(_request: NextRequest) {
  try {
    const result = await runLearningCycle();

    return NextResponse.json({
      success: true,
      data: {
        signalsCollected: result.signals.length,
        trends: result.trends,
        insightsGenerated: result.insights.length,
        adaptationsApplied: result.adaptations.length,
        details: result,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
