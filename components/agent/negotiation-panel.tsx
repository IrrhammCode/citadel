"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightLeft, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNegotiation } from "@/hooks/useNegotiation";
import { getNegotiations, getBudgetPool } from "@/lib/storage";
import { AUTONOMOUS_SYSTEMS } from "@/types/system";

type Props = {
  systemId: string;
};

export function NegotiationPanel({ systemId }: Props) {
  const { requestBudget, loading, error } = useNegotiation();
  const [amount, setAmount] = useState("50");
  const [reason, setReason] = useState("");
  const [lastResult, setLastResult] = useState<{ approved: boolean; reasoning: string } | null>(null);

  const negotiations = getNegotiations(systemId);
  const pool = getBudgetPool();

  async function handleRequest() {
    if (!reason) return;
    const result = await requestBudget(systemId, parseFloat(amount), reason);
    if (result) {
      setLastResult({
        approved: result.status === "approved",
        reasoning: result.veniceVerdict || "No reasoning provided",
      });
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ArrowRightLeft className="h-5 w-5 text-purple-400" />
        <h3 className="font-semibold text-zinc-100">Budget Negotiation</h3>
      </div>

      <p className="text-sm text-zinc-400">
        Request additional budget from other agents or the unallocated pool.
      </p>

      {/* Current pool info */}
      <div className="rounded-lg bg-zinc-800/50 p-3">
        <div className="flex justify-between text-sm">
          <span className="text-zinc-400">Available in pool</span>
          <span className="text-zinc-200">{pool.unallocated} USDC</span>
        </div>
      </div>

      {/* Request form */}
      <div className="space-y-3">
        <div>
          <Label className="text-zinc-400">Amount (USDC)</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="mt-1 bg-zinc-800 border-zinc-700"
            placeholder="50"
          />
        </div>
        <div>
          <Label className="text-zinc-400">Reason</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 bg-zinc-800 border-zinc-700"
            placeholder="Found vendor with 4x ROI potential..."
          />
        </div>
        <Button
          onClick={handleRequest}
          disabled={loading || !reason}
          className="w-full"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRightLeft className="mr-2 h-4 w-4" />
          )}
          Request Budget
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      <AnimatePresence>
        {lastResult && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-lg border ${
              lastResult.approved ? "border-emerald-500/30 bg-emerald-500/5" : "border-red-500/30 bg-red-500/5"
            } p-4`}
          >
            <div className="flex items-center gap-2">
              {lastResult.approved ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400" />
              )}
              <span className={lastResult.approved ? "text-emerald-400" : "text-red-400"}>
                {lastResult.approved ? "Budget Approved" : "Budget Rejected"}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">{lastResult.reasoning}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {negotiations.length > 0 && (
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Recent Negotiations</p>
          <div className="space-y-2">
            {negotiations.slice(0, 5).map((n) => {
              const fromSystem = AUTONOMOUS_SYSTEMS.find((s) => s.id === n.fromSystemId);
              const toSystem = n.toSystemId === "pool" ? "Pool" : AUTONOMOUS_SYSTEMS.find((s) => s.id === n.toSystemId)?.name;
              return (
                <div key={n.id} className="rounded-lg bg-zinc-800/30 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-zinc-300">{fromSystem?.name}</span>
                      <ArrowRightLeft className="h-3 w-3 text-zinc-500" />
                      <span className="text-zinc-400">{toSystem}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-zinc-300">{n.amount} USDC</span>
                      {n.status === "approved" ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : n.status === "rejected" ? (
                        <XCircle className="h-3.5 w-3.5 text-red-400" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">{n.reason}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
