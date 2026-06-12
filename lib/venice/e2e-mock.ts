import type { AgentState, AgentDecision } from "@/lib/agent/brain";
import { DEFAULT_VENDOR_ADDRESS } from "@/lib/constants";

/** CI/E2E only — never enabled in production deploy */
export function isE2eMockVeniceEnabled(): boolean {
  if (process.env.NODE_ENV === "production" && process.env.E2E_MOCK_VENICE === "true") {
    return false;
  }
  return process.env.E2E_MOCK_VENICE === "true";
}

/** Deterministic agent decision for Playwright / CI pipeline tests */
export function e2eMockAgentThink(_state: AgentState): AgentDecision {
  return {
    actions: [
      {
        type: "spend",
        amount: 75,
        recipient: DEFAULT_VENDOR_ADDRESS,
        description: "E2E vendor payment",
        memo: "E2E pipeline test",
        reasoning: "Mock Venice: spend exceeds autonomy threshold — requires CFO approval",
        confidence: 0.95,
        priority: "high",
      },
    ],
    reasoning: "E2E mock cycle proposes a spend that routes to the approval queue",
    confidence: 0.95,
    nextCycleDelay: 60,
  };
}
