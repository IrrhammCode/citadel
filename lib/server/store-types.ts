import type { AuditRecord } from "@/types/audit";
import type { StoredPermission } from "@/types/permission";
import type { AutonomousSystem } from "@/types/system";
import type { ActivityEvent } from "@/types/activity";
import type { AgentGoal, AgentReport, BudgetPool, TrustScore } from "@/types/agent";
import type { AutonomyConfig, ApprovalRequest } from "@/lib/agent/autonomy";
import type { DecisionRecord } from "@/lib/agent/memory";
import type { KnowledgeItem } from "@/lib/agent/knowledge";

export type AgentLoopStatus = {
  systemId: string;
  isRunning: boolean;
  cycleCount: number;
  lastCycle: number;
  startedAt: number;
  intervalMinutes?: number;
  lastError?: string;
};

export type VeniceUsageRecord = {
  id: string;
  operation: "audit" | "think" | "report" | "negotiate" | "search" | "chat";
  model: string;
  tokens: number;
  latencyMs: number;
  systemId?: string;
  authMethod: "x402" | "api_key" | "bai_fallback";
  timestamp: number;
  costUsd: number;
};

export type CitadelStore = {
  permissions: StoredPermission[];
  customSystems: AutonomousSystem[];
  auditLog: AuditRecord[];
  activity: ActivityEvent[];
  autonomyConfigs: Record<string, AutonomyConfig>;
  veniceUsage: VeniceUsageRecord[];
  spendCounts: Record<string, number>;
  agentGoals: AgentGoal[];
  decisions: DecisionRecord[];
  dailySpend: Record<string, { date: string; amount: string }>;
  reports: AgentReport[];
  approvalRequests: ApprovalRequest[];
  trustScores: Record<string, TrustScore>;
  budgetPool: BudgetPool | null;
  knowledge: KnowledgeItem[];
  agentLoops: Record<string, AgentLoopStatus>;
  apiKeys?: {
    venice?: string;
    bai?: string;
  };
  lastSync: number;
};

export const DEFAULT_STORE: CitadelStore = {
  permissions: [],
  customSystems: [],
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
