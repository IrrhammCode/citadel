import { NextResponse } from "next/server";
import { z } from "zod";
import { mergeServerStore, hydrateServerStore } from "@/lib/server/store";
import { apiGuard } from "@/lib/server/api-guard";

const syncSchema = z.object({
  permissions: z.array(z.record(z.string(), z.unknown())).optional(),
  customSystems: z.array(z.record(z.string(), z.unknown())).optional(),
  auditLog: z.array(z.record(z.string(), z.unknown())).optional(),
  activity: z.array(z.record(z.string(), z.unknown())).optional(),
  autonomyConfigs: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  agentGoals: z.array(z.record(z.string(), z.unknown())).optional(),
  dailySpend: z.record(z.string(), z.object({ date: z.string(), amount: z.string() })).optional(),
  reports: z.array(z.record(z.string(), z.unknown())).optional(),
  decisions: z.array(z.record(z.string(), z.unknown())).optional(),
  trustScores: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  budgetPool: z.record(z.string(), z.unknown()).nullable().optional(),
  approvalRequests: z.array(z.record(z.string(), z.unknown())).optional(),
  knowledge: z.array(z.record(z.string(), z.unknown())).optional(),
  agentLoops: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  apiKeys: z.object({
    venice: z.string().optional(),
    bai: z.string().optional(),
  }).optional(),
});

export async function GET() {
  try {
    const store = await hydrateServerStore();
    return new Response(
      JSON.stringify(store, (key, val) =>
        typeof val === "bigint" ? { $type: "bigint", value: val.toString() } : val
      ),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to read store";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const body = syncSchema.parse(await request.json());
    const merged = mergeServerStore(
      body as Parameters<typeof mergeServerStore>[0],
      { fromClient: true },
    );
    return NextResponse.json({ success: true, lastSync: merged.lastSync });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
