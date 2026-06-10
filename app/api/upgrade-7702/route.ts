import { NextResponse } from "next/server";
import { z } from "zod";
import { upgradeToSmartAccount } from "@/lib/oneshot/relayer";
import { CHAIN_ID } from "@/lib/constants";

const requestSchema = z.object({
  address: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());

    // Upgrade EOA to Smart Account via EIP-7702 using 1Shot
    const result = await upgradeToSmartAccount(body.address, CHAIN_ID);

    return NextResponse.json({
      txHash: result.txHash,
      smartAccountAddress: result.smartAccountAddress,
      message: "Successfully upgraded to Smart Account via EIP-7702",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request", details: error.flatten() }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Upgrade failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
