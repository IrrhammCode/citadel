"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertOctagon, Info, CheckCircle2, X } from "lucide-react";
import type { Anomaly } from "@/types/agent";
import { resolveAnomaly } from "@/lib/storage";

type Props = {
  anomalies: Anomaly[];
  onResolve?: () => void;
};

const severityConfig = {
  low: { color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", icon: Info },
  medium: { color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", icon: AlertTriangle },
  high: { color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30", icon: AlertOctagon },
  critical: { color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30", icon: AlertOctagon },
};

export function AnomalyAlerts({ anomalies, onResolve }: Props) {
  const unresolved = anomalies.filter((a) => !a.resolved);

  if (unresolved.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          <span className="text-sm font-medium">No anomalies detected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-medium text-zinc-300">
          {unresolved.length} Anomal{unresolved.length === 1 ? "y" : "ies"} Detected
        </h3>
      </div>

      <AnimatePresence>
        {unresolved.map((anomaly) => {
          const config = severityConfig[anomaly.severity];
          const Icon = config.icon;

          return (
            <motion.div
              key={anomaly.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`rounded-lg border ${config.border} ${config.bg} p-3`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2">
                  <Icon className={`mt-0.5 h-4 w-4 ${config.color}`} />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{anomaly.description}</p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                      <span>{anomaly.amount} USDC</span>
                      <span>{anomaly.recipient.slice(0, 10)}...</span>
                      <span>{new Date(anomaly.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    resolveAnomaly(anomaly.id, "Manually resolved");
                    onResolve?.();
                  }}
                  className="rounded p-1 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
