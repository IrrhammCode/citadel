"use client";

import { motion } from "framer-motion";
import { Wallet, ArrowRight } from "lucide-react";
import type { BudgetPool } from "@/types/agent";
import { AUTONOMOUS_SYSTEMS } from "@/types/system";

type Props = {
  pool: BudgetPool;
};

export function BudgetPoolCard({ pool }: Props) {
  const usagePercent = pool.totalBudget > 0 ? (pool.allocated / pool.totalBudget) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="vault-card"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-cyan-500/10 p-2">
          <Wallet className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-100">Budget Pool</h3>
          <p className="text-sm text-zinc-400">{pool.totalBudget} USDC total</p>
        </div>
      </div>

      {/* Pool bar */}
      <div className="mt-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-zinc-400">Allocated</span>
          <span className="text-zinc-200">{pool.allocated} / {pool.totalBudget} USDC</span>
        </div>
        <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
          <div className="flex h-full">
            {pool.allocations.map((alloc, i) => {
              const width = (alloc.amount / pool.totalBudget) * 100;
              const colors = ["bg-cyan-500", "bg-emerald-500", "bg-amber-500", "bg-purple-500"];
              return (
                <motion.div
                  key={`${alloc.systemId}-${i}`}
                  className={`h-full ${colors[i % colors.length]}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${width}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1 }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Allocations */}
      <div className="mt-4 space-y-2">
        {pool.allocations.map((alloc, i) => {
          const system = AUTONOMOUS_SYSTEMS.find((s) => s.id === alloc.systemId);
          const colors = ["text-cyan-400", "text-emerald-400", "text-amber-400", "text-purple-400"];
          const bgColors = ["bg-cyan-500/10", "bg-emerald-500/10", "bg-amber-500/10", "bg-purple-500/10"];
          return (
            <div key={`${alloc.systemId}-${i}`} className="flex items-center justify-between rounded-lg bg-zinc-800/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${bgColors[i % bgColors.length]} ${colors[i % colors.length]}`} style={{ backgroundColor: "currentColor" }} />
                <span className="text-sm text-zinc-300">{system?.name || alloc.systemId}</span>
              </div>
              <span className={`text-sm font-medium ${colors[i % colors.length]}`}>
                {alloc.amount} USDC
              </span>
            </div>
          );
        })}

        {pool.unallocated > 0 && (
          <div className="flex items-center justify-between rounded-lg bg-zinc-800/30 px-3 py-2 border border-dashed border-zinc-700">
            <span className="text-sm text-zinc-500">Unallocated</span>
            <span className="text-sm font-medium text-zinc-400">{pool.unallocated} USDC</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
