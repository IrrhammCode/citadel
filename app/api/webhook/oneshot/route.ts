import { NextResponse } from "next/server";
import { updateDecisionOutcome } from "@/lib/agent/memory";
import { AgentEventBus } from "@/lib/agent/event-bus";

// ─── 1Shot Webhook Handler ──────────────────────────────────
// Receives transaction status updates from 1Shot API

type OneShotWebhookPayload = {
  id: string;
  status: "pending" | "confirmed" | "failed";
  txHash?: string;
  error?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    // Verify webhook signature (in production)
    // const signature = request.headers.get("x-oneshot-signature");
    // if (!verifySignature(signature, await request.clone().text())) {
    //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    // }

    const payload: OneShotWebhookPayload = await request.json();

    console.log("📨 1Shot Webhook received:", payload);

    // Update decision outcome if metadata contains decisionId
    if (payload.metadata?.decisionId) {
      updateDecisionOutcome(payload.metadata.decisionId as string, {
        success: payload.status === "confirmed",
        txHash: payload.txHash,
        error: payload.error,
      });
    }

    // Emit event
    const bus = AgentEventBus.getInstance();
    if (payload.status === "confirmed") {
      await bus.emit({
        type: "spend.approved",
        source: (payload.metadata?.systemId as string) || "unknown",
        data: {
          txHash: payload.txHash,
          amount: payload.metadata?.amount,
          recipient: payload.metadata?.recipient,
        },
      });
    } else if (payload.status === "failed") {
      await bus.emit({
        type: "agent.error",
        source: (payload.metadata?.systemId as string) || "unknown",
        data: {
          error: payload.error || "Transaction failed",
          txHash: payload.txHash,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Webhook processed: ${payload.status}`,
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
