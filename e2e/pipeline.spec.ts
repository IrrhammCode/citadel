import { test, expect } from "@playwright/test";
import { seedRegisteredAgent, apiHeaders } from "./helpers/seed-agent";
import { signApprovalDecision, getE2eCfoAccount } from "./helpers/cfo-wallet";
import type { ApprovalRequest } from "../lib/agent/autonomy";

const API_SECRET = process.env.CITADEL_API_SECRET ?? "ci-secret-min-16-chars";

test.describe.configure({ mode: "serial" });

test.describe("Enterprise pipeline", () => {
  // File-store lock + hydrate can take 30–90s locally without Postgres
  test.setTimeout(120_000);

  test("register → cycle → wallet-signed approval (API)", async ({ request }) => {
    const systemId = `e2e-${Date.now()}`;
    await seedRegisteredAgent(request, { systemId, apiSecret: API_SECRET });

    const cycleRes = await request.patch("/api/agent/loop", {
      headers: apiHeaders(API_SECRET),
      data: { systemId },
    });
    const cycleBody = await cycleRes.json();
    expect(cycleRes.ok(), `cycle failed (${cycleRes.status()}): ${JSON.stringify(cycleBody)}`).toBeTruthy();
    expect(cycleBody.success).toBe(true);
    expect(cycleBody.outcomes?.[0]?.pendingApprovalId).toBeTruthy();

    const pendingRes = await request.get("/api/agent/autonomy?type=pending");
    expect(pendingRes.ok()).toBeTruthy();
    const pending = (await pendingRes.json()) as ApprovalRequest[];
    const approval = pending.find((a) => a.systemId === systemId);
    expect(approval).toBeDefined();
    expect(approval!.status).toBe("pending");
    expect(approval!.amount).toBe(75);

    const cfo = getE2eCfoAccount();
    const proof = await signApprovalDecision(approval!, "approve");

    const approveRes = await request.post("/api/agent/autonomy", {
      headers: apiHeaders(API_SECRET),
      data: {
        action: "approve",
        id: approval!.id,
        signature: proof.signature,
        signer: proof.signer,
        approvedBy: cfo.address,
        execute: false,
      },
    });
    expect(approveRes.ok()).toBeTruthy();
    const approved = await approveRes.json();
    expect(approved.success).toBe(true);
    expect(approved.request.status).toBe("approved");
    expect(approved.request.approvalSigner?.toLowerCase()).toBe(cfo.address.toLowerCase());
    expect(approved.request.approvalSignature).toBeTruthy();

    const pendingAfter = await request.get("/api/agent/autonomy?type=pending");
    const stillPending = ((await pendingAfter.json()) as ApprovalRequest[]).filter(
      (a) => a.id === approval!.id,
    );
    expect(stillPending).toHaveLength(0);
  });

  test("rejects unsigned approval when wallet signature required", async ({ request }) => {
    test.skip(
      process.env.CITADEL_REQUIRE_WALLET_APPROVAL !== "true",
      "Only runs when CITADEL_REQUIRE_WALLET_APPROVAL=true",
    );

    const systemId = `e2e-unsigned-${Date.now()}`;
    await seedRegisteredAgent(request, { systemId, apiSecret: API_SECRET });

    const createRes = await request.post("/api/agent/autonomy", {
      headers: apiHeaders(API_SECRET),
      data: {
        action: "createApproval",
        systemId,
        spend: {
          type: "spend",
          amount: 25,
          recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
          description: "Unsigned test",
          reasoning: "Should fail without signature",
          confidence: 0.9,
        },
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const { request: approval } = await createRes.json();

    const approveRes = await request.post("/api/agent/autonomy", {
      headers: apiHeaders(API_SECRET),
      data: { action: "approve", id: approval.id, execute: false },
    });
    expect(approveRes.status()).toBe(400);
    const body = await approveRes.json();
    expect(body.error).toMatch(/signature/i);
  });

  test("dashboard reflects pending then cleared approval (UI)", async ({ page, request }) => {
    const systemId = `e2e-ui-${Date.now()}`;
    await seedRegisteredAgent(request, { systemId, apiSecret: API_SECRET });

    await request.patch("/api/agent/loop", {
      headers: apiHeaders(API_SECRET),
      data: { systemId },
    });

    await page.goto("/dashboard");
    await expect(page.getByText("E2E vendor payment")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("button", { name: /Sign & Approve/i })).toBeVisible();
  });
});
