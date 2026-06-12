/**
 * Server-side autonomy checks (mirrors lib/agent/autonomy.ts logic)
 */
import type { AutonomyConfig, AutonomyLevel } from "@/lib/agent/autonomy";
import { getServerStore } from "@/lib/server/store";

const DEFAULT_CONFIGS: Record<AutonomyLevel, Partial<AutonomyConfig>> = {
  supervised: {
    autoApproveThreshold: 0,
    requireApprovalAbove: 0,
    maxAutoApprovePerDay: 0,
    emergencyStop: false,
  },
  "semi-auto": {
    autoApproveThreshold: 10,
    requireApprovalAbove: 50,
    maxAutoApprovePerDay: 100,
    emergencyStop: false,
  },
  "full-auto": {
    autoApproveThreshold: 50,
    requireApprovalAbove: 200,
    maxAutoApprovePerDay: 500,
    emergencyStop: false,
  },
};

export function getServerAutonomyConfig(systemId: string): AutonomyConfig {
  const configs = getServerStore().autonomyConfigs;
  if (configs[systemId]) return configs[systemId];

  return {
    systemId,
    level: "semi-auto",
    ...DEFAULT_CONFIGS["semi-auto"],
    allowedRecipients: [],
    blockedRecipients: [],
    lastUpdated: Date.now(),
  } as AutonomyConfig;
}

function getDailyAutoApproved(systemId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  return getServerStore()
    .decisions.filter((d) => {
      const date = new Date(d.timestamp).toISOString().slice(0, 10);
      return date === today && d.systemId === systemId && d.outcome?.success;
    })
    .reduce((sum, d) => {
      const spend = d.decision.actions.find((a) => a.type === "spend");
      return sum + (spend?.amount ?? 0);
    }, 0);
}

export function serverNeedsApproval(
  systemId: string,
  action: { type: "spend" | "negotiate" | "onboard_vendor"; amount?: number; recipient?: string },
): { needsApproval: boolean; reason?: string; canAutoApprove: boolean } {
  const config = getServerAutonomyConfig(systemId);

  if (config.emergencyStop) {
    return { needsApproval: true, reason: "Emergency stop is active", canAutoApprove: false };
  }

  if (config.allowedHours) {
    const hour = new Date().getHours();
    if (hour < config.allowedHours.start || hour > config.allowedHours.end) {
      return {
        needsApproval: true,
        reason: `Outside allowed hours (${config.allowedHours.start}:00 - ${config.allowedHours.end}:00)`,
        canAutoApprove: false,
      };
    }
  }

  if (action.recipient && config.blockedRecipients.includes(action.recipient)) {
    return { needsApproval: true, reason: "Recipient is blocked", canAutoApprove: false };
  }

  if (action.type === "spend" && action.amount !== undefined) {
    if (action.amount > config.requireApprovalAbove) {
      return {
        needsApproval: true,
        reason: `Amount ${action.amount} exceeds approval threshold ${config.requireApprovalAbove}`,
        canAutoApprove: false,
      };
    }

    if (action.amount <= config.autoApproveThreshold) {
      const dailyAuto = getDailyAutoApproved(systemId);
      if (dailyAuto + action.amount > config.maxAutoApprovePerDay) {
        return {
          needsApproval: true,
          reason: `Daily auto-approve limit reached`,
          canAutoApprove: false,
        };
      }

      if (
        config.level === "semi-auto" &&
        action.recipient &&
        config.allowedRecipients.length > 0 &&
        !config.allowedRecipients.includes(action.recipient)
      ) {
        return { needsApproval: true, reason: "Recipient not in whitelist", canAutoApprove: false };
      }

      return { needsApproval: false, canAutoApprove: true };
    }

    if (config.level === "supervised") {
      return {
        needsApproval: true,
        reason: "Supervised mode — all spends need approval",
        canAutoApprove: false,
      };
    }
  }

  return { needsApproval: false, canAutoApprove: true };
}
