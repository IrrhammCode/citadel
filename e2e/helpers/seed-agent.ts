import type { APIRequestContext } from "@playwright/test";
import { DEFAULT_VENDOR_ADDRESS } from "../../lib/constants";

export type SeedAgentOptions = {
  systemId: string;
  name?: string;
  apiSecret?: string;
};

export function apiHeaders(secret?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers["x-citadel-secret"] = secret;
  return headers;
}

/** Simulates register-agent: system + permission + supervised autonomy */
export async function seedRegisteredAgent(
  request: APIRequestContext,
  options: SeedAgentOptions,
) {
  const { systemId, name = "E2E Test Agent", apiSecret } = options;
  const now = Date.now();

  const body = {
    customSystems: [
      {
        id: systemId,
        name,
        description: "E2E pipeline test agent",
        category: "custom",
        goal: "Validate register → cycle → approval flow",
        budget: 500,
        kpiTargets: [
          {
            name: "ROI",
            target: 2,
            unit: "ratio",
            isHigherBetter: true,
          },
        ],
        customPrompt: "E2E test policy",
        createdAt: now,
      },
    ],
    permissions: [
      {
        id: `perm-${systemId}`,
        systemId,
        systemName: name,
        maxDailySpend: "100",
        expiry: Math.floor(now / 1000) + 86400 * 7,
        justification: "E2E test permission",
        grantedAt: now,
        sessionAddress: "0x0000000000000000000000000000000000000001",
        grantedPermissions: [],
      },
    ],
    autonomyConfigs: {
      [systemId]: {
        systemId,
        level: "supervised",
        autoApproveThreshold: 0,
        requireApprovalAbove: 0,
        maxAutoApprovePerDay: 0,
        allowedRecipients: [],
        blockedRecipients: [],
        emergencyStop: false,
        lastUpdated: now,
      },
    },
    agentGoals: [
      {
        systemId,
        goal: "E2E validation",
        createdAt: now,
      },
    ],
    budgetPool: {
      total: 1000,
      allocated: 500,
      unallocated: 500,
      allocations: [{ systemId, amount: 500 }],
    },
    knowledge: [
      {
        id: `k-${systemId}`,
        systemId,
        type: "text",
        title: "E2E vendor",
        content: `Preferred vendor ${DEFAULT_VENDOR_ADDRESS}`,
        createdAt: now,
      },
    ],
  };

  const res = await request.post("/api/store", {
    headers: apiHeaders(apiSecret),
    data: body,
  });

  if (!res.ok()) {
    throw new Error(`Failed to seed agent: ${res.status()} ${await res.text()}`);
  }

  return { systemId, name };
}
