import { NextResponse } from "next/server";
import { z } from "zod";
import { executeDelegatedTransfer } from "@/lib/metamask/execute";

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
  try {
    const body = executeBodySchema.parse(await request.json());

    const txHash = await executeDelegatedTransfer(
      body.spendRequest,
      // Stored permission context from MetaMask grant flow
      body.grantedPermissions as Parameters<typeof executeDelegatedTransfer>[1],
    );

    return NextResponse.json({ txHash, auditId: body.auditId });
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
