/**
 * Auto-trigger weekly report after N approved spends per agent.
 */
import { VeniceService } from "@/lib/venice/service";
import {
  getServerStore,
  getServerSystem,
  saveServerStore,
  incrementSpendCount,
} from "@/lib/server/store";
import type { AgentReport } from "@/types/agent";

const REPORT_THRESHOLD = Number(process.env.REPORT_SPEND_THRESHOLD) || 5;

export async function maybeTriggerReport(systemId: string): Promise<AgentReport | null> {
  const store = getServerStore();
  const count = store.spendCounts[systemId] ?? 0;

  if (count % REPORT_THRESHOLD !== 0) return null;

  const system = getServerSystem(systemId);
  if (!system) return null;

  const auditHistory = store.auditLog
    .filter((a) => a.systemId === systemId)
    .map((a) => ({
      amount: parseFloat(a.spendRequest.amount),
      recipient: a.spendRequest.recipient,
      decision: a.verdict.decision,
      timestamp: a.timestamp,
    }));

  const totalSpent = auditHistory
    .filter((a) => a.decision === "approved")
    .reduce((sum, a) => sum + a.amount, 0);

  const budget = system.budget || 500;
  const kpis = (system.kpiTargets || []).map((kpi) => ({
    name: kpi.name,
    target: kpi.target,
    current: kpi.target * 0.8,
    unit: kpi.unit,
  }));

  const reportText = await VeniceService.generateAgentReport(systemId, system.name, {
    totalSpent,
    budget,
    auditHistory: auditHistory.slice(0, 30),
    kpis,
    trustScore: 50,
    trustScoreChange: 0,
    anomalies: [],
  });

  const report: AgentReport = {
    id: crypto.randomUUID(),
    systemId,
    systemName: system.name,
    period: "weekly",
    startDate: Date.now() - 604800000,
    endDate: Date.now(),
    totalSpent,
    budget,
    roi: totalSpent > 0 ? 2.3 : 0,
    kpiSummary: kpis.map((k) => ({
      name: k.name,
      target: k.target,
      actual: k.current,
      status: k.current >= k.target ? "met" : "missed",
    })),
    topVendors: [],
    anomalies: [],
    recommendations: reportText.split("\n").filter((l) => l.trim()).slice(0, 5),
    trustScoreChange: 0,
    generatedAt: Date.now(),
  };

  store.reports = [report, ...store.reports].slice(0, 50);
  saveServerStore(store);

  const { appendServerActivity } = await import("@/lib/server/store");
  appendServerActivity({
    type: "report",
    systemId,
    systemName: system.name,
    message: `Auto-report generated after ${count} spends`,
    details: reportText.slice(0, 120),
    severity: "info",
  });

  const { AgentEventBus } = await import("@/lib/agent/event-bus");
  await AgentEventBus.getInstance().emit({
    type: "report.generated",
    source: systemId,
    data: { reportId: report.id },
  });

  return report;
}
