import { think, type AgentState, type AgentDecision, type AgentAction } from "./brain";
import { getKnowledgeForAgent } from "./knowledge";
import { recordDecision, updateDecisionOutcome, getMemoryContext } from "./memory";
import { AgentEventBus, emitAgentStarted, emitAgentStopped, emitAgentError, emitSpendRequest, emitSpendApproved, emitSpendBlocked, emitBudgetLow, emitKpiMet, emitKpiBehind, emitTrustChanged } from "./event-bus";

// ─── Agent Loop ─────────────────────────────────────────────

export class AgentLoop {
  private systemId: string;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private lastCycle = 0;
  private cycleCount = 0;

  // Callbacks for UI updates
  private onCycleStart?: (systemId: string, cycle: number) => void;
  private onCycleComplete?: (systemId: string, decision: AgentDecision) => void;
  private onError?: (systemId: string, error: Error) => void;
  private onActionExecute?: (systemId: string, action: AgentAction) => void;

  constructor(systemId: string, callbacks?: {
    onCycleStart?: (systemId: string, cycle: number) => void;
    onCycleComplete?: (systemId: string, decision: AgentDecision) => void;
    onError?: (systemId: string, error: Error) => void;
    onActionExecute?: (systemId: string, action: AgentAction) => void;
  }) {
    this.systemId = systemId;
    this.onCycleStart = callbacks?.onCycleStart;
    this.onCycleComplete = callbacks?.onCycleComplete;
    this.onError = callbacks?.onError;
    this.onActionExecute = callbacks?.onActionExecute;
  }

  // ── Start Loop ────────────────────────────────────────────

  async start(intervalMinutes: number = 60) {
    if (this.isRunning) {
      console.warn(`Agent ${this.systemId} is already running`);
      return;
    }

    this.isRunning = true;
    emitAgentStarted(this.systemId);
    console.log(`🚀 Agent ${this.systemId} started (interval: ${intervalMinutes}min)`);

    // Run first cycle immediately
    await this.runCycle();

    // Schedule subsequent cycles
    this.intervalId = setInterval(async () => {
      await this.runCycle();
    }, intervalMinutes * 60 * 1000);
  }

  // ── Stop Loop ─────────────────────────────────────────────

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    emitAgentStopped(this.systemId);
    console.log(`⏹️ Agent ${this.systemId} stopped`);
  }

  // ── Run Single Cycle ──────────────────────────────────────

  async runCycle(): Promise<AgentDecision | null> {
    let decisionRecord: any = null;
    
    try {
      this.cycleCount++;
      this.onCycleStart?.(this.systemId, this.cycleCount);

      // 1. OBSERVE — gather state
      const state = await this.observe();

      // 2. THINK — decide actions
      const decision = await think(state);

      // 3. Record decision in memory
      decisionRecord = recordDecision(
        this.systemId,
        this.cycleCount,
        {
          budget: state.budget,
          kpis: state.kpis.map((k) => ({
            name: k.name,
            current: k.current,
            target: k.target,
            status: k.status,
          })),
        },
        {
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
      );

      // 4. ACT — execute actions
      for (const action of decision.actions) {
        await this.act(action);
      }

      // 5. Update state based on actions
      await this.updateStateAfterActions(state, decision);

      // 6. UPDATE — record cycle
      this.lastCycle = Date.now();
      this.onCycleComplete?.(this.systemId, decision);

      console.log(`✅ Agent ${this.systemId} cycle ${this.cycleCount} complete:`, {
        actions: decision.actions.length,
        reasoning: decision.reasoning.slice(0, 100) + "...",
      });

      return decision;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onError?.(this.systemId, err);
      emitAgentError(this.systemId, err.message);
      console.error(`❌ Agent ${this.systemId} cycle failed:`, err);
      return null;
    }
  }

  // ── Update State After Actions ────────────────────────────

  private async updateStateAfterActions(state: AgentState, decision: AgentDecision) {
    const { updateTrustScore, addActivity, addAnomaly, updateVendorProfile, getAuditLog } = await import("@/lib/storage");

    // Update trust score based on decision confidence
    const trustChange = decision.confidence > 0.8 ? 2 : decision.confidence > 0.6 ? 1 : -1;
    const trustEvent = {
      type: decision.confidence > 0.7 ? "success" as const : "suspicious" as const,
      description: `Agent cycle ${this.cycleCount}: ${decision.actions.length} actions, confidence ${(decision.confidence * 100).toFixed(0)}%`,
      points: trustChange,
      timestamp: Date.now(),
    };
    const newTrustScore = updateTrustScore(this.systemId, trustEvent);
    emitTrustChanged(this.systemId, trustChange, newTrustScore.score);

    // Check budget thresholds
    const budgetUsage = state.budget.spent / state.budget.total;
    if (budgetUsage > 0.9) {
      emitBudgetLow(this.systemId, state.budget.remaining, state.budget.total * 0.1);
    }

    // Check KPI status
    for (const kpi of state.kpis) {
      if (kpi.status === "met") {
        emitKpiMet(this.systemId, kpi.name, kpi.current, kpi.target);
      } else if (kpi.status === "behind") {
        emitKpiBehind(this.systemId, kpi.name, kpi.current, kpi.target);
      }
    }

    // Record activity for each action
    for (const action of decision.actions) {
      addActivity({
        systemId: this.systemId,
        systemName: state.systemName,
        type: "execution",
        message: `${action.type}: ${action.description}`,
        severity: "info",
        metadata: {
          confidence: decision.confidence,
          reasoning: action.reasoning,
          amount: action.amount,
        },
      });

      // Update vendor profile if spend action
      if (action.type === "spend" && action.recipient && action.amount) {
        updateVendorProfile(action.recipient, action.amount);
      }
    }

    // Check for anomalies
    if (decision.actions.some((a) => a.type === "spend" && a.amount && a.amount > state.budget.remaining * 0.5)) {
      addAnomaly({
        id: crypto.randomUUID(),
        systemId: this.systemId,
        type: "amount_spike",
        description: `Agent requested spend > 50% of remaining budget`,
        severity: "high",
        amount: decision.actions.find((a) => a.type === "spend")?.amount || 0,
        recipient: decision.actions.find((a) => a.type === "spend")?.recipient || "",
        timestamp: Date.now(),
        resolved: false,
      });
    }
  }

  // ── Observe ───────────────────────────────────────────────

  private async observe(): Promise<AgentState> {
    // Get system data from storage
    const { getAuditLog, getTrustScore, getPermissionForSystem, getAllVendors, getAnomalies, getActivity } = await import("@/lib/storage");
    const { AUTONOMOUS_SYSTEMS } = await import("@/types/system");

    const system = AUTONOMOUS_SYSTEMS.find((s) => s.id === this.systemId);
    if (!system) throw new Error(`System ${this.systemId} not found`);

    const auditLog = getAuditLog();
    const systemAudits = auditLog.filter((a) => a.systemId === this.systemId);
    const totalSpent = systemAudits
      .filter((a) => a.verdict.decision === "approved")
      .reduce((sum, a) => sum + parseFloat(a.spendRequest.amount), 0);

    const permission = getPermissionForSystem(this.systemId);

    // Get knowledge base + memory context
    const knowledge = getKnowledgeForAgent(this.systemId);
    const memoryContext = getMemoryContext(this.systemId);

    // Get vendor profiles for context
    const vendors = getAllVendors();
    const topVendors = vendors
      .sort((a, b) => b.transactionCount - a.transactionCount)
      .slice(0, 5);

    // Get recent anomalies
    const anomalies = getAnomalies(this.systemId).filter((a) => !a.resolved);

    // Get recent activity
    const recentActivity = getActivity(10);

    // Build market context from vendors and anomalies
    let marketContext = "";
    if (topVendors.length > 0) {
      marketContext += "TOP VENDORS:\n";
      for (const v of topVendors) {
        marketContext += `- ${v.name}: ${v.transactionCount} txs, avg ${v.averageAmount.toFixed(2)} USDC, risk: ${v.riskLevel}\n`;
      }
    }
    if (anomalies.length > 0) {
      marketContext += "\nACTIVE ANOMALIES:\n";
      for (const a of anomalies.slice(0, 3)) {
        marketContext += `- ${a.type}: ${a.description} (severity: ${a.severity})\n`;
      }
    }

    // Build state
    const state: AgentState = {
      systemId: this.systemId,
      systemName: system.name,
      goal: system.goal || system.description,
      budget: {
        total: system.budget || 0,
        remaining: (system.budget || 0) - totalSpent,
        spent: totalSpent,
      },
      kpis: (system.kpiTargets || []).map((kpi) => {
        // Simulate current values (in real app, these would come from actual tracking)
        const current = kpi.name === "ROI" ? 1.8 :
          kpi.name === "Vendor Diversity" ? 2 :
            kpi.name === "Uptime" ? 99.5 :
              kpi.name === "On-time Payments" ? 95 :
                kpi.target * 0.8; // Default to 80% of target

        const status = kpi.isHigherBetter
          ? (current >= kpi.target ? "met" : "behind")
          : (current <= kpi.target ? "met" : "behind");

        return {
          name: kpi.name,
          target: kpi.target,
          current,
          unit: kpi.unit,
          isHigherBetter: kpi.isHigherBetter,
          status,
        };
      }),
      pendingTasks: [], // Would come from task queue
      recentTransactions: systemAudits.slice(-10).map((a) => ({
        amount: parseFloat(a.spendRequest.amount),
        recipient: a.spendRequest.recipient,
        memo: a.spendRequest.memo,
        timestamp: a.timestamp,
        decision: a.verdict.decision,
      })),
      knowledge: [...knowledge, ...memoryContext],
      marketContext: marketContext || undefined,
    };

    return state;
  }

  // ── Act ───────────────────────────────────────────────────

  private async act(action: AgentAction) {
    this.onActionExecute?.(this.systemId, action);

    switch (action.type) {
      case "spend":
        await this.executeSpend(action);
        break;
      case "negotiate":
        await this.executeNegotiate(action);
        break;
      case "report":
        await this.executeReport(action);
        break;
      case "onboard_vendor":
        await this.executeOnboardVendor(action);
        break;
      case "wait":
        console.log(`⏳ Agent ${this.systemId}: Waiting — ${action.reasoning}`);
        break;
      case "custom":
        console.log(`🔧 Agent ${this.systemId}: Custom action — ${action.description}`);
        break;
    }
  }

  // ── Execute Spend ─────────────────────────────────────────

  private async executeSpend(action: AgentAction) {
    if (!action.amount || !action.recipient) {
      console.warn(`⚠️ Spend action missing amount or recipient`);
      return;
    }

    // Emit spend request event
    emitSpendRequest(this.systemId, action.amount, action.recipient, action.memo || "");

    // In production, this would submit to the audit API
    console.log(`💰 Agent ${this.systemId}: Spending ${action.amount} USDC to ${action.recipient}`, {
      memo: action.memo,
      reasoning: action.reasoning,
    });

    // Simulate approval (in real app, this would go through Venice AI audit)
    const approved = action.confidence > 0.7;
    if (approved) {
      emitSpendApproved(this.systemId, action.amount, action.recipient, "0x" + crypto.randomUUID().replace(/-/g, "").slice(0, 64));
    } else {
      emitSpendBlocked(this.systemId, action.amount, action.recipient, "Low confidence decision");
    }
  }

  // ── Execute Negotiate ─────────────────────────────────────

  private async executeNegotiate(action: AgentAction) {
    console.log(`🤝 Agent ${this.systemId}: Negotiating — ${action.description}`);
    
    // In production, this would initiate negotiation with another agent
    const bus = AgentEventBus.getInstance();
    await bus.emit({
      type: "negotiate.request",
      source: this.systemId,
      data: {
        description: action.description,
        amount: action.amount,
        reasoning: action.reasoning,
      },
    });
  }

  // ── Execute Report ────────────────────────────────────────

  private async executeReport(action: AgentAction) {
    console.log(`📊 Agent ${this.systemId}: Generating report — ${action.description}`);
    
    // In production, this would generate a real report
    const { addActivity } = await import("@/lib/storage");
    const { AUTONOMOUS_SYSTEMS } = await import("@/types/system");
    const system = AUTONOMOUS_SYSTEMS.find((s) => s.id === this.systemId);
    
    addActivity({
      systemId: this.systemId,
      systemName: system?.name || this.systemId,
      type: "report",
      message: `Report generated: ${action.description}`,
      severity: "success",
    });
  }

  // ── Execute Onboard Vendor ────────────────────────────────

  private async executeOnboardVendor(action: AgentAction) {
    console.log(`👤 Agent ${this.systemId}: Onboarding vendor — ${action.description}`);
    
    // In production, this would onboard a new vendor
    const bus = AgentEventBus.getInstance();
    await bus.emit({
      type: "vendor.new",
      source: this.systemId,
      data: {
        description: action.description,
        recipient: action.recipient,
      },
    });
  }

  // ── Getters ───────────────────────────────────────────────

  get status() {
    return {
      systemId: this.systemId,
      isRunning: this.isRunning,
      cycleCount: this.cycleCount,
      lastCycle: this.lastCycle,
    };
  }
}

// ─── Agent Manager (Singleton) ──────────────────────────────

export class AgentManager {
  private static instance: AgentManager;
  private agents: Map<string, AgentLoop> = new Map();

  private constructor() {}

  static getInstance(): AgentManager {
    if (!AgentManager.instance) {
      AgentManager.instance = new AgentManager();
    }
    return AgentManager.instance;
  }

  // ── Start Agent ───────────────────────────────────────────

  startAgent(systemId: string, intervalMinutes?: number, callbacks?: {
    onCycleStart?: (systemId: string, cycle: number) => void;
    onCycleComplete?: (systemId: string, decision: any) => void;
    onError?: (systemId: string, error: Error) => void;
    onActionExecute?: (systemId: string, action: any) => void;
  }) {
    if (this.agents.has(systemId)) {
      console.warn(`Agent ${systemId} already exists`);
      return this.agents.get(systemId)!;
    }

    const agent = new AgentLoop(systemId, callbacks);
    this.agents.set(systemId, agent);
    agent.start(intervalMinutes);
    return agent;
  }

  // ── Stop Agent ────────────────────────────────────────────

  stopAgent(systemId: string) {
    const agent = this.agents.get(systemId);
    if (agent) {
      agent.stop();
      this.agents.delete(systemId);
    }
  }

  // ── Stop All ──────────────────────────────────────────────

  stopAll() {
    for (const [id, agent] of this.agents) {
      agent.stop();
    }
    this.agents.clear();
  }

  // ── Get Agent ─────────────────────────────────────────────

  getAgent(systemId: string): AgentLoop | undefined {
    return this.agents.get(systemId);
  }

  // ── Get All Status ────────────────────────────────────────

  getAllStatus() {
    const statuses: Record<string, any> = {};
    for (const [id, agent] of this.agents) {
      statuses[id] = agent.status;
    }
    return statuses;
  }
}
