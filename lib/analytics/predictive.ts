/**
 * Predictive Budgeting
 * AI-powered spending pattern analysis, budget forecasting, anomaly detection,
 * and allocation recommendations using audit log data.
 */

import type { AuditRecord } from "@/types/audit";
import { getAuditLog, getBudgetPool } from "@/lib/storage";
import { AUTONOMOUS_SYSTEMS } from "@/types/system";

// ─── Types ──────────────────────────────────────────────────

export type SpendingPattern = {
  systemId: string;
  avgDaily: number;
  avgWeekly: number;
  avgMonthly: number;
  trend: "increasing" | "decreasing" | "stable";
  confidence: number;
};

export type BudgetForecast = {
  systemId: string;
  currentSpend: number;
  projectedSpend: number;
  daysRemaining: number;
  burnRate: number;
  willExceedBudget: boolean;
  recommendedAdjustment: number;
  confidence: number;
};

export type AnomalyDetection = {
  id: string;
  systemId: string;
  type: "spike" | "drop" | "frequency" | "pattern_break";
  severity: "low" | "medium" | "high";
  description: string;
  amount: number;
  timestamp: number;
};

export type ForecastSummary = {
  systemId: string;
  systemName: string;
  pattern: SpendingPattern;
  forecast: BudgetForecast;
  anomalies: AnomalyDetection[];
};

// ─── Helpers ────────────────────────────────────────────────

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;
const MS_PER_MONTH = 30 * MS_PER_DAY;

function getSystemAudits(systemId: string, lookbackMs: number): AuditRecord[] {
  const now = Date.now();
  const auditLog = getAuditLog();
  return auditLog.filter(
    (a) =>
      a.systemId === systemId &&
      a.timestamp >= now - lookbackMs &&
      a.verdict.decision === "approved",
  );
}

function sumAmounts(records: AuditRecord[]): number {
  return records.reduce((sum, r) => sum + parseFloat(r.spendRequest.amount), 0);
}

/** Calculate linear trend from an array of daily spend values */
function calculateTrend(
  dailySpends: number[],
): { slope: number; r2: number } {
  const n = dailySpends.length;
  if (n < 2) return { slope: 0, r2: 0 };

  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += dailySpends[i];
    sumXY += i * dailySpends[i];
    sumX2 += i * i;
    sumY2 += dailySpends[i] * dailySpends[i];
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, r2: 0 };

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;

  // R² calculation
  const yMean = sumY / n;
  let ssTot = 0, ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssTot += (dailySpends[i] - yMean) ** 2;
    ssRes += (dailySpends[i] - predicted) ** 2;
  }
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  return { slope, r2: Math.max(0, r2) };
}

/** Build daily spend buckets from audit records over a lookback window */
function buildDailySpendBuckets(
  records: AuditRecord[],
  lookbackDays: number,
): number[] {
  const now = Date.now();
  const buckets = new Array(lookbackDays).fill(0);

  for (const r of records) {
    const daysAgo = Math.floor((now - r.timestamp) / MS_PER_DAY);
    if (daysAgo >= 0 && daysAgo < lookbackDays) {
      buckets[lookbackDays - 1 - daysAgo] += parseFloat(r.spendRequest.amount);
    }
  }

  return buckets;
}

// ─── Public API ─────────────────────────────────────────────

/**
 * Analyze historical spending data for a system and return pattern metrics.
 * Uses the last 90 days of audit data for robust trend detection.
 */
export function analyzeSpendingPatterns(systemId: string): SpendingPattern {
  const lookbackDays = 90;
  const records = getSystemAudits(systemId, lookbackDays * MS_PER_DAY);
  const dailyBuckets = buildDailySpendBuckets(records, lookbackDays);

  const totalSpent = sumAmounts(records);
  const activeDays = dailyBuckets.filter((d) => d > 0).length || 1;

  const avgDaily = totalSpent / lookbackDays;
  const avgWeekly = (totalSpent / lookbackDays) * 7;
  const avgMonthly = (totalSpent / lookbackDays) * 30;

  const { slope, r2 } = calculateTrend(dailyBuckets);

  // Determine trend direction based on slope significance
  let trend: SpendingPattern["trend"] = "stable";
  const slopeThreshold = avgDaily * 0.05; // 5% of avg daily as threshold
  if (slope > slopeThreshold) trend = "increasing";
  else if (slope < -slopeThreshold) trend = "decreasing";

  // Confidence: based on data density (more active days → higher) and R²
  const dataDensity = Math.min(activeDays / lookbackDays, 1);
  const confidence = Math.round((dataDensity * 0.4 + r2 * 0.6) * 100) / 100;

  return {
    systemId,
    avgDaily: Math.round(avgDaily * 100) / 100,
    avgWeekly: Math.round(avgWeekly * 100) / 100,
    avgMonthly: Math.round(avgMonthly * 100) / 100,
    trend,
    confidence,
  };
}

/**
 * Generate a 30-day budget forecast for a system.
 * Projects spend forward using historical burn rate and trend adjustment.
 */
export function generateForecast(systemId: string): BudgetForecast {
  const system = AUTONOMOUS_SYSTEMS.find((s) => s.id === systemId);
  const budget = system?.budget ?? 0;

  const pattern = analyzeSpendingPatterns(systemId);
  const recentRecords = getSystemAudits(systemId, 30 * MS_PER_DAY);
  const currentSpend = sumAmounts(recentRecords);

  // Adjust burn rate based on trend
  let burnRate = pattern.avgDaily;
  if (pattern.trend === "increasing") {
    burnRate *= 1.1; // 10% upward adjustment for increasing trend
  } else if (pattern.trend === "decreasing") {
    burnRate *= 0.9; // 10% downward adjustment for decreasing trend
  }

  const projectedSpend = currentSpend + burnRate * 30;
  const remainingBudget = Math.max(0, budget - currentSpend);
  const daysRemaining =
    burnRate > 0 ? Math.floor(remainingBudget / burnRate) : Infinity;

  const willExceedBudget = budget > 0 && projectedSpend > budget;
  const recommendedAdjustment = willExceedBudget
    ? Math.round((projectedSpend - budget) * 100) / 100
    : 0;

  return {
    systemId,
    currentSpend: Math.round(currentSpend * 100) / 100,
    projectedSpend: Math.round(projectedSpend * 100) / 100,
    daysRemaining: Math.min(daysRemaining, 365),
    burnRate: Math.round(burnRate * 100) / 100,
    willExceedBudget,
    recommendedAdjustment,
    confidence: pattern.confidence,
  };
}

/**
 * Recommend budget allocation across all systems based on spending patterns,
 * trust scores, and budget utilization.
 */
export function getRecommendedAllocation(): {
  systemId: string;
  currentAllocation: number;
  recommended: number;
  reason: string;
}[] {
  const pool = getBudgetPool();
  const currentMap = new Map(
    pool.allocations.map((a) => [a.systemId, a.amount]),
  );

  const activeSystems = AUTONOMOUS_SYSTEMS.filter((s) => s.status === "active");

  // Gather forecast data for all active systems
  const forecasts = activeSystems.map((s) => ({
    systemId: s.id,
    forecast: generateForecast(s.id),
    pattern: analyzeSpendingPatterns(s.id),
  }));

  // Calculate total current allocation
  const totalAllocated = forecasts.reduce(
    (sum, f) => sum + (currentMap.get(f.systemId) ?? 0),
    0,
  );

  // Build recommendations
  return forecasts.map(({ systemId, forecast, pattern }) => {
    const current = currentMap.get(systemId) ?? 0;
    let recommended = current;
    let reason = "Current allocation is appropriate";

    if (forecast.willExceedBudget && forecast.recommendedAdjustment > 0) {
      // Increase allocation to cover projected overage
      recommended =
        Math.round((current + forecast.recommendedAdjustment) * 100) / 100;
      reason = `Projected to exceed budget by $${forecast.recommendedAdjustment.toFixed(2)} — increase recommended`;
    } else if (
      pattern.trend === "decreasing" &&
      forecast.daysRemaining > 90
    ) {
      // Decrease allocation if spending is trending down and we have >90 days runway
      const reduction = Math.round(current * 0.15 * 100) / 100;
      recommended = Math.max(0, current - reduction);
      reason = `Spending decreasing with ${forecast.daysRemaining}d runway — consider reallocating $${reduction.toFixed(2)}`;
    } else if (
      pattern.trend === "increasing" &&
      !forecast.willExceedBudget
    ) {
      // Proactive buffer for increasing trends
      const buffer = Math.round(current * 0.1 * 100) / 100;
      recommended = current + buffer;
      reason = `Spending trending up — $${buffer.toFixed(2)} buffer recommended`;
    }

    return { systemId, currentAllocation: current, recommended, reason };
  });
}

/**
 * Detect unusual spending patterns from audit log data.
 * Compares recent activity against historical baselines.
 */
export function detectAnomalies(
  systemId?: string,
  lookbackDays: number = 7,
): AnomalyDetection[] {
  const anomalies: AnomalyDetection[] = [];
  const systems = systemId
    ? AUTONOMOUS_SYSTEMS.filter((s) => s.id === systemId)
    : AUTONOMOUS_SYSTEMS;

  for (const system of systems) {
    // Get baseline (30-90 days ago) and recent (last N days)
    const recentRecords = getSystemAudits(
      system.id,
      lookbackDays * MS_PER_DAY,
    );
    const baselineRecords = getSystemAudits(system.id, 90 * MS_PER_DAY).filter(
      (r) => r.timestamp < Date.now() - lookbackDays * MS_PER_DAY,
    );

    const recentTotal = sumAmounts(recentRecords);
    const baselineDays = 90 - lookbackDays;
    const baselineDaily =
      baselineDays > 0 ? sumAmounts(baselineRecords) / baselineDays : 0;
    const recentDaily = recentTotal / lookbackDays;

    // Spike detection: recent daily spend > 2x baseline
    if (baselineDaily > 0 && recentDaily > baselineDaily * 2) {
      anomalies.push({
        id: crypto.randomUUID(),
        systemId: system.id,
        type: "spike",
        severity: recentDaily > baselineDaily * 3 ? "high" : "medium",
        description: `Daily spend ($${recentDaily.toFixed(2)}) is ${(recentDaily / baselineDaily).toFixed(1)}x the baseline ($${baselineDaily.toFixed(2)})`,
        amount: recentDaily - baselineDaily,
        timestamp: Date.now(),
      });
    }

    // Drop detection: recent daily spend < 30% of baseline (and baseline is meaningful)
    if (baselineDaily > 1 && recentDaily < baselineDaily * 0.3) {
      anomalies.push({
        id: crypto.randomUUID(),
        systemId: system.id,
        type: "drop",
        severity: "low",
        description: `Daily spend dropped to $${recentDaily.toFixed(2)} — ${((recentDaily / baselineDaily) * 100).toFixed(0)}% of baseline ($${baselineDaily.toFixed(2)})`,
        amount: baselineDaily - recentDaily,
        timestamp: Date.now(),
      });
    }

    // Frequency spike: significantly more transactions than baseline
    const recentTxCount = recentRecords.length;
    const baselineTxCount = baselineRecords.length;
    const baselineDailyTx =
      baselineDays > 0 ? baselineTxCount / baselineDays : 0;
    const recentDailyTx = recentTxCount / lookbackDays;

    if (baselineDailyTx > 0 && recentDailyTx > baselineDailyTx * 2.5) {
      anomalies.push({
        id: crypto.randomUUID(),
        systemId: system.id,
        type: "frequency",
        severity: "medium",
        description: `Transaction frequency (${recentDailyTx.toFixed(1)}/day) is ${(recentDailyTx / baselineDailyTx).toFixed(1)}x the baseline (${baselineDailyTx.toFixed(1)}/day)`,
        amount: recentTxCount,
        timestamp: Date.now(),
      });
    }

    // Pattern break: single transaction > 3x the average
    const avgTxAmount =
      baselineRecords.length > 0
        ? sumAmounts(baselineRecords) / baselineRecords.length
        : 0;
    for (const record of recentRecords) {
      const amount = parseFloat(record.spendRequest.amount);
      if (avgTxAmount > 0 && amount > avgTxAmount * 3) {
        anomalies.push({
          id: crypto.randomUUID(),
          systemId: system.id,
          type: "pattern_break",
          severity: amount > avgTxAmount * 5 ? "high" : "medium",
          description: `Single transaction of $${amount.toFixed(2)} is ${(amount / avgTxAmount).toFixed(1)}x the average ($${avgTxAmount.toFixed(2)})`,
          amount,
          timestamp: record.timestamp,
        });
      }
    }
  }

  return anomalies.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

/**
 * Get a comprehensive forecast summary for all (or one) agent(s).
 * Combines patterns, forecasts, and anomalies into a single view.
 */
export function getForecastSummary(systemId?: string): ForecastSummary[] {
  const systems = systemId
    ? AUTONOMOUS_SYSTEMS.filter((s) => s.id === systemId)
    : AUTONOMOUS_SYSTEMS.filter((s) => s.status === "active");

  const anomalies = detectAnomalies(systemId);

  return systems.map((system) => ({
    systemId: system.id,
    systemName: system.name,
    pattern: analyzeSpendingPatterns(system.id),
    forecast: generateForecast(system.id),
    anomalies: anomalies.filter((a) => a.systemId === system.id),
  }));
}
