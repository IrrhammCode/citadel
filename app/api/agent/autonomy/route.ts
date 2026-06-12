import { NextResponse } from "next/server";
import { z } from "zod";
import type { Hex, Address } from "viem";
import {
  getServerAutonomyConfig,
  serverNeedsApproval,
} from "@/lib/agent/autonomy-server";
import {
  getServerPendingApprovals,
  getServerApprovals,
  approveServerRequest,
  rejectServerRequest,
  createServerApprovalRequest,
} from "@/lib/agent/approvals-server";
import { executeApprovedSpend } from "@/lib/agent/server-cycle";
import { getServerStore, saveServerStore } from "@/lib/server/store";
import { apiGuard } from "@/lib/server/api-guard";
import type { AutonomyConfig, AutonomyLevel } from "@/lib/agent/autonomy";

const DEFAULT_LEVELS: Record<AutonomyLevel, Partial<AutonomyConfig>> = {
  supervised: { autoApproveThreshold: 0, requireApprovalAbove: 0, maxAutoApprovePerDay: 0 },
  "semi-auto": { autoApproveThreshold: 10, requireApprovalAbove: 50, maxAutoApprovePerDay: 100 },
  "full-auto": { autoApproveThreshold: 50, requireApprovalAbove: 200, maxAutoApprovePerDay: 500 },
};

const proofSchema = z.object({
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
  signer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const postSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("setLevel"),
    systemId: z.string(),
    level: z.enum(["supervised", "semi-auto", "full-auto"]),
  }),
  z.object({
    action: z.literal("updateConfig"),
    config: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal("approve"),
    id: z.string(),
    approvedBy: z.string().optional(),
    execute: z.boolean().optional(),
    signature: z.string().optional(),
    signer: z.string().optional(),
  }),
  z.object({
    action: z.literal("reject"),
    id: z.string(),
    rejectedBy: z.string().optional(),
    signature: z.string().optional(),
    signer: z.string().optional(),
  }),
  z.object({
    action: z.literal("check"),
    systemId: z.string(),
    spend: z.record(z.string(), z.unknown()),
  }),
  z.object({
    action: z.literal("createApproval"),
    systemId: z.string(),
    spend: z.record(z.string(), z.unknown()),
  }),
]);

function parseProof(signature?: string, signer?: string) {
  if (!signature || !signer) return undefined;
  const parsed = proofSchema.safeParse({ signature, signer });
  if (!parsed.success) return undefined;
  return {
    signature: parsed.data.signature as Hex,
    signer: parsed.data.signer as Address,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const systemId = searchParams.get("systemId");
    const type = searchParams.get("type") || "config";

    if (type === "pending") {
      return NextResponse.json(getServerPendingApprovals(systemId || undefined));
    }

    if (type === "all-approvals") {
      return NextResponse.json(getServerApprovals(systemId || undefined));
    }

    if (!systemId) {
      return NextResponse.json({ error: "systemId required" }, { status: 400 });
    }

    return NextResponse.json(getServerAutonomyConfig(systemId));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get autonomy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const body = postSchema.parse(await request.json());
    const store = getServerStore();

    if (body.action === "setLevel") {
      const existing = getServerAutonomyConfig(body.systemId);
      store.autonomyConfigs[body.systemId] = {
        ...existing,
        level: body.level,
        ...DEFAULT_LEVELS[body.level],
        lastUpdated: Date.now(),
      };
      saveServerStore(store);
      return NextResponse.json({ success: true, config: store.autonomyConfigs[body.systemId] });
    }

    if (body.action === "updateConfig") {
      const config = body.config as AutonomyConfig;
      store.autonomyConfigs[config.systemId] = {
        ...config,
        lastUpdated: Date.now(),
      };
      saveServerStore(store);
      return NextResponse.json({ success: true });
    }

    if (body.action === "approve") {
      const proof = parseProof(body.signature, body.signer);
      const result = await approveServerRequest(
        body.id,
        body.approvedBy || proof?.signer || "CFO",
        proof,
      );

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      if (body.execute !== false && result.type === "spend") {
        const execution = await executeApprovedSpend(result.systemId, result.id);
        return NextResponse.json({ success: true, request: result, execution });
      }

      return NextResponse.json({ success: true, request: result });
    }

    if (body.action === "reject") {
      const proof = parseProof(body.signature, body.signer);
      const result = await rejectServerRequest(
        body.id,
        body.rejectedBy || proof?.signer || "CFO",
        proof,
      );

      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true, request: result });
    }

    if (body.action === "check") {
      const spend = body.spend as {
        type: "spend" | "negotiate" | "onboard_vendor";
        amount?: number;
        recipient?: string;
      };
      const result = serverNeedsApproval(body.systemId, spend);
      return NextResponse.json(result);
    }

    if (body.action === "createApproval") {
      const spend = body.spend as {
        type: "spend" | "negotiate" | "onboard_vendor";
        amount?: number;
        recipient?: string;
        description: string;
        reasoning: string;
        confidence: number;
      };
      const request_ = createServerApprovalRequest(body.systemId, spend);
      return NextResponse.json({ success: true, request: request_ });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to update autonomy";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
