"use client";

import { useState } from "react";
import type { AgentReport, Anomaly } from "@/types/agent";
import { getAuditLog, getTrustScore, saveReport, getAnomalies } from "@/lib/storage";
import { AUTONOMOUS_SYSTEMS } from "@/types/system";

export function useReportGenerator() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AgentReport | null>(null);

  async function generateReport(systemId: string): Promise<AgentReport | null> {
    setLoading(true);
    setError(null);

    try {
      const system = AUTONOMOUS_SYSTEMS.find((s) => s.id === systemId) ||
        (await import("@/lib/storage")).getCustomSystems().find((s) => s.id === systemId);

      if (!system) throw new Error("System not found");

      const trustScore = getTrustScore(systemId);
      const anomalies = getAnomalies(systemId);
      const auditHistory = getAuditLog()
        .filter((r) => r.systemId === systemId)
        .map((r) => ({
          amount: parseFloat(r.spendRequest.amount),
          recipient: r.spendRequest.recipient,
          decision: r.verdict.decision,
          timestamp: r.timestamp,
        }));

      const totalSpent = auditHistory.reduce((sum, a) => sum + a.amount, 0);
      const budget = system.budget || 500;

      // Build KPI data
      const kpis = (system.kpiTargets || []).map((kpi) => {
        const current = kpi.name === "ROI"
          ? totalSpent > 0 ? (totalSpent * 2.3) / totalSpent : 0
          : kpi.name === "Vendor Diversity"
            ? new Set(auditHistory.map((a) => a.recipient)).size
            : kpi.name === "Uptime"
              ? 99.95
              : totalSpent;
        return {
          name: kpi.name,
          target: kpi.target,
          current,
          unit: kpi.unit,
        };
      });

      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemId,
          systemName: system.name,
          data: {
            totalSpent,
            budget,
            auditHistory: auditHistory.slice(0, 30),
            kpis,
            trustScore: trustScore.score,
            trustScoreChange: trustScore.history.filter((h) => h.timestamp > Date.now() - 604800000).reduce((sum, h) => sum + h.points, 0),
            anomalies: anomalies.filter((a) => !a.resolved).slice(0, 10),
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Report generation failed");
      }

      const data = (await res.json()) as { report: string };

      const agentReport: AgentReport = {
        id: crypto.randomUUID(),
        systemId,
        systemName: system.name,
        period: "weekly",
        startDate: Date.now() - 604800000,
        endDate: Date.now(),
        totalSpent,
        budget,
        roi: totalSpent > 0 ? (totalSpent * 2.3) / totalSpent : 0,
        kpiSummary: kpis.map((k) => ({
          name: k.name,
          target: k.target,
          actual: k.current,
          status: k.current >= k.target ? "met" as const : "missed" as const,
        })),
        topVendors: Object.values(
          auditHistory.reduce((acc, a) => {
            if (!acc[a.recipient]) acc[a.recipient] = { address: a.recipient, name: `Vendor ${a.recipient.slice(0, 6)}...`, amount: 0 };
            acc[a.recipient].amount += a.amount;
            return acc;
          }, {} as Record<string, { address: string; name: string; amount: number }>),
        ).sort((a, b) => b.amount - a.amount).slice(0, 5),
        anomalies: anomalies.filter((a) => !a.resolved).slice(0, 5),
        recommendations: data.report.split("\n").filter((l) => l.includes("- ")).map((l) => l.replace(/^-\s*/, "")).slice(0, 5),
        trustScoreChange: trustScore.history.filter((h) => h.timestamp > Date.now() - 604800000).reduce((sum, h) => sum + h.points, 0),
        generatedAt: Date.now(),
      };

      saveReport(agentReport);
      setReport(agentReport);
      return agentReport;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { generateReport, loading, error, report };
}
