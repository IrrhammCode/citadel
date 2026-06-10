"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AgentReport } from "@/types/agent";
import { useReportGenerator } from "@/hooks/useReportGenerator";
import { getReports } from "@/lib/storage";

type Props = {
  systemId: string;
  systemName: string;
};

export function ReportViewer({ systemId, systemName }: Props) {
  const { generateReport, loading, error } = useReportGenerator();
  const [report, setReport] = useState<AgentReport | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const previousReports = getReports(systemId);

  async function handleGenerate() {
    const result = await generateReport(systemId);
    if (result) setReport(result);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-cyan-400" />
          <h3 className="font-semibold text-zinc-100">AI Report</h3>
        </div>
        <div className="flex gap-2">
          {previousReports.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              History ({previousReports.length})
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Generate Report
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {report && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h4 className="font-semibold text-zinc-100">{report.systemName} — Weekly Report</h4>
              <p className="text-xs text-zinc-500">
                {new Date(report.startDate).toLocaleDateString()} — {new Date(report.endDate).toLocaleDateString()}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-zinc-100">{report.totalSpent.toFixed(2)} USDC</p>
              <p className="text-xs text-zinc-500">of {report.budget} USDC budget</p>
            </div>
          </div>

          {/* KPIs */}
          <div className="mt-4 space-y-2">
            {report.kpiSummary.map((kpi, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  {kpi.status === "met" || kpi.status === "exceeded" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                  )}
                  <span className="text-sm text-zinc-300">{kpi.name}</span>
                </div>
                <span className={`text-sm font-medium ${
                  kpi.status === "met" || kpi.status === "exceeded" ? "text-emerald-400" : "text-amber-400"
                }`}>
                  {kpi.actual} / {kpi.target}
                </span>
              </div>
            ))}
          </div>

          {/* Trust Score */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-zinc-400">Trust Score Change:</span>
            <span className={report.trustScoreChange >= 0 ? "text-emerald-400" : "text-red-400"}>
              {report.trustScoreChange >= 0 ? "+" : ""}{report.trustScoreChange}
            </span>
          </div>

          {/* Top Vendors */}
          {report.topVendors.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Top Vendors</p>
              {report.topVendors.map((vendor, i) => (
                <div key={i} className="flex items-center justify-between text-sm text-zinc-400 py-1">
                  <span>{vendor.name}</span>
                  <span className="text-zinc-300">{vendor.amount.toFixed(2)} USDC</span>
                </div>
              ))}
            </div>
          )}

          {/* Anomalies */}
          {report.anomalies.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Anomalies</p>
              {report.anomalies.map((anomaly, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-zinc-400 py-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5" />
                  <span>{anomaly.description}</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {report.recommendations.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Recommendations</p>
              {report.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-zinc-400 py-1">
                  <TrendingUp className="h-3.5 w-3.5 text-cyan-400 mt-0.5" />
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* History */}
      {showHistory && previousReports.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          {previousReports.slice(0, 5).map((r) => (
            <div
              key={r.id}
              className="cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900/30 p-3 hover:bg-zinc-800/50"
              onClick={() => setReport(r)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-zinc-300">{r.period} report</span>
                <span className="text-xs text-zinc-500">{new Date(r.generatedAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">{r.totalSpent.toFixed(2)} USDC spent</p>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
