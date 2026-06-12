import { NextResponse } from "next/server";
import { z } from "zod";
import { VeniceService } from "@/lib/venice/service";
import { isVeniceConfigured } from "@/lib/venice/client";
import { apiGuard } from "@/lib/server/api-guard";
import type { AgentState } from "@/lib/agent/brain";

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
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const body = thinkRequestSchema.parse(await request.json());

    if (!isVeniceConfigured()) {
      return NextResponse.json(
        {
          error: "Venice not configured",
          message: "Set VENICE_API_KEY or X402_WALLET_KEY. Fail-closed: no mock decisions.",
        },
        { status: 503 },
      );
    }

    const decision = await VeniceService.agentThink(body.state as AgentState);
    return NextResponse.json(decision);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }

    const message = error instanceof Error ? error.message : "Agent think failed";
    console.error("Agent think error:", message);

    return NextResponse.json(
      { error: message, message: "Venice inference failed — fail-closed, no fallback decision." },
      { status: 503 },
    );
  }
}
