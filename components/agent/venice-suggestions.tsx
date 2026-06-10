"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, Loader2, TrendingUp, DollarSign, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuditLog, getBudgetPool, getTrustScore, getAnomalies } from "@/lib/storage";
import { AUTONOMOUS_SYSTEMS } from "@/types/system";

type Suggestion = {
  type: "budget" | "vendor" | "trust" | "risk";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  action: string;
};

type Props = {
  systemId?: string;
};

export function VeniceSuggestions({ systemId }: Props) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  async function generateSuggestions() {
    setLoading(true);
    try {
      const pool = getBudgetPool();
      const anomalies = getAnomalies(systemId);
      const auditLog = getAuditLog();

      const systems = systemId
        ? AUTONOMOUS_SYSTEMS.filter((s) => s.id === systemId)
        : AUTONOMOUS_SYSTEMS;

      const systemData = systems.map((s) => {
        const trust = getTrustScore(s.id);
        const spent = auditLog
          .filter((r) => r.systemId === s.id && r.verdict.decision === "approved")
          .reduce((sum, r) => sum + parseFloat(r.spendRequest.amount), 0);
        const systemAnomalies = anomalies.filter((a) => a.systemId === s.id && !a.resolved);
        return { ...s, trust, spent, anomalies: systemAnomalies };
      });

      const res = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemData: systemData.map((s) => ({
            id: s.id,
            name: s.name,
            budget: s.budget,
            spent: s.spent,
            trustScore: s.trust.score,
            trustLevel: s.trust.level,
            anomalyCount: s.anomalies.length,
            kpis: s.kpiTargets,
          })),
          pool,
          totalAnomalies: anomalies.filter((a) => !a.resolved).length,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate suggestions");
      const data = (await res.json()) as { suggestions: Suggestion[] };
      setSuggestions(data.suggestions);
    } catch (err) {
      console.error("Suggestions error:", err);
    } finally {
      setLoading(false);
    }
  }

  const iconMap = {
    budget: DollarSign,
    vendor: Users,
    trust: TrendingUp,
    risk: Shield,
  };

  const colorMap = {
    high: "text-red-400 bg-red-500/10 border-red-500/30",
    medium: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    low: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          <h3 className="font-semibold text-zinc-100">Venice AI Suggestions</h3>
        </div>
        <Button size="sm" onClick={generateSuggestions} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="mr-2 h-4 w-4" />
          )}
          Generate
        </Button>
      </div>

      {suggestions.length === 0 && !loading && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6 text-center">
          <Lightbulb className="mx-auto h-8 w-8 text-zinc-600" />
          <p className="mt-2 text-sm text-zinc-500">Click Generate to get AI recommendations</p>
        </div>
      )}

      <div className="space-y-3">
        {suggestions.map((s, i) => {
          const Icon = iconMap[s.type];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`rounded-lg border p-4 ${colorMap[s.priority]}`}
            >
              <div className="flex items-start gap-3">
                <Icon className="mt-0.5 h-5 w-5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{s.title}</span>
                    <span className="rounded-full px-2 py-0.5 text-xs uppercase">
                      {s.priority}
                    </span>
                  </div>
                  <p className="mt-1 text-sm opacity-80">{s.description}</p>
                  <p className="mt-2 text-sm font-medium opacity-90">→ {s.action}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
