import { NextResponse } from "next/server";
import { z } from "zod";
import { executeDelegatedTransfer } from "@/lib/metamask/execute";
import { apiGuard } from "@/lib/server/api-guard";
import type { Address } from "viem";

const executeBodySchema = z.object({
  auditId: z.string(),
  systemId: z.string(),
  spendRequest: z.object({
    amount: z.string(),
    token: z.string(),
    recipient: z.string(),
    memo: z.string(),
  }),
  grantedPermissions: z.array(z.record(z.string(), z.unknown())),
});

export async function POST(request: Request) {
  const guard = await apiGuard(request);
  if (guard) return guard;

  try {
    const body = executeBodySchema.parse(await request.json());
    const permission = body.grantedPermissions[0];

    if (!permission) {
      return NextResponse.json(
        { error: "No granted permission context found" },
        { status: 400 },
      );
    }

    const result = await executeDelegatedTransfer(
      permission,
      body.spendRequest.recipient as Address,
      parseFloat(body.spendRequest.amount),
      body.spendRequest.memo,
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error ?? "Execution failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ txHash: result.txHash, auditId: body.auditId });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.flatten() },
        { status: 400 },
      );
    }
    const message =
      error instanceof Error ? error.message : "Execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
