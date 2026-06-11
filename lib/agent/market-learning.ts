import { randomUUID } from "crypto";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface MarketSignal {
  type: "crypto_price" | "gas_price" | "vendor_pricing" | "yield_rate";
  value: number;
  timestamp: number;
  source: string;
}

export interface LearningInsight {
  id: string;
  insight: string;
  confidence: number;
  source: string;
  appliedAt?: number;
}

export interface AgentAdaptation {
  systemId: string;
  originalStrategy: string;
  newStrategy: string;
  reason: string;
  timestamp: number;
}

// ──────────────────────────────────────────────
// In-memory stores (swap for DB in production)
// ──────────────────────────────────────────────

const signalStore: MarketSignal[] = [];
const insightStore: LearningInsight[] = [];
const adaptationStore: AgentAdaptation[] = [];

// ──────────────────────────────────────────────
// 1. collectMarketSignals
// ──────────────────────────────────────────────

/**
 * Collects market signals from configured data sources.
 * In production this would hit real APIs (CoinGecko, Etherscan, etc.).
 */
export async function collectMarketSignals(): Promise<MarketSignal[]> {
  const now = Date.now();

  const sources: Array<{
    type: MarketSignal["type"];
    source: string;
    fetch: () => Promise<number>;
  }> = [
    {
      type: "crypto_price",
      source: "coingecko",
      async fetch() {
        // Placeholder – replace with real API call
        return 2500 + Math.random() * 500;
      },
    },
    {
      type: "gas_price",
      source: "etherscan",
      async fetch() {
        return 15 + Math.random() * 80;
      },
    },
    {
      type: "vendor_pricing",
      source: "openai",
      async fetch() {
        return 0.002 + Math.random() * 0.005;
      },
    },
    {
      type: "yield_rate",
      source: "aave",
      async fetch() {
        return 2 + Math.random() * 8;
      },
    },
  ];

  const signals: MarketSignal[] = await Promise.all(
    sources.map(async (s) => ({
      type: s.type,
      value: Number((await s.fetch()).toFixed(6)),
      timestamp: now,
      source: s.source,
    })),
  );

  signalStore.push(...signals);
  return signals;
}

// ──────────────────────────────────────────────
// 2. analyzeMarketTrends
// ──────────────────────────────────────────────

interface TrendResult {
  type: MarketSignal["type"];
  direction: "up" | "down" | "stable";
  changePercent: number;
  avgValue: number;
  sampleCount: number;
}

/**
 * Analyses recent signals and returns a per-type trend summary.
 */
export function analyzeMarketTrends(
  lookbackMs: number = 60 * 60 * 1000,
): TrendResult[] {
  const cutoff = Date.now() - lookbackMs;
  const recent = signalStore.filter((s) => s.timestamp >= cutoff);

  const grouped = new Map<MarketSignal["type"], MarketSignal[]>();
  for (const s of recent) {
    const arr = grouped.get(s.type) ?? [];
    arr.push(s);
    grouped.set(s.type, arr);
  }

  const results: TrendResult[] = [];
  for (const [type, signals] of grouped) {
    if (signals.length === 0) continue;

    const sorted = [...signals].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0].value;
    const last = sorted[sorted.length - 1].value;
    const avgValue =
      sorted.reduce((sum, s) => sum + s.value, 0) / sorted.length;
    const changePercent = first === 0 ? 0 : ((last - first) / first) * 100;

    let direction: TrendResult["direction"] = "stable";
    if (Math.abs(changePercent) > 2) {
      direction = changePercent > 0 ? "up" : "down";
    }

    results.push({ type, direction, changePercent, avgValue, sampleCount: signals.length });
  }

  return results;
}

// ──────────────────────────────────────────────
// 3. generateInsights
// ──────────────────────────────────────────────

/**
 * Turns trend data into actionable learning insights.
 */
export function generateInsights(trends?: TrendResult[]): LearningInsight[] {
  const resolvedTrends = trends ?? analyzeMarketTrends();

  const insightMap: Record<
    string,
    (t: TrendResult) => LearningInsight | null
  > = {
    crypto_price: (t) =>
      Math.abs(t.changePercent) > 5
        ? insight(
            `ETH price ${t.direction === "up" ? "surged" : "dropped"} ${Math.abs(t.changePercent).toFixed(1)}% — consider ${t.direction === "up" ? "locking profits" : "buying the dip"}.`,
            0.7 + Math.min(Math.abs(t.changePercent) / 100, 0.25),
            "crypto_trend",
          )
        : null,

    gas_price: (t) =>
      t.avgValue > 50
        ? insight(
            `Gas is high (${t.avgValue.toFixed(0)} gwei avg). Defer non-urgent on-chain ops or batch transactions.`,
            0.8,
            "gas_monitor",
          )
        : t.avgValue < 20
          ? insight(
              `Gas is low (${t.avgValue.toFixed(0)} gwei avg). Good window for on-chain transactions.`,
              0.75,
              "gas_monitor",
            )
          : null,

    vendor_pricing: (t) =>
      t.direction === "up" && Math.abs(t.changePercent) > 10
        ? insight(
            `Vendor pricing up ${t.changePercent.toFixed(1)}%. Switch to cheaper model or reduce call frequency.`,
            0.7,
            "vendor_cost",
          )
        : null,

    yield_rate: (t) =>
      t.direction === "up"
        ? insight(
            `Yield rates trending up (${t.avgValue.toFixed(2)}% avg). Good time to deploy capital.`,
            0.65,
            "yield_optimizer",
          )
        : null,
  };

  const newInsights: LearningInsight[] = [];

  for (const trend of resolvedTrends) {
    const generator = insightMap[trend.type];
    if (!generator) continue;
    const result = generator(trend);
    if (result) newInsights.push(result);
  }

  insightStore.push(...newInsights);
  return newInsights;

  // helper
  function insight(
    text: string,
    confidence: number,
    source: string,
  ): LearningInsight {
    return { id: randomUUID(), insight: text, confidence, source };
  }
}

// ──────────────────────────────────────────────
// 4. adaptAgentStrategy
// ──────────────────────────────────────────────

const strategyRules: Array<{
  match: (insight: LearningInsight) => boolean;
  adaptation: (
    insight: LearningInsight,
  ) => Omit<AgentAdaptation, "timestamp">;
}> = [
  {
    match: (i) => i.source === "gas_monitor" && i.insight.includes("high"),
    adaptation: () => ({
      systemId: "tx-scheduler",
      originalStrategy: "immediate",
      newStrategy: "batch-and-wait",
      reason: "High gas costs detected — batching transactions to reduce fees.",
    }),
  },
  {
    match: (i) => i.source === "gas_monitor" && i.insight.includes("low"),
    adaptation: () => ({
      systemId: "tx-scheduler",
      originalStrategy: "batch-and-wait",
      newStrategy: "immediate",
      reason: "Low gas window — executing pending transactions now.",
    }),
  },
  {
    match: (i) => i.source === "vendor_cost",
    adaptation: () => ({
      systemId: "llm-router",
      originalStrategy: "premium-model",
      newStrategy: "cost-optimized-model",
      reason: "Vendor pricing increased — routing to cheaper model.",
    }),
  },
  {
    match: (i) => i.source === "yield_optimizer" && i.insight.includes("trending up"),
    adaptation: () => ({
      systemId: "capital-deployer",
      originalStrategy: "hold",
      newStrategy: "deploy-to-yield",
      reason: "Rising yield rates — deploying idle capital.",
    }),
  },
  {
    match: (i) => i.source === "crypto_trend" && i.insight.includes("dropped"),
    adaptation: () => ({
      systemId: "portfolio-manager",
      originalStrategy: "hold",
      newStrategy: "accumulate",
      reason: "Crypto price dropped significantly — accumulating at lower prices.",
    }),
  },
];

/**
 * Applies adaptation rules to recent insights that haven't been applied yet.
 */
export function adaptAgentStrategy(
  insights?: LearningInsight[],
): AgentAdaptation[] {
  const candidates = (insights ?? insightStore).filter((i) => !i.appliedAt);
  const adaptations: AgentAdaptation[] = [];

  for (const ins of candidates) {
    for (const rule of strategyRules) {
      if (rule.match(ins)) {
        const adapt = rule.adaptation(ins);
        const record: AgentAdaptation = { ...adapt, timestamp: Date.now() };
        adaptations.push(record);
        ins.appliedAt = record.timestamp;
      }
    }
  }

  adaptationStore.push(...adaptations);
  return adaptations;
}

// ──────────────────────────────────────────────
// 5. getLearningHistory
// ──────────────────────────────────────────────

export interface LearningHistory {
  signals: MarketSignal[];
  insights: LearningInsight[];
  adaptations: AgentAdaptation[];
}

/**
 * Returns the full learning history, optionally filtered by time window.
 */
export function getLearningHistory(
  options?: { since?: number; limit?: number },
): LearningHistory {
  const since = options?.since ?? 0;
  const limit = options?.limit ?? 100;

  return {
    signals: signalStore.filter((s) => s.timestamp >= since).slice(-limit),
    insights: insightStore.slice(-limit),
    adaptations: adaptationStore.filter((a) => a.timestamp >= since).slice(-limit),
  };
}

// ──────────────────────────────────────────────
// Convenience: run a full learning cycle
// ──────────────────────────────────────────────

export async function runLearningCycle(): Promise<{
  signals: MarketSignal[];
  trends: TrendResult[];
  insights: LearningInsight[];
  adaptations: AgentAdaptation[];
}> {
  const signals = await collectMarketSignals();
  const trends = analyzeMarketTrends();
  const insights = generateInsights(trends);
  const adaptations = adaptAgentStrategy(insights);

  return { signals, trends, insights, adaptations };
}
