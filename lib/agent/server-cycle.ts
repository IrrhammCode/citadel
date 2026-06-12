/**
 * Server-side agent cycle: observe → think → Venice audit → autonomy → execute
 */
import type { Address } from "viem";
import type { AgentState, AgentDecision, AgentAction } from "@/lib/agent/brain";
import { VeniceService } from "@/lib/venice/service";
import { serverNeedsApproval } from "@/lib/agent/autonomy-server";
import { createServerApprovalRequest } from "@/lib/agent/approvals-server";
import { executeDelegatedTransfer } from "@/lib/metamask/execute";
import { normalizeStoredPermission } from "@/lib/metamask/normalize-permission";
import { getServerKnowledgeForAgent } from "@/lib/agent/knowledge-server";
import { emitSpendRequest, emitSpendApproved, emitSpendBlocked, emitAgentError } from "@/lib/agent/event-bus";
import { maybeTriggerReport } from "@/lib/agent/report-trigger";
import {
  getServerStore,
  getServerSystem,
  getServerPermission,
  appendServerAudit,
  appendServerActivity,
  appendServerDecision,
  getServerDailySpend,
  addServerDailySpend,
  incrementSpendCount,
  updateServerTrustScore,
  hydrateServerStore,
} from "@/lib/server/store";
import { notifyApprovalExecuted } from "@/lib/agent/approvals-server";
import type { AuditRecord } from "@/types/audit";
import type { DecisionRecord } from "@/lib/agent/memory";
import type { AutonomousSystem } from "@/types/system";

export type CycleResult = {
  systemId: string;
  decision: AgentDecision;
  decisionRecord: DecisionRecord;
  outcomes: {
    action: AgentAction;
    auditVerdict?: string;
    executed: boolean;
    txHash?: string;
    blocked?: string;
    pendingApprovalId?: string;
  }[];
};

function getServerMemoryContext(systemId: string): string[] {
  return getServerStore()
    .decisions.filter((d) => d.systemId === systemId)
    .slice(0, 5)
    .map((d) => `Prior cycle ${d.cycle}: ${d.decision.reasoning.slice(0, 120)}`);
}

function computeKpiCurrent(
  kpi: NonNullable<AutonomousSystem["kpiTargets"]>[0],
  systemId: string,
  approvedAudits: { amount: number; recipient: string }[],
  totalSpent: number,
): number {
  const name = kpi.name.toLowerCase();
  if (name.includes("roi")) return totalSpent > 0 ? 2.1 + approvedAudits.length * 0.05 : 0;
  if (name.includes("vendor") || name.includes("diversity")) {
    return new Set(approvedAudits.map((a) => a.recipient.toLowerCase())).size;
  }
  if (name.includes("uptime") || name.includes("compliance") || name.includes("on-time")) {
    const blocked = getServerStore().auditLog.filter(
      (a) => a.systemId === systemId && a.verdict.decision === "blocked",
    ).length;
    const total = approvedAudits.length + blocked;
    return total > 0 ? Math.round((approvedAudits.length / total) * 100) : 95;
  }
  if (kpi.unit === "count") return approvedAudits.length;
  if (kpi.unit === "usdc" && !kpi.isHigherBetter) {
    const max = Math.max(...approvedAudits.map((a) => a.amount), 0);
    return max;
  }
  return totalSpent;
}

function buildState(systemId: string): AgentState {
  const system = getServerSystem(systemId);
  if (!system) throw new Error(`System ${systemId} not found`);

  const store = getServerStore();
  const systemAudits = store.auditLog.filter((a) => a.systemId === systemId);
  const approvedAudits = systemAudits
    .filter((a) => a.verdict.decision === "approved")
    .map((a) => ({
      amount: parseFloat(a.spendRequest.amount),
      recipient: a.spendRequest.recipient,
    }));
  const totalSpent = approvedAudits.reduce((sum, a) => sum + a.amount, 0);

  const knowledge = [
    ...getServerKnowledgeForAgent(systemId),
    ...getServerMemoryContext(systemId),
  ];

  return {
    systemId,
    systemName: system.name,
    goal: system.goal || system.description,
    budget: {
      total: system.budget || 0,
      remaining: Math.max(0, (system.budget || 0) - totalSpent),
      spent: totalSpent,
    },
    kpis: (system.kpiTargets || []).map((kpi) => {
      const current = computeKpiCurrent(kpi, systemId, approvedAudits, totalSpent);
      const status = kpi.isHigherBetter
        ? current >= kpi.target ? "met" : "behind"
        : current <= kpi.target ? "met" : "behind";
      return {
        name: kpi.name,
        target: kpi.target,
        current,
        unit: kpi.unit,
        isHigherBetter: kpi.isHigherBetter,
        status: status as "met" | "behind" | "ahead",
      };
    }),
    pendingTasks: getServerStore()
      .approvalRequests?.filter((a) => a.systemId === systemId && a.status === "pending")
      .map((a) => ({
        id: a.id,
        type: "custom" as const,
        description: `Pending approval: ${a.description}`,
        amount: a.amount,
        recipient: a.recipient,
        priority: "high" as const,
      })) ?? [],
    recentTransactions: systemAudits.slice(-10).map((a) => ({
      amount: parseFloat(a.spendRequest.amount),
      recipient: a.spendRequest.recipient,
      memo: a.spendRequest.memo,
      timestamp: a.timestamp,
      decision: a.verdict.decision,
    })),
    knowledge,
  };
}

async function enrichAuditWithTatum(recipient: string) {
  try {
    const { getAddressIntelligence } = await import("@/lib/tatum/client");
    const intel = await getAddressIntelligence(recipient);
    return {
      isMalicious: intel.isMalicious,
      maliciousDetails: intel.maliciousDetails,
      transactionCount: intel.transactionCount,
      ensName: intel.ensName,
      riskLevel: intel.riskLevel,
    };
  } catch {
    return undefined;
  }
}

async function auditSpend(
  systemId: string,
  action: AgentAction,
  customPrompt?: string,
): Promise<{ verdict: Awaited<ReturnType<typeof VeniceService.audit>>; auditRecord: AuditRecord }> {
  const system = getServerSystem(systemId)!;
  const permission = getServerPermission(systemId);
  const store = getServerStore();

  const spendRequest = {
    amount: String(action.amount),
    token: "USDC",
    recipient: action.recipient!,
    memo: action.memo || action.description,
  };

  const vendorAudits = store.auditLog.filter(
    (a) => a.spendRequest.recipient.toLowerCase() === action.recipient!.toLowerCase(),
  );
  const vendor = vendorAudits.reduce(
    (acc, a) => {
      const amt = parseFloat(a.spendRequest.amount);
      return {
        totalPaid: acc.totalPaid + amt,
        transactionCount: acc.transactionCount + 1,
        averageAmount: 0,
      };
    },
    { totalPaid: 0, transactionCount: 0, averageAmount: 0 },
  );
  if (vendor.transactionCount > 0) {
    vendor.averageAmount = vendor.totalPaid / vendor.transactionCount;
  }

  const recentAudits = store.auditLog
    .filter((a) => a.systemId === systemId)
    .slice(0, 20)
    .map((a) => ({
      amount: parseFloat(a.spendRequest.amount),
      recipient: a.spendRequest.recipient,
      timestamp: a.timestamp,
    }));

  const tatumIntelligence = await enrichAuditWithTatum(action.recipient!);

  const verdict = await VeniceService.audit({
    systemId,
    spendRequest,
    permission: permission
      ? {
          maxDailySpend: permission.maxDailySpend,
          expiry: permission.expiry,
          justification: permission.justification,
        }
      : { maxDailySpend: "0", expiry: 0, justification: "No permission" },
    priorSpendToday: getServerDailySpend(systemId),
    customPrompt,
    vendorHistory: vendor.transactionCount > 0 ? vendor : undefined,
    recentAudits,
    tatumIntelligence,
  });

  const auditRecord: AuditRecord = {
    id: crypto.randomUUID(),
    systemId,
    systemName: system.name,
    spendRequest,
    verdict: {
      decision: verdict.decision,
      confidence: verdict.confidence,
      reasoning: verdict.reasoning,
      flags: verdict.flags,
    },
    timestamp: Date.now(),
  };

  appendServerAudit(auditRecord);

  appendServerActivity({
    type: "audit",
    systemId,
    systemName: system.name,
    message: `Venice ${verdict.decision}: ${action.amount} USDC`,
    details: verdict.reasoning.slice(0, 120),
    severity: verdict.decision === "approved" ? "success" : "error",
  });

  if (verdict.decision === "approved") {
    updateServerTrustScore(systemId, {
      type: "success",
      description: `Audit approved: ${action.amount} USDC`,
      points: 1,
      timestamp: Date.now(),
    });
  } else {
    updateServerTrustScore(systemId, {
      type: "blocked",
      description: verdict.reasoning.slice(0, 80),
      points: -3,
      timestamp: Date.now(),
    });
  }

  return { verdict, auditRecord };
}

async function executeSpend(
  systemId: string,
  action: AgentAction,
  auditRecord: AuditRecord,
): Promise<{ executed: boolean; txHash?: string; blocked?: string }> {
  const system = getServerSystem(systemId)!;
  const permission = getServerPermission(systemId);

  if (!permission) {
    const reason = "No ERC-7715 permission granted";
    emitSpendBlocked(systemId, action.amount!, action.recipient!, reason);
    appendServerActivity({
      type: "execution",
      systemId,
      systemName: system.name,
      message: `Blocked: ${reason}`,
      severity: "error",
    });
    return { executed: false, blocked: reason };
  }

  // Additional production safety: re-validate permission expiry right before execution
  const now = Math.floor(Date.now() / 1000);
  if (permission.expiry && now > permission.expiry) {
    const reason = "Permission has expired — re-grant required";
    emitSpendBlocked(systemId, action.amount!, action.recipient!, reason);
    appendServerActivity({
      type: "execution",
      systemId,
      systemName: system.name,
      message: `Blocked: ${reason}`,
      severity: "error",
    });
    return { executed: false, blocked: reason };
  }

  const normalized = normalizeStoredPermission(permission.grantedPermissions);
  if (!normalized) {
    return { executed: false, blocked: "Invalid permission context — re-grant via Register Agent" };
  }

  // Pre-execution simulation for extra safety (best effort)
  try {
    const { simulateERC20Transfer } = await import("@/lib/tatum/client");
    const sim = await simulateERC20Transfer({
      chain: "ETH",
      from: "0x0000000000000000000000000000000000000000",
      to: action.recipient!,
      amount: String(action.amount!),
      contractAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // USDC Sepolia
    });
    if (!sim.success) {
      const reason = `Pre-execution simulation failed: ${sim.error || "unknown"}`;
      appendServerActivity({
        type: "execution",
        systemId,
        systemName: system.name,
        message: `Simulation blocked execution`,
        details: reason,
        severity: "error",
      });
      return { executed: false, blocked: reason };
    }
  } catch {
    // Simulation is best-effort; continue if Tatum is unavailable
  }

  emitSpendRequest(systemId, action.amount!, action.recipient!, action.memo || "");

  const result = await executeDelegatedTransfer(
    normalized,
    action.recipient as Address,
    action.amount!,
    action.memo || "",
  );

  if (result.success) {
    emitSpendApproved(systemId, action.amount!, action.recipient!, result.txHash);
    addServerDailySpend(systemId, String(action.amount));
    incrementSpendCount(systemId);
    updateServerTrustScore(systemId, {
      type: "success",
      description: `Executed ${action.amount} USDC: ${result.txHash}`,
      points: 2,
      timestamp: Date.now(),
    });

    appendServerActivity({
      type: "execution",
      systemId,
      systemName: system.name,
      message: `Executed ${action.amount} USDC on-chain`,
      details: result.txHash,
      severity: "success",
    });

    auditRecord.txHash = result.txHash;
    const store = getServerStore();
    store.auditLog = store.auditLog.map((r) =>
      r.id === auditRecord.id ? { ...r, txHash: result.txHash } : r,
    );
    const { saveServerStore } = await import("@/lib/server/store");
    saveServerStore(store);

    await maybeTriggerReport(systemId);
    return { executed: true, txHash: result.txHash };
  }

  const reason = result.error || "Execution failed";
  emitSpendBlocked(systemId, action.amount!, action.recipient!, reason);
  updateServerTrustScore(systemId, {
    type: "blocked",
    description: reason,
    points: -2,
    timestamp: Date.now(),
  });
  appendServerActivity({
    type: "execution",
    systemId,
    systemName: system.name,
    message: `Execution failed: ${reason}`,
    severity: "error",
  });
  return { executed: false, blocked: reason };
}

/** Execute a previously approved pending spend request */
export async function executeApprovedSpend(
  systemId: string,
  approvalId: string,
): Promise<{ executed: boolean; txHash?: string; blocked?: string }> {
  const store = getServerStore();
  const approval = store.approvalRequests?.find((a) => a.id === approvalId);
  if (!approval || approval.status !== "approved") {
    return { executed: false, blocked: "Approval not found or not approved" };
  }
  if (!approval.amount || !approval.recipient) {
    return { executed: false, blocked: "Invalid approval data" };
  }

  const action: AgentAction = {
    type: "spend",
    description: approval.description,
    amount: approval.amount,
    recipient: approval.recipient,
    memo: approval.description,
    reasoning: approval.reasoning,
    confidence: approval.confidence,
    priority: "high",
  };

  const system = getServerSystem(systemId)!;
  const spendRequest = {
    amount: String(action.amount),
    token: "USDC",
    recipient: action.recipient!,
    memo: action.memo || action.description,
  };

  // CFO already approved — skip Venice re-audit, record human gate pass
  const auditRecord: AuditRecord = {
    id: crypto.randomUUID(),
    systemId,
    systemName: system.name,
    spendRequest,
    verdict: {
      decision: "approved",
      confidence: 1,
      reasoning: `CFO approved via approval queue (${approvalId}). Venice re-audit skipped per human gate.`,
      flags: ["cfo_approved", "human_gate"],
    },
    timestamp: Date.now(),
  };
  appendServerAudit(auditRecord);

  appendServerActivity({
    type: "audit",
    systemId,
    systemName: system.name,
    message: `CFO-approved spend: ${action.amount} USDC`,
    details: approval.description,
    severity: "success",
  });

  // Mark approval executed (idempotent)
  const approvalStore = getServerStore();
  approvalStore.approvalRequests = approvalStore.approvalRequests.map((a) =>
    a.id === approvalId ? { ...a, status: "executed" as const } : a,
  );
  const { saveServerStore } = await import("@/lib/server/store");
  saveServerStore(approvalStore);

  const result = await executeSpend(systemId, action, auditRecord);
  if (result.executed) {
    notifyApprovalExecuted(approval, result.txHash);
  }
  return result;
}

export async function runServerCycle(systemId: string): Promise<CycleResult> {
  await hydrateServerStore();
  const system = getServerSystem(systemId);
  if (!system) throw new Error(`System ${systemId} not found`);

  const state = buildState(systemId);
  const decision = await VeniceService.agentThink(state, system.customPrompt);

  const decisionRecord: DecisionRecord = {
    id: crypto.randomUUID(),
    systemId,
    timestamp: Date.now(),
    cycle: getServerStore().decisions.filter((d) => d.systemId === systemId).length + 1,
    state: {
      budget: state.budget,
      kpis: state.kpis.map((k) => ({
        name: k.name,
        current: k.current,
        target: k.target,
        status: k.status,
      })),
    },
    decision: {
      actions: decision.actions.map((a) => ({
        type: a.type,
        description: a.description,
        amount: a.amount,
        recipient: a.recipient,
        confidence: a.confidence,
      })),
      reasoning: decision.reasoning,
      confidence: decision.confidence,
    },
  };

  const outcomes: CycleResult["outcomes"] = [];

  for (const action of decision.actions) {
    if (action.type !== "spend" || !action.amount || !action.recipient) {
      outcomes.push({ action, executed: false, blocked: "Non-spend action skipped" });
      continue;
    }

    const autonomy = serverNeedsApproval(systemId, {
      type: "spend",
      amount: action.amount,
      recipient: action.recipient,
    });

    if (autonomy.needsApproval) {
      const pending = createServerApprovalRequest(systemId, {
        type: "spend",
        amount: action.amount,
        recipient: action.recipient,
        description: action.description,
        reasoning: autonomy.reason || action.reasoning,
        confidence: action.confidence,
      });

      outcomes.push({
        action,
        executed: false,
        blocked: autonomy.reason,
        pendingApprovalId: pending.id,
      });

      appendServerActivity({
        type: "execution",
        systemId,
        systemName: system.name,
        message: `Pending CFO approval: ${action.amount} USDC`,
        details: autonomy.reason,
        severity: "warning",
      });
      continue;
    }

    try {
      const { verdict, auditRecord } = await auditSpend(systemId, action, system.customPrompt);

      if (verdict.decision !== "approved") {
        outcomes.push({
          action,
          auditVerdict: verdict.decision,
          executed: false,
          blocked: verdict.reasoning,
        });
        continue;
      }

      const exec = await executeSpend(systemId, action, auditRecord);
      outcomes.push({
        action,
        auditVerdict: "approved",
        executed: exec.executed,
        txHash: exec.txHash,
        blocked: exec.blocked,
      });

      decisionRecord.outcome = exec.executed
        ? { success: true, txHash: exec.txHash }
        : { success: false, error: exec.blocked };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      emitAgentError(systemId, msg);
      outcomes.push({ action, executed: false, blocked: msg });
      decisionRecord.outcome = { success: false, error: msg };
    }
  }

  appendServerDecision(decisionRecord);

  appendServerActivity({
    type: "goal_progress",
    systemId,
    systemName: system.name,
    message: `Cycle complete: ${decision.actions.length} action(s)`,
    details: decision.reasoning.slice(0, 100),
    severity: "info",
  });

  // Structured log for observability / monitoring systems
  console.log(JSON.stringify({
    level: "info",
    event: "agent_cycle_completed",
    systemId,
    actions: decision.actions.length,
    outcomes: outcomes.map(o => ({ type: o.action.type, executed: o.executed, blocked: !!o.blocked })),
    timestamp: Date.now(),
  }));

  return { systemId, decision, decisionRecord, outcomes };
}
