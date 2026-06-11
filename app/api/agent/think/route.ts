import { NextResponse } from "next/server";
import { z } from "zod";

const thinkRequestSchema = z.object({
  state: z.object({
    systemId: z.string(),
    systemName: z.string(),
    goal: z.string(),
    budget: z.object({
      total: z.number(),
      remaining: z.number(),
      spent: z.number(),
    }),
    kpis: z.array(z.object({
      name: z.string(),
      target: z.number(),
      current: z.number(),
      unit: z.string(),
      isHigherBetter: z.boolean(),
      status: z.enum(["met", "behind", "ahead"]),
    })),
    pendingTasks: z.array(z.object({
      id: z.string(),
      type: z.enum(["invoice", "vendor_onboard", "report", "negotiate", "custom"]),
      description: z.string(),
      amount: z.number().optional(),
      recipient: z.string().optional(),
      priority: z.enum(["low", "medium", "high"]),
    })),
    recentTransactions: z.array(z.object({
      amount: z.number(),
      recipient: z.string(),
      memo: z.string(),
      timestamp: z.number(),
      decision: z.enum(["approved", "blocked"]),
    })),
    marketContext: z.string().optional(),
    knowledge: z.array(z.string()).optional(),
  }),
});

export async function POST(request: Request) {
  try {
    const body = thinkRequestSchema.parse(await request.json());

    // Try to call Venice AI
    const veniceApiKey = process.env.VENICE_API_KEY;
    
    if (!veniceApiKey) {
      // No Venice API key - return a mock decision based on state
      const { state } = body;
      const budgetUsage = state.budget.spent / state.budget.total;
      const kpisBehind = state.kpis.filter(k => k.status === "behind").length;
      
      // Generate a reasonable decision based on state
      const actions = [];
      
      if (budgetUsage < 0.8 && kpisBehind > 0) {
        actions.push({
          type: "spend",
          description: "Optimize spending to improve KPI performance",
          amount: Math.min(50, state.budget.remaining * 0.1),
          recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          memo: "KPI optimization spend",
          reasoning: "Budget available and KPIs need improvement",
          confidence: 0.75,
          priority: "high" as const,
        });
      }
      
      if (kpisBehind > 1) {
        actions.push({
          type: "report",
          description: "Generate performance report to identify issues",
          reasoning: "Multiple KPIs behind target, need analysis",
          confidence: 0.9,
          priority: "medium" as const,
        });
      }
      
      if (actions.length === 0) {
        actions.push({
          type: "wait",
          description: "Monitor and wait for next cycle",
          reasoning: "Current state is stable, no action needed",
          confidence: 0.8,
          priority: "low" as const,
        });
      }

      return NextResponse.json({
        actions,
        reasoning: `Agent ${state.systemId}: Budget at ${(budgetUsage * 100).toFixed(0)}%, ${kpisBehind} KPIs behind target. ${actions.length > 0 ? "Taking corrective action." : "Maintaining current strategy."}`,
        confidence: 0.75,
        nextCycleDelay: 60,
      });
    }

    // Venice API key available - call real Venice AI
    const { think } = await import("@/lib/agent/brain");
    const decision = await think(body.state as any);

    return NextResponse.json(decision);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    
    // On error, return a safe fallback decision
    const message = error instanceof Error ? error.message : "Agent think failed";
    console.error("Agent think error:", message);
    
    return NextResponse.json({
      actions: [{
        type: "wait",
        description: "Error occurred, waiting for next cycle",
        reasoning: `Error: ${message}`,
        confidence: 0.5,
        priority: "low" as const,
      }],
      reasoning: `Agent encountered an error: ${message}. Waiting for next cycle.`,
      confidence: 0.5,
      nextCycleDelay: 30,
    });
  }
}
