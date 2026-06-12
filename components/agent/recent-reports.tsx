"use client";

import { useCallback, useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { getReports } from "@/lib/storage";
import { pullFromServer } from "@/lib/store-sync";
import type { AgentReport } from "@/types/agent";

export function RecentReports({ limit = 3 }: { limit?: number }) {
  const [reports, setReports] = useState<AgentReport[]>([]);

  const refresh = useCallback(async () => {
    await pullFromServer().catch(() => {});
    setReports(getReports().slice(0, limit));
  }, [limit]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (reports.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-center">
        <FileText className="mx-auto h-6 w-6 text-zinc-600" />
        <p className="mt-2 text-sm text-zinc-500">No reports yet</p>
        <p className="text-xs text-zinc-600">Auto-generated after every 5 approved spends</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div
          key={report.id}
          className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium text-zinc-200">{report.systemName}</span>
            <span className="text-xs text-zinc-500">
              {new Date(report.generatedAt).toLocaleDateString()}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Spent {report.totalSpent.toFixed(2)} / {report.budget} USDC
          </p>
          {report.recommendations.length > 0 && (
            <ul className="mt-2 space-y-1">
              {report.recommendations.slice(0, 2).map((rec, i) => (
                <li key={i} className="text-xs text-zinc-500 truncate">• {rec}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
