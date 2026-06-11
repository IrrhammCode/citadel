/**
 * Agent Autonomy Levels
 * Control how much freedom each agent has
 */

// ─── Types ──────────────────────────────────────────────────

export type AutonomyLevel = "supervised" | "semi-auto" | "full-auto";

export type AutonomyConfig = {
  systemId: string;
  level: AutonomyLevel;
  autoApproveThreshold: number; // USDC - auto-approve below this
  requireApprovalAbove: number; // USDC - require approval above this
  maxAutoApprovePerDay: number; // USDC - max auto-approve per day
  allowedRecipients: string[]; // whitelist
  blockedRecipients: string[]; // blacklist
  allowedHours?: { start: number; end: number }; // 24h format
  emergencyStop: boolean;
  lastUpdated: number;
};

export type ApprovalRequest = {
  id: string;
  systemId: string;
  type: "spend" | "negotiate" | "onboard_vendor";
  amount?: number;
  recipient?: string;
  description: string;
  reasoning: string;
  confidence: number;
  status: "pending" | "approved" | "rejected" | "auto-approved";
  requestedAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
};

// ─── Default Configs ────────────────────────────────────────

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

// ─── Storage ────────────────────────────────────────────────

const CONFIG_KEY = "***";
const APPROVAL_KEY = "***";

function getConfigs(): Record<string, AutonomyConfig> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(CONFIG_KEY);
  return raw ? JSON.parse(raw) : {};
}

function saveConfigs(configs: Record<string, AutonomyConfig>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(configs));
}

function getApprovals(): ApprovalRequest[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(APPROVAL_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveApprovals(approvals: ApprovalRequest[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(APPROVAL_KEY, JSON.stringify(approvals));
}

// ─── Get/Set Autonomy Config ────────────────────────────────

export function getAutonomyConfig(systemId: string): AutonomyConfig {
  const configs = getConfigs();
  if (configs[systemId]) return configs[systemId];

  // Return default semi-auto config
  return {
    systemId,
    level: "semi-auto",
    ...DEFAULT_CONFIGS["semi-auto"],
    allowedRecipients: [],
    blockedRecipients: [],
    lastUpdated: Date.now(),
  } as AutonomyConfig;
}

export function setAutonomyConfig(config: AutonomyConfig): void {
  const configs = getConfigs();
  configs[config.systemId] = { ...config, lastUpdated: Date.now() };
  saveConfigs(configs);
}

export function setAutonomyLevel(systemId: string, level: AutonomyLevel): void {
  const config = getAutonomyConfig(systemId);
  setAutonomyConfig({
    ...config,
    level,
    ...DEFAULT_CONFIGS[level],
  });
}

// ─── Check if Action Needs Approval ─────────────────────────

export function needsApproval(
  systemId: string,
  action: {
    type: "spend" | "negotiate" | "onboard_vendor";
    amount?: number;
    recipient?: string;
  },
): { needsApproval: boolean; reason?: string; canAutoApprove: boolean } {
  const config = getAutonomyConfig(systemId);

  // Emergency stop - always need approval
  if (config.emergencyStop) {
    return {
      needsApproval: true,
      reason: "Emergency stop is active",
      canAutoApprove: false,
    };
  }

  // Check allowed hours
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

  // Check blocked recipients
  if (action.recipient && config.blockedRecipients.includes(action.recipient)) {
    return {
      needsApproval: true,
      reason: "Recipient is blocked",
      canAutoApprove: false,
    };
  }

  // Spend-specific checks
  if (action.type === "spend" && action.amount) {
    // Above threshold - need approval
    if (action.amount > config.requireApprovalAbove) {
      return {
        needsApproval: true,
        reason: `Amount ${action.amount} exceeds approval threshold ${config.requireApprovalAbove}`,
        canAutoApprove: false,
      };
    }

    // Below auto-approve threshold - can auto-approve
    if (action.amount <= config.autoApproveThreshold) {
      // Check daily limit
      const dailyAutoApproved = getDailyAutoApproved(systemId);
      if (dailyAutoApproved + action.amount > config.maxAutoApprovePerDay) {
        return {
          needsApproval: true,
          reason: `Daily auto-approve limit reached: ${dailyAutoApproved} + ${action.amount} > ${config.maxAutoApprovePerDay}`,
          canAutoApprove: false,
        };
      }

      // Check whitelist if semi-auto
      if (
        config.level === "semi-auto" &&
        action.recipient &&
        config.allowedRecipients.length > 0 &&
        !config.allowedRecipients.includes(action.recipient)
      ) {
        return {
          needsApproval: true,
          reason: "Recipient not in whitelist",
          canAutoApprove: false,
        };
      }

      return { needsApproval: false, canAutoApprove: true };
    }

    // Between thresholds - need approval for supervised
    if (config.level === "supervised") {
      return {
        needsApproval: true,
        reason: "Supervised mode - all spends need approval",
        canAutoApprove: false,
      };
    }
  }

  // Default - no approval needed
  return { needsApproval: false, canAutoApprove: true };
}

// ─── Approval Requests ──────────────────────────────────────

export function createApprovalRequest(
  systemId: string,
  action: {
    type: "spend" | "negotiate" | "onboard_vendor";
    amount?: number;
    recipient?: string;
    description: string;
    reasoning: string;
    confidence: number;
  },
): ApprovalRequest {
  const request: ApprovalRequest = {
    id: crypto.randomUUID(),
    systemId,
    ...action,
    status: "pending",
    requestedAt: Date.now(),
  };

  const approvals = getApprovals();
  approvals.push(request);
  saveApprovals(approvals);

  return request;
}

export function approveRequest(id: string, approvedBy: string): void {
  const approvals = getApprovals();
  const request = approvals.find((a) => a.id === id);
  if (request) {
    request.status = "approved";
    request.resolvedAt = Date.now();
    request.resolvedBy = approvedBy;
    saveApprovals(approvals);
  }
}

export function rejectRequest(id: string, rejectedBy: string): void {
  const approvals = getApprovals();
  const request = approvals.find((a) => a.id === id);
  if (request) {
    request.status = "rejected";
    request.resolvedAt = Date.now();
    request.resolvedBy = rejectedBy;
    saveApprovals(approvals);
  }
}

export function autoApproveRequest(id: string): void {
  const approvals = getApprovals();
  const request = approvals.find((a) => a.id === id);
  if (request) {
    request.status = "auto-approved";
    request.resolvedAt = Date.now();
    saveApprovals(approvals);
  }
}

export function getPendingApprovals(systemId?: string): ApprovalRequest[] {
  const approvals = getApprovals();
  return approvals.filter(
    (a) =>
      a.status === "pending" && (!systemId || a.systemId === systemId),
  );
}

export function getApprovalHistory(
  systemId?: string,
  limit: number = 50,
): ApprovalRequest[] {
  const approvals = getApprovals();
  return approvals
    .filter((a) => !systemId || a.systemId === systemId)
    .sort((a, b) => b.requestedAt - a.requestedAt)
    .slice(0, limit);
}

// ─── Daily Auto-Approved Tracking ───────────────────────────

function getDailyAutoApproved(systemId: string): number {
  const today = new Date().toISOString().slice(0, 10);
  const approvals = getApprovals();

  return approvals
    .filter((a) => {
      const date = new Date(a.requestedAt).toISOString().slice(0, 10);
      return (
        a.systemId === systemId &&
        date === today &&
        a.status === "auto-approved" &&
        a.type === "spend"
      );
    })
    .reduce((sum, a) => sum + (a.amount || 0), 0);
}

// ─── Emergency Controls ─────────────────────────────────────

export function activateEmergencyStop(systemId: string): void {
  const config = getAutonomyConfig(systemId);
  setAutonomyConfig({ ...config, emergencyStop: true });
}

export function deactivateEmergencyStop(systemId: string): void {
  const config = getAutonomyConfig(systemId);
  setAutonomyConfig({ ...config, emergencyStop: false });
}

export function isEmergencyStopActive(systemId: string): boolean {
  return getAutonomyConfig(systemId).emergencyStop;
}

// ─── Recipient Management ───────────────────────────────────

export function addToWhitelist(systemId: string, address: string): void {
  const config = getAutonomyConfig(systemId);
  if (!config.allowedRecipients.includes(address)) {
    config.allowedRecipients.push(address);
    setAutonomyConfig(config);
  }
}

export function removeFromWhitelist(systemId: string, address: string): void {
  const config = getAutonomyConfig(systemId);
  config.allowedRecipients = config.allowedRecipients.filter(
    (a) => a !== address,
  );
  setAutonomyConfig(config);
}

export function addToBlocklist(systemId: string, address: string): void {
  const config = getAutonomyConfig(systemId);
  if (!config.blockedRecipients.includes(address)) {
    config.blockedRecipients.push(address);
    setAutonomyConfig(config);
  }
}

export function removeFromBlocklist(systemId: string, address: string): void {
  const config = getAutonomyConfig(systemId);
  config.blockedRecipients = config.blockedRecipients.filter(
    (a) => a !== address,
  );
  setAutonomyConfig(config);
}
