"use client";

import { motion } from "framer-motion";
import { Shield, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { TrustScore } from "@/types/agent";

type Props = {
  trustScore: TrustScore;
  compact?: boolean;
};

const levelConfig = {
  restricted: { color: "text-[--trust-restricted]", bg: "bg-[rgba(239,68,68,0.1)]", border: "border-[--trust-restricted]/30", icon: AlertTriangle, label: "Restricted" },
  standard: { color: "text-[--trust-standard]", bg: "bg-[rgba(234,179,8,0.1)]", border: "border-[--trust-standard]/30", icon: Shield, label: "Standard" },
  trusted: { color: "text-[--trust-trusted]", bg: "bg-[rgba(34,197,94,0.1)]", border: "border-[--trust-trusted]/30", icon: CheckCircle2, label: "Trusted" },
  elite: { color: "text-[--trust-elite]", bg: "bg-[rgba(16,185,129,0.12)]", border: "border-[--trust-elite]/40", icon: TrendingUp, label: "Elite" },
};

export function TrustScoreBadge({ trustScore, compact }: Props) {
  const config = levelConfig[trustScore.level];
  const Icon = config.icon;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.bg} ${config.color} ${config.border} border`}>
        <Icon className="h-3 w-3" />
        {trustScore.score}
      </span>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border ${config.border} ${config.bg} p-4`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg ${config.bg} p-2`}>
            <Icon className={`h-5 w-5 ${config.color}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-300">Trust Score</p>
            <p className={`text-2xl font-bold ${config.color}`}>{trustScore.score}</p>
          </div>
        </div>
        <div className="text-right">
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
          <p className="text-xs text-zinc-500">Max: {trustScore.maxTxAmount} USDC/tx</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="mt-3 h-2 rounded-full bg-zinc-800">
        <motion.div
          className={`h-full rounded-full ${
            trustScore.level === "restricted" ? "bg-[--trust-restricted]" :
            trustScore.level === "standard" ? "bg-[--trust-standard]" :
            trustScore.level === "trusted" ? "bg-[--trust-trusted]" : "bg-[--trust-elite]"
          }`}
          initial={{ width: 0 }}
          animate={{ width: `${trustScore.score}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </div>

      {/* Recent events */}
      {trustScore.history.length > 0 && (
        <div className="mt-3 space-y-1">
          {trustScore.history.slice(0, 3).map((event, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
              {event.points >= 0 ? (
                <TrendingUp className="h-3 w-3 text-emerald-400" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-400" />
              )}
              <span className="truncate">{event.description}</span>
              <span className={event.points >= 0 ? "text-emerald-400" : "text-red-400"}>
                {event.points >= 0 ? "+" : ""}{event.points}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
