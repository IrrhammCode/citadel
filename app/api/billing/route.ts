import { NextResponse } from "next/server";
import { getServerStore } from "@/lib/server/store";
import { isX402Available } from "@/lib/venice/client";

export async function GET() {
  try {
    const store = getServerStore();
    const usage = store.veniceUsage;
    const totalSpent = usage.reduce((s, u) => s + u.costUsd, 0);
    const budget = Number(process.env.X402_BUDGET_USD) || 50;

    let x402Balance: {
      canConsume: boolean;
      balanceUsd: number;
      minimumTopUpUsd: number;
    } | null = null;

    if (isX402Available()) {
      try {
        const { checkBalance } = await import("@/lib/venice/x402");
        const { getSessionAccount } = await import("@/lib/metamask/session-account");
        const account = getSessionAccount();
        x402Balance = await checkBalance(account.address);
      } catch (err) {
        console.warn("[billing] x402 balance check failed:", err);
      }
    }

    return NextResponse.json({
      budget,
      totalSpent,
      remaining: budget - totalSpent,
      inferences: usage.slice(0, 50),
      x402: x402Balance,
      authMethod: isX402Available() ? "x402" : "api_key",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Billing fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
