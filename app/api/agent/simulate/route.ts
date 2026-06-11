import { NextResponse } from "next/server";
import { z } from "zod";
import { thinkQuick, type AgentState } from "@/lib/agent/brain";

const simulateRequestSchema = z.object({
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
  scenario: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = simulateRequestSchema.parse(await request.json());

    const result = await thinkQuick(body.state as AgentState, body.scenario);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Simulation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
