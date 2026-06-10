import { NextResponse } from "next/server";
import { z } from "zod";
import { evaluateNegotiation } from "@/lib/venice/client";

const negotiationSchema = z.object({
  fromSystem: z.object({
    name: z.string(),
    trustScore: z.number(),
    roi: z.number(),
    budget: z.number(),
    spent: z.number(),
  }),
  toSystem: z.object({
    name: z.string(),
    trustScore: z.number(),
    unusedBudget: z.number(),
  }),
  amount: z.number(),
  reason: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = negotiationSchema.parse(await request.json());
    const verdict = await evaluateNegotiation(
      body.fromSystem,
      body.toSystem,
      body.amount,
      body.reason,
    );
    return NextResponse.json({ verdict });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Negotiation evaluation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
