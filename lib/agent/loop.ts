import { think, type AgentState, type AgentDecision, type AgentAction } from "./brain";
import { getKnowledgeForAgent } from "./knowledge";
import { recordDecision, updateDecisionOutcome, getMemoryContext } from "./memory";
import { AgentEventBus, emitAgentStarted, emitAgentStopped, emitAgentError, emitSpendRequest, emitSpendApproved, emitSpendBlocked, emitBudgetLow, emitKpiMet, emitKpiBehind, emitTrustChanged } from "./event-bus";
import { executeDelegatedTransfer } from "@/lib/metamask/execute";
import { getPermissionForSystem, updateTrustScore, updateBudgetAllocation } from "@/lib/storage";
import type { Address } from "viem";

// ─── Agent Loop ─────────────────────────────────────────────

export class AgentLoop {
  private systemId: string;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private lastCycle = 0;
  private cycleCount = 0;

  private onCycleStart?: (systemId: string, cycle: number) => void;
  private onCycleComplete?: (systemId: string, decision: AgentDecision) => void;
  private onError?: (systemId: string, error: Error) => void;
  private onActionExecute?: (systemId: string, action: AgentAction) => void;

  constructor(systemId: string, callbacks?: any) {
    this.systemId = systemId;
    this.onCycleStart = callbacks?.onCycleStart;
    this.onCycleComplete = callbacks?.onCycleComplete;
    this.onError = callbacks?.onError;
    this.onActionExecute = callbacks?.onActionExecute;
  }

  async start(intervalMinutes: number = 60) {
    if (this.isRunning) return;
    this.isRunning = true;
    emitAgentStarted(this.systemId);
    await this.runCycle();
    this.intervalId = setInterval(() => this.runCycle(), intervalMinutes * 60 * 1000);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.isRunning = false;
    emitAgentStopped(this.systemId);
  }

  async runCycle(): Promise<AgentDecision | null> {
    let decisionRecord: any = null;
    
    try {
      this.cycleCount++;
      this.onCycleStart?.(this.systemId, this.cycleCount);

      const state = await this.observe();
      const decision = await think(state);

      decisionRecord = recordDecision(
        this.systemId,
        this.cycleCount,
        { budget: state.budget, kpis: state.kpis.map(k => ({ name: k.name, current: k.current, target: k.target, status: k.status })) },
        { actions: decision.actions.map(a => ({ type: a.type, description: a.description, amount: a.amount, recipient: a.recipient, confidence: a.confidence })), reasoning: decision.reasoning, confidence: decision.confidence }
      );

      for (const action of decision.actions) {
        await this.act(action, decisionRecord);
      }

      await this.updateStateAfterActions(state, decision);
      this.lastCycle = Date.now();
      this.onCycleComplete?.(this.systemId, decision);

      return decision;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(this.systemId, err);
      emitAgentError(this.systemId, err.message);
      return null;
    }
  }

  private async observe(): Promise<AgentState> {
    const { getAuditLog, getTrustScore, getPermissionForSystem, getAllVendors, getAnomalies, getActivity } = await import("@/lib/storage");
    const { AUTONOMOUS_SYSTEMS } = await import("@/types/system");

    const system = AUTONOMOUS_SYSTEMS.find((s) => s.id === this.systemId);
    if (!system) throw new Error(`System ${this.systemId} not found`);

    const auditLog = getAuditLog();
    const systemAudits = auditLog.filter((a) => a.systemId === this.systemId);
    const totalSpent = systemAudits.filter((a) => a.verdict.decision === "approved").reduce((sum, a) => sum + parseFloat(a.spendRequest.amount), 0);

    const knowledge = getKnowledgeForAgent(this.systemId);
    const memoryContext = getMemoryContext(this.systemId);

    return {
      systemId: this.systemId,
      systemName: system.name,
      goal: system.goal || system.description,
      budget: { total: system.budget || 0, remaining: (system.budget || 0) - totalSpent, spent: totalSpent },
      kpis: (system.kpiTargets || []).map((kpi) => {
        const current = kpi.target * 0.8;
        const status = kpi.isHigherBetter ? (current >= kpi.target ? "met" : "behind") : (current <= kpi.target ? "met" : "behind");
        return { name: kpi.name, target: kpi.target, current, unit: kpi.unit, isHigherBetter: kpi.isHigherBetter, status };
      }),
      pendingTasks: [],
      recentTransactions: systemAudits.slice(-10).map((a) => ({ amount: parseFloat(a.spendRequest.amount), recipient: a.spendRequest.recipient, memo: a.spendRequest.memo, timestamp: a.timestamp, decision: a.verdict.decision })),
      knowledge: [...knowledge, ...memoryContext],
    };
  }

  private async act(action: AgentAction, decisionRecord: any) {
    this.onActionExecute?.(this.systemId, action);

    if (action.type === "spend") {
      await this.executeSpend(action, decisionRecord);
    }
  }

  private async executeSpend(action: AgentAction, decisionRecord: any) {
    if (!action.amount || !action.recipient) return;

    emitSpendRequest(this.systemId, action.amount, action.recipient, action.memo || "");

    const permission = getPermissionForSystem(this.systemId);
    if (!permission) {
      emitSpendBlocked(this.systemId, action.amount, action.recipient, "No permission");
      return;
    }

    const result = await executeDelegatedTransfer(
      permission,
      action.recipient as Address,
      action.amount,
      action.memo || "",
    );

    if (result.success) {
      emitSpendApproved(this.systemId, action.amount, action.recipient, result.txHash);
      updateBudgetAllocation(this.systemId, action.amount, "spend");
      updateDecisionOutcome(decisionRecord.id, { success: true, txHash: result.txHash });
      updateTrustScore(this.systemId, { type: "success", description: `Spend executed: ${result.txHash}`, points: 2, timestamp: Date.now() });
    } else {
      emitSpendBlocked(this.systemId, action.amount, action.recipient, result.error || "Execution failed");
      updateDecisionOutcome(decisionRecord.id, { success: false, error: result.error });
      updateTrustScore(this.systemId, { type: "failure", description: `Spend failed: ${result.error}`, points: -3, timestamp: Date.now() });
    }
  }

  private async updateStateAfterActions(state: AgentState, decision: AgentDecision) {
    // ... (same as before, but now with real execution feedback)
  }

  get status() {
    return { systemId: this.systemId, isRunning: this.isRunning, cycleCount: this.cycleCount, lastCycle: this.lastCycle };
  }
}

// ... (AgentManager remains the same)
export class AgentManager {
  private static instance: AgentManager;
  private agents: Map<string, AgentLoop> = new Map();

  static getInstance(): AgentManager {
    if (!AgentManager.instance) AgentManager.instance = new AgentManager();
    return AgentManager.instance;
  }

  startAgent(systemId: string, intervalMinutes?: number, callbacks?: any) {
    if (this.agents.has(systemId)) return this.agents.get(systemId)!;
    const agent = new AgentLoop(systemId, callbacks);
    this.agents.set(systemId, agent);
    agent.start(intervalMinutes);
    return agent;
  }

  stopAgent(systemId: string) {
    const agent = this.agents.get(systemId);
    if (agent) { agent.stop(); this.agents.delete(systemId); }
  }

  getAllStatus() {
    const statuses: Record<string, any> = {};
    for (const [id, agent] of this.agents) statuses[id] = agent.status;
    return statuses;
  }
}
