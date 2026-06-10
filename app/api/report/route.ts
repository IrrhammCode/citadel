import { NextResponse } from "next/server";
import { z } from "zod";
import { generateReport } from "@/lib/venice/client";

const reportSchema = z.object({
  systemId: z.string(),
  systemName: z.string(),
  data: z.object({
    totalSpent: z.number(),
    budget: z.number(),
    auditHistory: z.array(z.object({
      amount: z.number(),
      recipient: z.string(),
      decision: z.string(),
      timestamp: z.number(),
    })),
    kpis: z.array(z.object({
      name: z.string(),
      target: z.number(),
      current: z.number(),
      unit: z.string(),
    })),
    trustScore: z.number(),
    trustScoreChange: z.number(),
    anomalies: z.array(z.object({
      id: z.string(),
      systemId: z.string(),
      type: z.enum(["amount_spike", "new_vendor", "frequency_spike", "duplicate_attempt", "budget_exceed"]),
      description: z.string(),
      severity: z.enum(["low", "medium", "high", "critical"]),
      amount: z.number(),
      recipient: z.string(),
      timestamp: z.number(),
      resolved: z.boolean(),
    })),
  }),
});

export async function POST(request: Request) {
  try {
    const body = reportSchema.parse(await request.json());
    const report = await generateReport(
      body.systemId,
      body.systemName,
      body.data,
    );
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Report generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
