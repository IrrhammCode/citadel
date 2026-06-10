"use client";

import { motion } from "framer-motion";
import { Target, DollarSign, TrendingUp } from "lucide-react";
import type { AutonomousSystem } from "@/types/system";
import type { TrustScore } from "@/types/agent";
import { TrustScoreBadge } from "./trust-score-badge";

type Props = {
  system: AutonomousSystem;
  trustScore: TrustScore;
  totalSpent: number;
};

export function AgentGoalCard({ system, trustScore, totalSpent }: Props) {
  const budget = system.budget || 0;
  const usagePercent = budget > 0 ? (totalSpent / budget) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-zinc-100">{system.name}</h3>
          <p className="mt-1 text-sm text-zinc-400">{system.goal || system.description}</p>
        </div>
        <TrustScoreBadge trustScore={trustScore} compact />
      </div>

      {/* Budget Progress */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-400">Budget Usage</span>
          <span className="font-medium text-zinc-200">
            {totalSpent.toFixed(2)} / {budget} USDC
          </span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-zinc-800">
          <motion.div
            className={`h-full rounded-full ${
              usagePercent > 90 ? "bg-red-500" : usagePercent > 70 ? "bg-amber-500" : "bg-emerald-500"
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(usagePercent, 100)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* KPIs */}
      {system.kpiTargets && system.kpiTargets.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">KPIs</p>
          {system.kpiTargets.map((kpi, i) => {
            const current = kpi.name === "ROI" ? 2.3 : kpi.name === "Vendor Diversity" ? 3 : kpi.target;
            const met = kpi.isHigherBetter ? current >= kpi.target : current <= kpi.target;
            return (
              <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
                <div className="flex items-center gap-2">
                  {met ? (
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Target className="h-3.5 w-3.5 text-amber-400" />
                  )}
                  <span className="text-sm text-zinc-300">{kpi.name}</span>
                </div>
                <span className={`text-sm font-medium ${met ? "text-emerald-400" : "text-amber-400"}`}>
                  {current}{kpi.unit === "x" ? "x" : kpi.unit === "%" ? "%" : ""} / {kpi.target}{kpi.unit === "x" ? "x" : kpi.unit === "%" ? "%" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
