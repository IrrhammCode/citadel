"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, TrendingUp, TrendingDown, AlertTriangle, Shield, UserCheck } from "lucide-react";
import type { EnhancedVerdict } from "@/lib/venice/client";

type Props = {
  verdict: EnhancedVerdict | null;
  loading?: boolean;
};

export function EnhancedVerdictPanel({ verdict, loading }: Props) {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-6"
      >
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-zinc-400">Venice AI analyzing...</span>
        </div>
      </motion.div>
    );
  }

  if (!verdict) return null;

  const isApproved = verdict.decision === "approved";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border ${
          isApproved ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
        } p-6`}
      >
        {/* Decision */}
        <div className="flex items-center gap-3">
          {isApproved ? (
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          ) : (
            <XCircle className="h-6 w-6 text-red-400" />
          )}
          <div>
            <h3 className={`text-lg font-semibold ${isApproved ? "text-emerald-400" : "text-red-400"}`}>
              {isApproved ? "Approved" : "Blocked"}
            </h3>
            <p className="text-sm text-zinc-400">
              Confidence: {(verdict.confidence * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Reasoning */}
        <p className="mt-3 text-sm text-zinc-300">{verdict.reasoning}</p>

        {/* Flags */}
        {verdict.flags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {verdict.flags.map((flag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2.5 py-1 text-xs text-zinc-400"
              >
                <AlertTriangle className="h-3 w-3" />
                {flag}
              </span>
            ))}
          </div>
        )}

        {/* Pattern Analysis */}
        <div className="mt-4 rounded-lg bg-zinc-800/50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <TrendingUp className="h-4 w-4 text-cyan-400" />
            Pattern Analysis
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              verdict.patternAnalysis.trend === "normal" ? "bg-emerald-500/10 text-emerald-400" :
              verdict.patternAnalysis.trend === "unusual" ? "bg-amber-500/10 text-amber-400" :
              "bg-red-500/10 text-red-400"
            }`}>
              {verdict.patternAnalysis.trend === "anomaly" && <AlertTriangle className="h-3 w-3" />}
              {verdict.patternAnalysis.trend}
            </span>
            <span className={`text-xs ${
              verdict.patternAnalysis.riskLevel === "low" ? "text-emerald-400" :
              verdict.patternAnalysis.riskLevel === "medium" ? "text-amber-400" : "text-red-400"
            }`}>
              Risk: {verdict.patternAnalysis.riskLevel}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">{verdict.patternAnalysis.description}</p>
        </div>

        {/* Vendor Risk */}
        <div className="mt-3 rounded-lg bg-zinc-800/50 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
            <UserCheck className="h-4 w-4 text-purple-400" />
            Vendor Risk Assessment
          </div>
          <div className="mt-2 flex items-center gap-3">
            {verdict.vendorRisk.isNew && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                New Vendor
              </span>
            )}
            <span className="text-xs text-zinc-400">
              Trust: {verdict.vendorRisk.trustScore}/100
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-400">{verdict.vendorRisk.recommendation}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
