import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/server/store", () => ({
  appendVeniceUsage: vi.fn(),
}));

import { VeniceService } from "@/lib/venice/service";

describe("VeniceService fail-closed", () => {
  const origVenice = process.env.VENICE_API_KEY;
  const origX402 = process.env.X402_WALLET_KEY;

  beforeEach(() => {
    delete process.env.VENICE_API_KEY;
    delete process.env.X402_WALLET_KEY;
  });

  afterEach(() => {
    if (origVenice) process.env.VENICE_API_KEY = origVenice;
    else delete process.env.VENICE_API_KEY;
    if (origX402) process.env.X402_WALLET_KEY = origX402;
    else delete process.env.X402_WALLET_KEY;
  });

  it("blocks audit when Venice not configured", async () => {
    const verdict = await VeniceService.audit({
      systemId: "test",
      spendRequest: {
        amount: "10",
        token: "USDC",
        recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        memo: "test",
      },
      permission: {
        maxDailySpend: "100",
        expiry: Math.floor(Date.now() / 1000) + 86400,
        justification: "test",
      },
    });

    expect(verdict.decision).toBe("blocked");
    expect(verdict.flags).toContain("fail_closed");
  });

  it("uses e2e mock when E2E_MOCK_VENICE=true", async () => {
    process.env.E2E_MOCK_VENICE = "true";
    const decision = await VeniceService.agentThink({
      systemId: "e2e",
      systemName: "E2E",
      goal: "test",
      budget: { total: 100, remaining: 100, spent: 0 },
      kpis: [],
      pendingTasks: [],
      recentTransactions: [],
    });
    expect(decision.actions[0]?.type).toBe("spend");
    expect(decision.actions[0]?.amount).toBe(75);
    delete process.env.E2E_MOCK_VENICE;
  });

  it("throws on agentThink when not configured", async () => {
    await expect(
      VeniceService.agentThink({
        systemId: "test",
        systemName: "Test",
        goal: "test",
        budget: { total: 100, remaining: 100, spent: 0 },
        kpis: [],
        pendingTasks: [],
        recentTransactions: [],
      }),
    ).rejects.toThrow(/not configured/i);
  });

  it("healthCheck reports not configured", async () => {
    const health = await VeniceService.healthCheck();
    expect(health.configured).toBe(false);
    expect(health.ok).toBe(false);
  });
});
