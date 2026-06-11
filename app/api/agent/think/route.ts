import { NextResponse } from "next/server";
import { z } from "zod";
import { think, type AgentState } from "@/lib/agent/brain";

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

    const decision = await think(body.state as AgentState);

    return NextResponse.json(decision);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Agent think failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
