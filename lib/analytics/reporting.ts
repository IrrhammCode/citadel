/**
 * Reporting & Analytics
 * Executive insights, ROI tracking, and forecasting
 */

// ─── Types ──────────────────────────────────────────────────

export type ExecutiveSummary = {
  totalBudget: number;
  totalSpent: number;
  totalRemaining: number;
  utilizationRate: number;
  activeAgents: number;
  totalTransactions: number;
  complianceRate: number;
  trustScoreAverage: number;
  topPerformingAgent: string;
  biggestExpense: { agent: string; amount: number };
  period: { start: number; end: number };
};

export type AgentROI = {
  systemId: string;
  systemName: string;
  totalSpent: number;
  kpiAchievement: number; // percentage
  roi: number; // ratio
  efficiency: "excellent" | "good" | "average" | "poor";
  recommendations: string[];
};

export type CostOptimization = {
  id: string;
  type: "budget_reallocation" | "vendor_switch" | "spending_reduction" | "efficiency_gain";
  title: string;
  description: string;
  estimatedSavings: number;
  priority: "high" | "medium" | "low";
  agentId?: string;
};

export type VendorPerformance = {
  address: string;
  name: string;
  totalPaid: number;
  transactionCount: number;
  averageAmount: number;
  onTimeDeliveryRate: number;
  qualityScore: number;
  riskLevel: "low" | "medium" | "high";
  recommendation: string;
};

export type BudgetForecast = {
  systemId: string;
  currentSpend: number;
  projectedSpend: number;
  daysRemaining: number;
  burnRate: number;
  willExceedBudget: boolean;
  recommendedAdjustment: number;
};

// ─── Executive Summary ──────────────────────────────────────

export function generateExecutiveSummary(
  startDate: number,
  endDate: number,
): ExecutiveSummary {
  const { getAuditLog, getTrustScore, getAllVendors, getAnomalies } = require("@/lib/storage");
  const { AUTONOMOUS_SYSTEMS } = require("@/types/system");

  const auditLog = getAuditLog();
  const periodAudits = auditLog.filter(
    (a: any) => a.timestamp >= startDate && a.timestamp <= endDate,
  );

  const totalSpent = periodAudits
    .filter((a: any) => a.verdict.decision === "approved")
    .reduce((sum: number, a: any) => sum + parseFloat(a.spendRequest.amount), 0);

  const totalBudget = AUTONOMOUS_SYSTEMS.reduce(
    (sum: number, s: any) => sum + (s.budget || 0),
    0,
  );

  // Calculate trust score average
  const trustScores = AUTONOMOUS_SYSTEMS.map((s: any) => getTrustScore(s.id));
  const trustScoreAverage =
    trustScores.reduce((sum: number, t: any) => sum + t.score, 0) / trustScores.length;

  // Find top performing agent (highest trust score)
  const topAgent = AUTONOMOUS_SYSTEMS.reduce((best: any, s: any) => {
    const trust = getTrustScore(s.id);
    const bestTrust = getTrustScore(best.id);
    return trust.score > bestTrust.score ? s : best;
  }, AUTONOMOUS_SYSTEMS[0]);

  // Find biggest expense
  const spendsByAgent: Record<string, number> = {};
  periodAudits
    .filter((a: any) => a.verdict.decision === "approved")
    .forEach((a: any) => {
      spendsByAgent[a.systemId] =
        (spendsByAgent[a.systemId] || 0) + parseFloat(a.spendRequest.amount);
    });
  const biggestExpenseAgent = Object.entries(spendsByAgent).sort(
    ([, a], [, b]) => b - a,
  )[0];

  return {
    totalBudget,
    totalSpent,
    totalRemaining: totalBudget - totalSpent,
    utilizationRate: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
    activeAgents: AUTONOMOUS_SYSTEMS.filter((s: any) => s.status === "active").length,
    totalTransactions: periodAudits.length,
    complianceRate: 95, // Would calculate from actual compliance data
    trustScoreAverage,
    topPerformingAgent: topAgent.name,
    biggestExpense: {
      agent: biggestExpenseAgent?.[0] || "none",
      amount: biggestExpenseAgent?.[1] || 0,
    },
    period: { start: startDate, end: endDate },
  };
}

// ─── Agent ROI Analysis ─────────────────────────────────────

export function calculateAgentROI(systemId: string): AgentROI {
  const { getAuditLog, getTrustScore } = require("@/lib/storage");
  const { AUTONOMOUS_SYSTEMS } = require("@/types/system");

  const system = AUTONOMOUS_SYSTEMS.find((s: any) => s.id === systemId);
  if (!system) throw new Error(`System ${systemId} not found`);

  const auditLog = getAuditLog();
  const systemAudits = auditLog.filter(
    (a: any) => a.systemId === systemId && a.verdict.decision === "approved",
  );

  const totalSpent = systemAudits.reduce(
    (sum: number, a: any) => sum + parseFloat(a.spendRequest.amount),
    0,
  );

  // Calculate KPI achievement
  const kpiAchievement = system.kpiTargets
    ? system.kpiTargets.reduce((sum: number, kpi: any) => {
        const current = kpi.target * 0.8; // Simulated
        const achievement = kpi.isHigherBetter
          ? (current / kpi.target) * 100
          : ((kpi.target - (current - kpi.target)) / kpi.target) * 100;
        return sum + Math.min(achievement, 100);
      }, 0) / system.kpiTargets.length
    : 0;

  // Calculate ROI (simplified)
  const roi = totalSpent > 0 ? kpiAchievement / (totalSpent / 100) : 0;

  let efficiency: AgentROI["efficiency"] = "average";
  if (roi > 2) efficiency = "excellent";
  else if (roi > 1.5) efficiency = "good";
  else if (roi < 0.5) efficiency = "poor";

  const recommendations: string[] = [];
  if (efficiency === "poor") {
    recommendations.push("Review spending patterns and optimize vendor selection");
  }
  if (kpiAchievement < 50) {
    recommendations.push("KPIs significantly behind - consider strategy adjustment");
  }
  if (totalSpent > (system.budget || 0) * 0.9) {
    recommendations.push("Budget nearly exhausted - prioritize high-impact actions");
  }

  return {
    systemId,
    systemName: system.name,
    totalSpent,
    kpiAchievement,
    roi,
    efficiency,
    recommendations,
  };
}

// ─── Cost Optimization Recommendations ──────────────────────

export function generateCostOptimizations(): CostOptimization[] {
  const optimizations: CostOptimization[] = [];
  const { AUTONOMOUS_SYSTEMS } = require("@/types/system");

  for (const system of AUTONOMOUS_SYSTEMS) {
    const roi = calculateAgentROI(system.id);

    if (roi.efficiency === "poor") {
      optimizations.push({
        id: crypto.randomUUID(),
        type: "spending_reduction",
        title: `Reduce spending for ${system.name}`,
        description: `${system.name} has poor ROI (${roi.roi.toFixed(2)}). Consider reducing budget or optimizing strategy.`,
        estimatedSavings: roi.totalSpent * 0.2,
        priority: "high",
        agentId: system.id,
      });
    }

    if (roi.kpiAchievement < 30) {
      optimizations.push({
        id: crypto.randomUUID(),
        type: "budget_reallocation",
        title: `Reallocate budget from ${system.name}`,
        description: `${system.name} achieving only ${roi.kpiAchievement.toFixed(0)}% of KPIs. Consider reallocating to higher-performing agents.`,
        estimatedSavings: 0,
        priority: "medium",
        agentId: system.id,
      });
    }
  }

  return optimizations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// ─── Vendor Performance ─────────────────────────────────────

export function analyzeVendorPerformance(): VendorPerformance[] {
  const { getAllVendors, getAuditLog } = require("@/lib/storage");
  const vendors = getAllVendors();

  return vendors.map((vendor: any) => {
    const auditLog = getAuditLog();
    const vendorAudits = auditLog.filter(
      (a: any) =>
        a.spendRequest.recipient.toLowerCase() === vendor.address.toLowerCase(),
    );

    const totalPaid = vendorAudits.reduce(
      (sum: number, a: any) => sum + parseFloat(a.spendRequest.amount),
      0,
    );

    return {
      address: vendor.address,
      name: vendor.name,
      totalPaid,
      transactionCount: vendor.transactionCount,
      averageAmount: vendor.averageAmount,
      onTimeDeliveryRate: 95, // Would track from actual delivery data
      qualityScore: 85, // Would track from actual quality metrics
      riskLevel: vendor.riskLevel,
      recommendation:
        vendor.riskLevel === "high"
          ? "Review vendor reliability"
          : vendor.transactionCount > 10
          ? "Reliable vendor - consider volume discount"
          : "New vendor - monitor performance",
    };
  });
}

// ─── Budget Forecasting ─────────────────────────────────────

export function generateBudgetForecasts(): BudgetForecast[] {
  const { AUTONOMOUS_SYSTEMS } = require("@/types/system");
  const { getAuditLog } = require("@/lib/storage");

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const auditLog = getAuditLog();

  return AUTONOMOUS_SYSTEMS.map((system: any) => {
    const systemAudits = auditLog.filter(
      (a: any) =>
        a.systemId === system.id &&
        a.timestamp >= thirtyDaysAgo &&
        a.verdict.decision === "approved",
    );

    const currentSpend = systemAudits.reduce(
      (sum: number, a: any) => sum + parseFloat(a.spendRequest.amount),
      0,
    );

    const burnRate = currentSpend / 30; // per day
    const daysRemaining = system.budget ? (system.budget - currentSpend) / burnRate : Infinity;
    const projectedSpend = currentSpend + burnRate * 30; // next 30 days

    return {
      systemId: system.id,
      currentSpend,
      projectedSpend,
      daysRemaining: Math.floor(daysRemaining),
      burnRate,
      willExceedBudget: system.budget ? projectedSpend > system.budget : false,
      recommendedAdjustment: system.budget
        ? Math.max(0, projectedSpend - system.budget)
        : 0,
    };
  });
}

// ─── Export Reports ──────────────────────────────────────────

export function exportReport(data: any, format: "json" | "csv" = "json"): string {
  if (format === "json") {
    return JSON.stringify(data, null, 2);
  }

  // Simple CSV export for arrays
  if (Array.isArray(data) && data.length > 0) {
    const headers = Object.keys(data[0]);
    const rows = data.map((item) =>
      headers.map((h) => JSON.stringify(item[h] ?? "")).join(","),
    );
    return [headers.join(","), ...rows].join("\n");
  }

  return JSON.stringify(data);
}
