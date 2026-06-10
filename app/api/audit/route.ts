import { NextResponse } from "next/server";
import { z } from "zod";
import { auditSpendRequest } from "@/lib/venice/client";

const auditBodySchema = z.object({
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
});

export async function POST(request: Request) {
  try {
    const body = auditBodySchema.parse(await request.json());
    const verdict = await auditSpendRequest(body);
    return NextResponse.json({ verdict });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Audit failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
