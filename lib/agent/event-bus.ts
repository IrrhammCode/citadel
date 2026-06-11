// ─── Agent Event Bus ────────────────────────────────────────
// Inter-agent communication system

export type AgentEvent = {
  id: string;
  type: AgentEventType;
  source: string; // systemId
  target?: string; // systemId or "*" for broadcast
  data: Record<string, unknown>;
  timestamp: number;
  processed: boolean;
};

export type AgentEventType =
  | "spend.request"
  | "spend.approved"
  | "spend.blocked"
  | "budget.low"
  | "budget.exceeded"
  | "kpi.met"
  | "kpi.behind"
  | "trust.increased"
  | "trust.decreased"
  | "anomaly.detected"
  | "vendor.new"
  | "vendor.flagged"
  | "negotiate.request"
  | "negotiate.accepted"
  | "negotiate.rejected"
  | "report.generated"
  | "agent.started"
  | "agent.stopped"
  | "agent.error"
  | "system.alert"
  | "custom";

export type EventHandler = (event: AgentEvent) => void | Promise<void>;

// ─── Event Bus Class ────────────────────────────────────────

export class AgentEventBus {
  private static instance: AgentEventBus;
  private handlers: Map<AgentEventType, EventHandler[]> = new Map();
  private eventLog: AgentEvent[] = [];
  private maxLogSize = 1000;

  private constructor() {}

  static getInstance(): AgentEventBus {
    if (!AgentEventBus.instance) {
      AgentEventBus.instance = new AgentEventBus();
    }
    return AgentEventBus.instance;
  }

  // ── Subscribe ─────────────────────────────────────────────

  on(type: AgentEventType, handler: EventHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  // ── Unsubscribe ───────────────────────────────────────────

  off(type: AgentEventType, handler: EventHandler) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // ── Emit Event ────────────────────────────────────────────

  async emit(event: Omit<AgentEvent, "id" | "timestamp" | "processed">) {
    const fullEvent: AgentEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      processed: false,
    };

    // Add to log
    this.eventLog.push(fullEvent);
    if (this.eventLog.length > this.maxLogSize) {
      this.eventLog = this.eventLog.slice(-this.maxLogSize);
    }

    // Notify handlers
    const handlers = this.handlers.get(event.type) || [];
    for (const handler of handlers) {
      try {
        await handler(fullEvent);
      } catch (error) {
        console.error(`Event handler error for ${event.type}:`, error);
      }
    }

    // Mark as processed
    fullEvent.processed = true;

    return fullEvent;
  }

  // ── Get Events ────────────────────────────────────────────

  getEvents(filter?: {
    type?: AgentEventType;
    source?: string;
    target?: string;
    since?: number;
    limit?: number;
  }): AgentEvent[] {
    let events = [...this.eventLog];

    if (filter?.type) {
      events = events.filter((e) => e.type === filter.type);
    }
    if (filter?.source) {
      events = events.filter((e) => e.source === filter.source);
    }
    if (filter?.target) {
      events = events.filter(
        (e) => e.target === filter.target || e.target === "*",
      );
    }
    if (filter?.since) {
      events = events.filter((e) => e.timestamp >= filter.since!);
    }

    events.sort((a, b) => b.timestamp - a.timestamp);

    if (filter?.limit) {
      events = events.slice(0, filter.limit);
    }

    return events;
  }

  // ── Get Recent Events ─────────────────────────────────────

  getRecentEvents(limit: number = 50): AgentEvent[] {
    return this.getEvents({ limit });
  }

  // ── Clear Events ──────────────────────────────────────────

  clearEvents(olderThan?: number) {
    if (olderThan) {
      this.eventLog = this.eventLog.filter((e) => e.timestamp >= olderThan);
    } else {
      this.eventLog = [];
    }
  }

  // ── Get Stats ─────────────────────────────────────────────

  getStats() {
    const now = Date.now();
    const lastHour = now - 60 * 60 * 1000;
    const lastDay = now - 24 * 60 * 60 * 1000;

    return {
      total: this.eventLog.length,
      lastHour: this.eventLog.filter((e) => e.timestamp >= lastHour).length,
      lastDay: this.eventLog.filter((e) => e.timestamp >= lastDay).length,
      byType: this.eventLog.reduce(
        (acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
    };
  }
}

// ─── Quick Emit Functions ───────────────────────────────────

const bus = AgentEventBus.getInstance();

export function emitSpendRequest(
  source: string,
  amount: number,
  recipient: string,
  memo: string,
) {
  return bus.emit({
    type: "spend.request",
    source,
    data: { amount, recipient, memo },
  });
}

export function emitSpendApproved(
  source: string,
  amount: number,
  recipient: string,
  txHash: string,
) {
  return bus.emit({
    type: "spend.approved",
    source,
    data: { amount, recipient, txHash },
  });
}

export function emitSpendBlocked(
  source: string,
  amount: number,
  recipient: string,
  reason: string,
) {
  return bus.emit({
    type: "spend.blocked",
    source,
    data: { amount, recipient, reason },
  });
}

export function emitBudgetLow(source: string, remaining: number, threshold: number) {
  return bus.emit({
    type: "budget.low",
    source,
    data: { remaining, threshold },
  });
}

export function emitBudgetExceeded(source: string, spent: number, budget: number) {
  return bus.emit({
    type: "budget.exceeded",
    source,
    data: { spent, budget },
  });
}

export function emitKpiMet(source: string, kpiName: string, current: number, target: number) {
  return bus.emit({
    type: "kpi.met",
    source,
    data: { kpiName, current, target },
  });
}

export function emitKpiBehind(source: string, kpiName: string, current: number, target: number) {
  return bus.emit({
    type: "kpi.behind",
    source,
    data: { kpiName, current, target },
  });
}

export function emitTrustChanged(source: string, change: number, newScore: number) {
  return bus.emit({
    type: change > 0 ? "trust.increased" : "trust.decreased",
    source,
    data: { change, newScore },
  });
}

export function emitAnomalyDetected(
  source: string,
  anomalyType: string,
  description: string,
  severity: string,
) {
  return bus.emit({
    type: "anomaly.detected",
    source,
    data: { anomalyType, description, severity },
  });
}

export function emitNegotiateRequest(
  source: string,
  target: string,
  amount: number,
  reason: string,
) {
  return bus.emit({
    type: "negotiate.request",
    source,
    target,
    data: { amount, reason },
  });
}

export function emitAgentStarted(source: string) {
  return bus.emit({
    type: "agent.started",
    source,
    data: {},
  });
}

export function emitAgentStopped(source: string) {
  return bus.emit({
    type: "agent.stopped",
    source,
    data: {},
  });
}

export function emitAgentError(source: string, error: string) {
  return bus.emit({
    type: "agent.error",
    source,
    data: { error },
  });
}

export function emitSystemAlert(message: string, severity: "info" | "warning" | "critical") {
  return bus.emit({
    type: "system.alert",
    source: "system",
    target: "*",
    data: { message, severity },
  });
}

// ─── Subscribe Helpers ──────────────────────────────────────

export function onSpendApproved(handler: EventHandler) {
  bus.on("spend.approved", handler);
}

export function onSpendBlocked(handler: EventHandler) {
  bus.on("spend.blocked", handler);
}

export function onBudgetLow(handler: EventHandler) {
  bus.on("budget.low", handler);
}

export function onAnomalyDetected(handler: EventHandler) {
  bus.on("anomaly.detected", handler);
}

export function onNegotiateRequest(handler: EventHandler) {
  bus.on("negotiate.request", handler);
}

export function onSystemAlert(handler: EventHandler) {
  bus.on("system.alert", handler);
}
