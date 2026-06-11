// ─── Agent Memory ───────────────────────────────────────────
// Persist agent decisions and learning history

export type DecisionRecord = {
  id: string;
  systemId: string;
  timestamp: number;
  cycle: number;
  state: {
    budget: { total: number; remaining: number; spent: number };
    kpis: { name: string; current: number; target: number; status: string }[];
  };
  decision: {
    actions: {
      type: string;
      description: string;
      amount?: number;
      recipient?: string;
      confidence: number;
    }[];
    reasoning: string;
    confidence: number;
  };
  outcome?: {
    success: boolean;
    txHash?: string;
    error?: string;
    trustScoreChange?: number;
  };
};

export type AgentMemoryStore = {
  decisions: DecisionRecord[];
  patterns: {
    id: string;
    systemId: string;
    pattern: string;
    frequency: number;
    lastSeen: number;
    confidence: number;
  }[];
  learnings: {
    id: string;
    systemId: string;
    lesson: string;
    source: string;
    timestamp: number;
  }[];
  lastUpdated: number;
};

const STORAGE_KEY = "***";

// ─── Storage ────────────────────────────────────────────────

function getStore(): AgentMemoryStore {
  if (typeof window === "undefined") {
    return { decisions: [], patterns: [], learnings: [], lastUpdated: 0 };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { decisions: [], patterns: [], learnings: [], lastUpdated: 0 };
  return JSON.parse(raw);
}

function saveStore(store: AgentMemoryStore) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("memory_updated"));
}

// ─── Record Decision ────────────────────────────────────────

export function recordDecision(
  systemId: string,
  cycle: number,
  state: DecisionRecord["state"],
  decision: DecisionRecord["decision"],
): DecisionRecord {
  const store = getStore();

  const record: DecisionRecord = {
    id: crypto.randomUUID(),
    systemId,
    timestamp: Date.now(),
    cycle,
    state,
    decision,
  };

  store.decisions.push(record);

  // Keep last 100 decisions per agent
  const agentDecisions = store.decisions.filter((d) => d.systemId === systemId);
  if (agentDecisions.length > 100) {
    const toRemove = agentDecisions.slice(0, agentDecisions.length - 100);
    store.decisions = store.decisions.filter((d) => !toRemove.includes(d));
  }

  store.lastUpdated = Date.now();
  saveStore(store);

  // Detect patterns
  detectPatterns(systemId);

  return record;
}

// ─── Update Outcome ─────────────────────────────────────────

export function updateDecisionOutcome(
  decisionId: string,
  outcome: DecisionRecord["outcome"],
) {
  const store = getStore();
  const decision = store.decisions.find((d) => d.id === decisionId);

  if (decision) {
    decision.outcome = outcome;
    store.lastUpdated = Date.now();
    saveStore(store);

    // Learn from outcome
    if (outcome) {
      learnFromOutcome(decision.systemId, decision, outcome);
    }
  }
}

// ─── Get Decisions ──────────────────────────────────────────

export function getDecisions(systemId: string, limit: number = 50): DecisionRecord[] {
  const store = getStore();
  return store.decisions
    .filter((d) => d.systemId === systemId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getRecentDecisions(limit: number = 20): DecisionRecord[] {
  const store = getStore();
  return store.decisions
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

// ─── Detect Patterns ────────────────────────────────────────

function detectPatterns(systemId: string) {
  const store = getStore();
  const decisions = store.decisions.filter((d) => d.systemId === systemId);

  if (decisions.length < 3) return;

  // Detect action patterns
  const actionCounts: Record<string, number> = {};
  for (const decision of decisions.slice(-20)) {
    for (const action of decision.decision.actions) {
      actionCounts[action.type] = (actionCounts[action.type] || 0) + 1;
    }
  }

  // Update patterns
  for (const [action, count] of Object.entries(actionCounts)) {
    const existing = store.patterns.find(
      (p) => p.systemId === systemId && p.pattern === `frequent_${action}`,
    );

    if (existing) {
      existing.frequency = count;
      existing.lastSeen = Date.now();
      existing.confidence = Math.min(100, existing.confidence + 5);
    } else if (count >= 3) {
      store.patterns.push({
        id: crypto.randomUUID(),
        systemId,
        pattern: `frequent_${action}`,
        frequency: count,
        lastSeen: Date.now(),
        confidence: 50,
      });
    }
  }

  // Detect spending patterns
  const spendActions = decisions
    .flatMap((d) => d.decision.actions)
    .filter((a) => a.type === "spend" && a.amount);

  if (spendActions.length >= 5) {
    const avgAmount = spendActions.reduce((sum, a) => sum + (a.amount || 0), 0) / spendActions.length;
    const existing = store.patterns.find(
      (p) => p.systemId === systemId && p.pattern === "avg_spend",
    );

    if (existing) {
      existing.frequency = avgAmount;
      existing.lastSeen = Date.now();
    } else {
      store.patterns.push({
        id: crypto.randomUUID(),
        systemId,
        pattern: "avg_spend",
        frequency: avgAmount,
        lastSeen: Date.now(),
        confidence: 70,
      });
    }
  }

  store.lastUpdated = Date.now();
  saveStore(store);
}

// ─── Learn from Outcome ─────────────────────────────────────

function learnFromOutcome(
  systemId: string,
  decision: DecisionRecord,
  outcome: DecisionRecord["outcome"],
) {
  const store = getStore();

  if (!outcome) return;

  // Learn from success
  if (outcome.success) {
    const action = decision.decision.actions[0];
    if (action) {
      store.learnings.push({
        id: crypto.randomUUID(),
        systemId,
        lesson: `Successful ${action.type}: ${action.description} (confidence: ${action.confidence})`,
        source: decision.id,
        timestamp: Date.now(),
      });
    }
  }

  // Learn from failure
  if (!outcome.success && outcome.error) {
    store.learnings.push({
      id: crypto.randomUUID(),
      systemId,
      lesson: `Failed action: ${outcome.error}`,
      source: decision.id,
      timestamp: Date.now(),
    });
  }

  // Learn from trust score changes
  if (outcome.trustScoreChange && Math.abs(outcome.trustScoreChange) > 5) {
    store.learnings.push({
      id: crypto.randomUUID(),
      systemId,
      lesson: `Trust score ${outcome.trustScoreChange > 0 ? "increased" : "decreased"} by ${Math.abs(outcome.trustScoreChange)}`,
      source: decision.id,
      timestamp: Date.now(),
    });
  }

  // Keep last 50 learnings per agent
  const agentLearnings = store.learnings.filter((l) => l.systemId === systemId);
  if (agentLearnings.length > 50) {
    const toRemove = agentLearnings.slice(0, agentLearnings.length - 50);
    store.learnings = store.learnings.filter((l) => !toRemove.includes(l));
  }

  store.lastUpdated = Date.now();
  saveStore(store);
}

// ─── Get Patterns ───────────────────────────────────────────

export function getPatterns(systemId: string) {
  const store = getStore();
  return store.patterns.filter((p) => p.systemId === systemId);
}

export function getAllPatterns() {
  return getStore().patterns;
}

// ─── Get Learnings ──────────────────────────────────────────

export function getLearnings(systemId: string, limit: number = 20) {
  const store = getStore();
  return store.learnings
    .filter((l) => l.systemId === systemId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function getAllLearnings(limit: number = 50) {
  const store = getStore();
  return store.learnings
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

// ─── Get Memory Context (for Agent Brain) ───────────────────

export function getMemoryContext(systemId: string): string[] {
  const store = getStore();
  const context: string[] = [];

  // Add recent patterns
  const patterns = store.patterns.filter((p) => p.systemId === systemId);
  if (patterns.length > 0) {
    context.push("PATTERNS DETECTED:");
    for (const p of patterns) {
      context.push(`- ${p.pattern}: frequency ${p.frequency}, confidence ${p.confidence}%`);
    }
  }

  // Add recent learnings
  const learnings = store.learnings
    .filter((l) => l.systemId === systemId)
    .slice(-5);
  if (learnings.length > 0) {
    context.push("RECENT LEARNINGS:");
    for (const l of learnings) {
      context.push(`- ${l.lesson}`);
    }
  }

  // Add recent decision outcomes
  const recentDecisions = store.decisions
    .filter((d) => d.systemId === systemId && d.outcome)
    .slice(-3);
  if (recentDecisions.length > 0) {
    context.push("RECENT OUTCOMES:");
    for (const d of recentDecisions) {
      const outcome = d.outcome!;
      context.push(
        `- ${outcome.success ? "✅" : "❌"} ${d.decision.actions[0]?.type || "unknown"}: ${outcome.success ? "success" : outcome.error}`,
      );
    }
  }

  return context;
}

// ─── Clear Memory ───────────────────────────────────────────

export function clearMemory(systemId: string) {
  const store = getStore();
  store.decisions = store.decisions.filter((d) => d.systemId !== systemId);
  store.patterns = store.patterns.filter((p) => p.systemId !== systemId);
  store.learnings = store.learnings.filter((l) => l.systemId !== systemId);
  store.lastUpdated = Date.now();
  saveStore(store);
}

export function clearAllMemory() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("memory_updated"));
}
