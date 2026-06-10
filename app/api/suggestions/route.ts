import { NextResponse } from "next/server";
import { z } from "zod";
import OpenAI from "openai";

const requestSchema = z.object({
  systemData: z.array(z.object({
    id: z.string(),
    name: z.string(),
    budget: z.number().optional(),
    spent: z.number(),
    trustScore: z.number(),
    trustLevel: z.string(),
    anomalyCount: z.number(),
    kpis: z.array(z.object({
      name: z.string(),
      target: z.number(),
      unit: z.string(),
      isHigherBetter: z.boolean(),
    })).optional(),
  })),
  pool: z.object({
    totalBudget: z.number(),
    allocated: z.number(),
    unallocated: z.number(),
    allocations: z.array(z.object({
      systemId: z.string(),
      amount: z.number(),
    })),
  }),
  totalAnomalies: z.number(),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    const walletKey = process.env.X402_WALLET_KEY;
    const apiKey = process.env.VENICE_API_KEY;

    if (!walletKey && !apiKey) {
      return NextResponse.json({ error: "No Venice auth configured" }, { status: 500 });
    }

    const client = new OpenAI({
      apiKey: apiKey || "x402",
      baseURL: "https://api.venice.ai/api/v1",
    });

    const prompt = `You are an AI CFO advisor. Analyze this treasury data and provide actionable suggestions.

Agent Data:
${JSON.stringify(body.systemData, null, 2)}

Budget Pool:
${JSON.stringify(body.pool, null, 2)}

Total Unresolved Anomalies: ${body.totalAnomalies}

Provide 3-6 suggestions as a JSON array:
[{
  "type": "budget" | "vendor" | "trust" | "risk",
  "priority": "high" | "medium" | "low",
  "title": "short title",
  "description": "what you found",
  "action": "what to do about it"
}]

Focus on:
- Budget reallocation (agents with high ROI deserve more)
- Risk mitigation (agents with anomalies need attention)
- Trust optimization (low trust agents need guidance)
- Vendor diversification (if too concentrated)`;

    const response = await client.chat.completions.create({
      model: process.env.VENICE_MODEL ?? "llama-3.3-70b",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are a treasury AI advisor. Respond with JSON only." },
        { role: "user", content: prompt },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Venice returned empty response");

    const parsed = JSON.parse(content);
    const suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || [];

    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Suggestions failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
