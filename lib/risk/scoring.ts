// ──────────────────────────────────────────────────────────────────────────────
// Citadel — Real-time Risk Scoring
// Evaluates transaction risk using multiple weighted factors.
// ──────────────────────────────────────────────────────────────────────────────

// ── Types ────────────────────────────────────────────────────────────────────

export interface RiskFactor {
  name: string;
  weight: number; // 0-1, how much this factor contributes
  score: number; // 0-100, individual risk score
  description: string;
}

export type RiskLevel = "low" | "medium" | "high" | "critical";

export interface RiskAssessment {
  systemId: string;
  transactionId: string;
  overallScore: number;
  level: RiskLevel;
  factors: RiskFactor[];
  timestamp: number;
}

export interface TransactionInput {
  transactionId: string;
  systemId: string;
  amount: number; // in base currency units
  recipientAddress: string;
  senderAddress: string;
  timestamp?: number; // defaults to Date.now()
  metadata?: {
    knownRecipients?: string[]; // addresses the sender has transacted with before
    recentTransactionCount?: number; // count of transactions in the last hour
    averageAmount?: number; // sender's typical transaction amount
    vendorTrustScore?: number; // 0-100, pre-computed vendor trust
    normalTransactionHours?: [number, number]; // e.g. [8, 22] for 8am-10pm
  };
}

// ── In-memory history store ──────────────────────────────────────────────────

const riskHistory: Map<string, RiskAssessment[]> = new Map();

// ── Risk factor evaluators ───────────────────────────────────────────────────

function evaluateAmountRisk(amount: number, averageAmount?: number): RiskFactor {
  let score = 0;

  if (amount > 100_000) score = 90;
  else if (amount > 50_000) score = 70;
  else if (amount > 10_000) score = 50;
  else if (amount > 1_000) score = 30;
  else score = 10;

  // If we know the average, boost score for outliers
  if (averageAmount && averageAmount > 0) {
    const ratio = amount / averageAmount;
    if (ratio > 5) score = Math.min(100, score + 30);
    else if (ratio > 3) score = Math.min(100, score + 15);
    else if (ratio < 0.1) score = Math.min(100, score + 10); // unusually small
  }

  return {
    name: "amount",
    weight: 0.25,
    score,
    description: `Transaction amount ${amount} evaluates to risk ${score}/100`,
  };
}

function evaluateRecipientRisk(
  recipientAddress: string,
  knownRecipients: string[] = []
): RiskFactor {
  const known = knownRecipients.some(
    (addr) => addr.toLowerCase() === recipientAddress.toLowerCase()
  );

  const score = known ? 10 : 75;

  return {
    name: "recipient",
    weight: 0.2,
    score,
    description: known
      ? `Recipient ${recipientShort(recipientAddress)} is a known address`
      : `Recipient ${recipientShort(recipientAddress)} is unknown — high risk`,
  };
}

function evaluateFrequencyRisk(recentTransactionCount: number): RiskFactor {
  let score = 0;

  if (recentTransactionCount > 20) score = 90;
  else if (recentTransactionCount > 10) score = 70;
  else if (recentTransactionCount > 5) score = 45;
  else if (recentTransactionCount > 2) score = 20;
  else score = 5;

  return {
    name: "frequency",
    weight: 0.15,
    score,
    description: `${recentTransactionCount} transactions in the last hour — risk ${score}/100`,
  };
}

function evaluateTimeRisk(
  timestamp: number,
  normalHours?: [number, number]
): RiskFactor {
  const date = new Date(timestamp);
  const hour = date.getHours();
  const [start, end] = normalHours ?? [6, 23];

  let score = 0;
  if (hour >= start && hour <= end) {
    score = 5; // normal hours
  } else if (hour >= 1 && hour <= 5) {
    score = 80; // deep night
  } else {
    score = 40; // early morning / late night edge
  }

  return {
    name: "time",
    weight: 0.1,
    score,
    description: `Transaction at ${hour}:00 (normal window ${start}:00–${end}:00) — risk ${score}/100`,
  };
}

function evaluatePatternRisk(amount: number, averageAmount?: number): RiskFactor {
  if (!averageAmount || averageAmount === 0) {
    return {
      name: "pattern",
      weight: 0.15,
      score: 30,
      description: "No historical pattern data available — moderate risk",
    };
  }

  const deviation = Math.abs(amount - averageAmount) / averageAmount;
  let score = 0;

  if (deviation > 5) score = 85;
  else if (deviation > 3) score = 65;
  else if (deviation > 1) score = 40;
  else if (deviation > 0.5) score = 20;
  else score = 5;

  return {
    name: "pattern",
    weight: 0.15,
    score,
    description: `Amount deviates ${(deviation * 100).toFixed(0)}% from average — risk ${score}/100`,
  };
}

function evaluateVendorRisk(vendorTrustScore?: number): RiskFactor {
  if (vendorTrustScore === undefined || vendorTrustScore === null) {
    return {
      name: "vendor",
      weight: 0.15,
      score: 50,
      description: "No vendor trust data available — moderate risk",
    };
  }

  // Trust score is 0-100 where 100 = fully trusted → risk = 100 - trust
  const score = Math.max(0, 100 - vendorTrustScore);

  return {
    name: "vendor",
    weight: 0.15,
    score,
    description: `Vendor trust ${vendorTrustScore}/100 — risk ${score}/100`,
  };
}

// ── Core API ─────────────────────────────────────────────────────────────────

/**
 * Assess transaction risk by evaluating multiple weighted factors.
 */
export function assessTransactionRisk(input: TransactionInput): RiskAssessment {
  const timestamp = input.timestamp ?? Date.now();
  const meta = input.metadata ?? {};

  const factors: RiskFactor[] = [
    evaluateAmountRisk(input.amount, meta.averageAmount),
    evaluateRecipientRisk(input.recipientAddress, meta.knownRecipients),
    evaluateFrequencyRisk(meta.recentTransactionCount ?? 0),
    evaluateTimeRisk(timestamp, meta.normalTransactionHours),
    evaluatePatternRisk(input.amount, meta.averageAmount),
    evaluateVendorRisk(meta.vendorTrustScore),
  ];

  // Weighted average → 0-100
  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const overallScore =
    totalWeight > 0
      ? Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight)
      : 0;

  const assessment: RiskAssessment = {
    systemId: input.systemId,
    transactionId: input.transactionId,
    overallScore,
    level: getRiskLevel(overallScore),
    factors,
    timestamp,
  };

  // Store in history
  const history = riskHistory.get(input.systemId) ?? [];
  history.push(assessment);
  riskHistory.set(input.systemId, history);

  return assessment;
}

/**
 * Map a numeric score (0-100) to a risk level label.
 */
export function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 35) return "medium";
  return "low";
}

/**
 * Return a hex colour for UI display of a risk level.
 */
export function getRiskColor(level: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    low: "#22c55e",      // green
    medium: "#eab308",   // yellow
    high: "#f97316",     // orange
    critical: "#ef4444", // red
  };
  return colors[level];
}

/**
 * Retrieve the risk assessment history for a system.
 * Optionally filter by a time window.
 */
export function getRiskHistory(
  systemId: string,
  options?: { since?: number; limit?: number }
): RiskAssessment[] {
  const history = riskHistory.get(systemId) ?? [];
  let filtered = history;

  if (options?.since) {
    filtered = filtered.filter((a) => a.timestamp >= options.since!);
  }

  if (options?.limit) {
    filtered = filtered.slice(-options.limit);
  }

  return filtered;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function recipientShort(address: string): string {
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
