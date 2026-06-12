import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { updateDecisionOutcome } from "@/lib/agent/memory";
import { AgentEventBus } from "@/lib/agent/event-bus";
import { isProductionDeploy } from "@/lib/env";

function verifyWebhookSecret(request: Request, body: string): boolean {
  const secret = process.env.ONESHOT_WEBHOOK_SECRET;
  if (!secret) return !isProductionDeploy();
  const header = request.headers.get("x-oneshot-signature") ?? request.headers.get("x-webhook-secret");
  if (!header) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(header), Buffer.from(expected));
  } catch {
    return header === secret;
  }
}

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
    const rawBody = await request.text();
    if (!verifyWebhookSecret(request, rawBody)) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    }

    const payload: OneShotWebhookPayload = JSON.parse(rawBody);

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
