import type { AuditRecord } from "@/types/audit";
import type { StoredPermission } from "@/types/permission";
import type {
  TrustScore,
  TrustEvent,
  VendorProfile,
  Anomaly,
  AgentReport,
  NegotiationRequest,
  BudgetPool,
  AgentGoal,
} from "@/types/agent";
import type { ActivityEvent } from "@/types/activity";

const PERMISSIONS_KEY = "citadel:permissions";
const AUDIT_LOG_KEY = "citadel:audit-log";
const DAILY_SPEND_KEY = "citadel:daily-spend";
const TRUST_SCORES_KEY = "citadel:trust-scores";
const VENDORS_KEY = "citadel:vendors";
const ANOMALIES_KEY = "citadel:anomalies";
const REPORTS_KEY = "citadel:reports";
const NEGOTIATIONS_KEY = "citadel:negotiations";
const BUDGET_POOL_KEY = "citadel:budget-pool";
const AGENT_GOALS_KEY = "citadel:agent-goals";
const API_KEYS_KEY = "citadel:api-keys";

export type ApiKeys = {
  venice?: string;
  bai?: string;
};

export function getApiKeys(): ApiKeys {
  return readJson<ApiKeys>(API_KEYS_KEY, {});
}

export function saveApiKeys(keys: ApiKeys) {
  writeJson(API_KEYS_KEY, keys);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("citadel_storage_updated"));
  }
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw, (key, val) =>
      val && val.$type === "bigint" ? BigInt(val.value) : val
    ) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    key,
    JSON.stringify(value, (key, val) =>
      typeof val === "bigint" ? { $type: "bigint", value: val.toString() } : val
    )
  );
}

// ─── Permissions ────────────────────────────────────────────

export function getPermissions(): StoredPermission[] {
  return readJson<StoredPermission[]>(PERMISSIONS_KEY, []);
}

export function savePermission(permission: StoredPermission) {
  const existing = getPermissions().filter((p) => p.systemId !== permission.systemId);
  writeJson(PERMISSIONS_KEY, [...existing, permission]);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("citadel_storage_updated"));
  }
}

export function getPermissionForSystem(systemId: string): StoredPermission | undefined {
  return getPermissions().find((p) => p.systemId === systemId);
}

// ─── Audit Log ──────────────────────────────────────────────

export function getAuditLog(): AuditRecord[] {
  return readJson<AuditRecord[]>(AUDIT_LOG_KEY, []).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}

export function appendAuditRecord(record: AuditRecord) {
  const log = getAuditLog();
  writeJson(AUDIT_LOG_KEY, [record, ...log]);
}

export function updateAuditRecordTx(id: string, txHash: string) {
  const log = getAuditLog().map((r) => (r.id === id ? { ...r, txHash } : r));
  writeJson(AUDIT_LOG_KEY, log);
}

// ─── Daily Spend ────────────────────────────────────────────

export function getDailySpend(systemId: string): string {
  const all = readJson<Record<string, { date: string; amount: string }>>(
    DAILY_SPEND_KEY,
    {},
  );
  const today = new Date().toISOString().slice(0, 10);
  const entry = all[systemId];
  if (!entry || entry.date !== today) return "0";
  return entry.amount;
}

export function addDailySpend(systemId: string, amount: string) {
  const all = readJson<Record<string, { date: string; amount: string }>>(
    DAILY_SPEND_KEY,
    {},
  );
  const today = new Date().toISOString().slice(0, 10);
  const current = getDailySpend(systemId);
  const next = (parseFloat(current) + parseFloat(amount)).toString();
  all[systemId] = { date: today, amount: next };
  writeJson(DAILY_SPEND_KEY, all);
}

// ─── Custom Systems ─────────────────────────────────────────

const CUSTOM_SYSTEMS_KEY = "citadel:custom-systems";

export function getCustomSystems(): import("@/types/system").AutonomousSystem[] {
  return readJson<import("@/types/system").AutonomousSystem[]>(CUSTOM_SYSTEMS_KEY, []);
}

export function saveCustomSystem(system: import("@/types/system").AutonomousSystem) {
  const existing = getCustomSystems();
  writeJson(CUSTOM_SYSTEMS_KEY, [...existing, system]);
}

// ─── Trust Scores ───────────────────────────────────────────

export function getTrustScore(systemId: string): TrustScore {
  const all = readJson<Record<string, TrustScore>>(TRUST_SCORES_KEY, {});
  return all[systemId] || {
    score: 50,
    level: "standard",
    maxTxAmount: 20,
    history: [],
    updatedAt: Date.now(),
  };
}

export function updateTrustScore(systemId: string, event: TrustEvent) {
  const all = readJson<Record<string, TrustScore>>(TRUST_SCORES_KEY, {});
  const current = all[systemId] || {
    score: 50,
    level: "standard",
    maxTxAmount: 20,
    history: [],
    updatedAt: Date.now(),
  };

  const newScore = Math.max(0, Math.min(100, current.score + event.points));
  let level: TrustScore["level"] = "standard";
  let maxTxAmount = 20;

  if (newScore <= 30) { level = "restricted"; maxTxAmount = 5; }
  else if (newScore <= 60) { level = "standard"; maxTxAmount = 20; }
  else if (newScore <= 80) { level = "trusted"; maxTxAmount = 50; }
  else { level = "elite"; maxTxAmount = 100; }

  all[systemId] = {
    score: newScore,
    level,
    maxTxAmount,
    history: [event, ...current.history].slice(0, 50),
    updatedAt: Date.now(),
  };

  writeJson(TRUST_SCORES_KEY, all);
  return all[systemId];
}

// ─── Vendor Profiles ────────────────────────────────────────

export function getVendorProfile(address: string): VendorProfile | undefined {
  const vendors = readJson<Record<string, VendorProfile>>(VENDORS_KEY, {});
  return vendors[address.toLowerCase()];
}

export function getAllVendors(): VendorProfile[] {
  const vendors = readJson<Record<string, VendorProfile>>(VENDORS_KEY, {});
  return Object.values(vendors);
}

export function updateVendorProfile(address: string, amount: number) {
  const vendors = readJson<Record<string, VendorProfile>>(VENDORS_KEY, {});
  const key = address.toLowerCase();
  const existing = vendors[key];

  if (existing) {
    const newCount = existing.transactionCount + 1;
    vendors[key] = {
      ...existing,
      totalPaid: existing.totalPaid + amount,
      transactionCount: newCount,
      averageAmount: (existing.totalPaid + amount) / newCount,
      lastPayment: Date.now(),
      riskLevel: newCount >= 5 ? "low" : newCount >= 2 ? "medium" : "high",
    };
  } else {
    vendors[key] = {
      address: key,
      name: `Vendor ${key.slice(0, 6)}...${key.slice(-4)}`,
      trustScore: 30,
      totalPaid: amount,
      transactionCount: 1,
      averageAmount: amount,
      lastPayment: Date.now(),
      riskLevel: "high",
      notes: [],
    };
  }

  writeJson(VENDORS_KEY, vendors);
  return vendors[key];
}

// ─── Anomalies ──────────────────────────────────────────────

export function getAnomalies(systemId?: string): Anomaly[] {
  const all = readJson<Anomaly[]>(ANOMALIES_KEY, []);
  if (systemId) return all.filter((a) => a.systemId === systemId);
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export function addAnomaly(anomaly: Anomaly) {
  const all = getAnomalies();
  writeJson(ANOMALIES_KEY, [anomaly, ...all]);
}

export function resolveAnomaly(id: string, resolution: string) {
  const all = getAnomalies().map((a) =>
    a.id === id ? { ...a, resolved: true, resolution } : a,
  );
  writeJson(ANOMALIES_KEY, all);
}

// ─── Reports ────────────────────────────────────────────────

export function getReports(systemId?: string): AgentReport[] {
  const all = readJson<AgentReport[]>(REPORTS_KEY, []);
  if (systemId) return all.filter((r) => r.systemId === systemId);
  return all.sort((a, b) => b.generatedAt - a.generatedAt);
}

export function saveReport(report: AgentReport) {
  const all = getReports();
  writeJson(REPORTS_KEY, [report, ...all]);
}

// ─── Negotiations ───────────────────────────────────────────

export function getNegotiations(systemId?: string): NegotiationRequest[] {
  const all = readJson<NegotiationRequest[]>(NEGOTIATIONS_KEY, []);
  if (systemId) return all.filter((n) => n.fromSystemId === systemId || n.toSystemId === systemId);
  return all.sort((a, b) => b.timestamp - a.timestamp);
}

export function saveNegotiation(negotiation: NegotiationRequest) {
  const all = getNegotiations();
  writeJson(NEGOTIATIONS_KEY, [negotiation, ...all]);
}

export function updateNegotiationStatus(id: string, status: NegotiationRequest["status"], counterAmount?: number) {
  const all = getNegotiations().map((n) =>
    n.id === id ? { ...n, status, counterAmount, resolvedAt: Date.now() } : n,
  );
  writeJson(NEGOTIATIONS_KEY, all);
}

// ─── Budget Pool ────────────────────────────────────────────

export function getBudgetPool(): BudgetPool {
  return readJson<BudgetPool>(BUDGET_POOL_KEY, {
    totalBudget: 1000,
    allocated: 1000,
    unallocated: 0,
    allocations: [
      { systemId: "marketing", amount: 500 },
      { systemId: "devops", amount: 300 },
      { systemId: "payroll", amount: 200 },
    ],
  });
}

export function updateBudgetPool(pool: BudgetPool) {
  writeJson(BUDGET_POOL_KEY, pool);
}

// ─── Agent Goals ────────────────────────────────────────────

export function getAgentGoal(systemId: string): AgentGoal | undefined {
  const all = readJson<AgentGoal[]>(AGENT_GOALS_KEY, []);
  return all.find((g) => g.systemId === systemId && g.status === "active");
}

export function getAllAgentGoals(): AgentGoal[] {
  return readJson<AgentGoal[]>(AGENT_GOALS_KEY, []);
}

export function saveAgentGoal(goal: AgentGoal) {
  const all = getAllAgentGoals().filter((g) => g.systemId !== goal.systemId || g.status !== "active");
  writeJson(AGENT_GOALS_KEY, [goal, ...all]);
}

export function updateAgentGoalSpent(systemId: string, amount: number) {
  const all = getAllAgentGoals().map((g) =>
    g.systemId === systemId && g.status === "active"
      ? { ...g, spent: g.spent + amount }
      : g,
  );
  writeJson(AGENT_GOALS_KEY, all);
}

// ─── Activity Feed ──────────────────────────────────────────

const ACTIVITY_KEY = "citadel:activity";

export function getActivity(limit: number = 50): ActivityEvent[] {
  return readJson<ActivityEvent[]>(ACTIVITY_KEY, []).slice(0, limit);
}

export function getSystemActivity(systemId: string, limit: number = 20): ActivityEvent[] {
  return readJson<ActivityEvent[]>(ACTIVITY_KEY, [])
    .filter((a) => a.systemId === systemId)
    .slice(0, limit);
}

export function addActivity(event: Omit<ActivityEvent, "id" | "timestamp">) {
  const all = readJson<ActivityEvent[]>(ACTIVITY_KEY, []);
  const newEvent: ActivityEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  writeJson(ACTIVITY_KEY, [newEvent, ...all].slice(0, 200));
  return newEvent;
}
