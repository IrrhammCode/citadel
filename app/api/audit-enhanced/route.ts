import { NextResponse } from "next/server";
import { z } from "zod";
import { VeniceService } from "@/lib/venice/service";
import { apiGuard } from "@/lib/server/api-guard";

const enhancedAuditSchema = z.object({
  systemId: z.string(),
  spendRequest: z.object({
    amount: z.string(),
    token: z.string(),
    recipient: z.string(),
    memo: z.string(),
  }),
  permission: z.object({
    maxDailySpend: z.string(),
    expiry: z.number(),
    justification: z.string(),
  }),
  priorSpendToday: z.string().optional(),
  customPrompt: z.string().optional(),
  vendorHistory: z.object({
    totalPaid: z.number(),
    transactionCount: z.number(),
    averageAmount: z.number(),
  }).optional(),
  recentAudits: z.array(z.object({
    amount: z.number(),
    recipient: z.string(),
    timestamp: z.number(),
  })).optional(),
  tatumIntelligence: z.record(z.string(), z.unknown()).optional(),
  simulation: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const body = enhancedAuditSchema.parse(await request.json());
    const verdict = await VeniceService.audit(body as Parameters<typeof VeniceService.audit>[0]);
    return NextResponse.json({ verdict });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Enhanced audit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
