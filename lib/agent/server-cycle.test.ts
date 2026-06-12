import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/venice/service", () => ({
  VeniceService: {
    agentThink: vi.fn().mockResolvedValue({
      actions: [{ type: "wait", description: "Hold", reasoning: "Stable", confidence: 0.8, priority: "low" }],
      reasoning: "No action needed",
      confidence: 0.8,
      nextCycleDelay: 60,
    }),
    audit: vi.fn(),
  },
}));

vi.mock("@/lib/metamask/execute", () => ({
  executeDelegatedTransfer: vi.fn(),
}));

vi.mock("@/lib/agent/knowledge-server", () => ({
  getServerKnowledgeForAgent: () => [],
}));

vi.mock("@/lib/agent/approvals-server", () => ({
  createServerApprovalRequest: vi.fn(),
  notifyApprovalExecuted: vi.fn(),
}));

const TEST_SYSTEM = {
  id: "test-agent",
  name: "Test Agent",
  description: "Test",
  goal: "Test goal",
  budget: 100,
  kpiTargets: [],
};

vi.mock("@/lib/server/store", () => {
  const store = {
    permissions: [],
    customSystems: [TEST_SYSTEM],
    auditLog: [],
    activity: [],
    autonomyConfigs: {},
    veniceUsage: [],
    spendCounts: {},
    agentGoals: [],
    decisions: [],
    dailySpend: {},
    reports: [],
    approvalRequests: [],
    trustScores: {},
    budgetPool: null,
    knowledge: [],
    agentLoops: {},
    lastSync: 0,
  };
  return {
    getServerStore: () => store,
    hydrateServerStore: vi.fn().mockResolvedValue(store),
    saveServerStore: vi.fn(),
    getServerSystem: (systemId: string) =>
      store.customSystems.find((s) => s.id === systemId) ?? undefined,
    getServerPermission: () => undefined,
    appendServerAudit: vi.fn(),
    appendServerActivity: vi.fn(),
    appendServerDecision: vi.fn(),
    getServerDailySpend: () => "0",
    addServerDailySpend: vi.fn(),
    incrementSpendCount: vi.fn(),
    updateServerTrustScore: vi.fn(),
  };
});

describe("runServerCycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("completes cycle with non-spend actions", async () => {
    const { runServerCycle } = await import("@/lib/agent/server-cycle");
    const result = await runServerCycle("test-agent");
    expect(result.systemId).toBe("test-agent");
    expect(result.decision.actions).toHaveLength(1);
    expect(result.outcomes[0].executed).toBe(false);
  });

  it("throws when system is not found", async () => {
    const { runServerCycle } = await import("@/lib/agent/server-cycle");
    await expect(runServerCycle("non-existent")).rejects.toThrow(/not found/i);
  });
});
