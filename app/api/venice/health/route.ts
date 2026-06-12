import { NextResponse } from "next/server";
import { VeniceService } from "@/lib/venice/service";
import { getServerStore } from "@/lib/server/store";

export async function GET() {
  try {
    const health = await VeniceService.healthCheck();
    const store = getServerStore();
    const recentUsage = store.veniceUsage.slice(0, 20);
    const totalTokens = store.veniceUsage.reduce((s, u) => s + u.tokens, 0);
    const totalCost = store.veniceUsage.reduce((s, u) => s + u.costUsd, 0);

    return NextResponse.json({
      ...health,
      usage: {
        totalInferences: store.veniceUsage.length,
        totalTokens,
        totalCostUsd: totalCost,
        recent: recentUsage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
