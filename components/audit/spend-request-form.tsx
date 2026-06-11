"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EnhancedVerdictPanel } from "@/components/audit/enhanced-verdict-panel";
import { useEnhancedAudit } from "@/hooks/useEnhancedAudit";
import { LoadingBar } from "@/components/motion/loading-bar";
import { FadeIn } from "@/components/motion/motion";
import {
  getDailySpend,
  getPermissionForSystem,
  addDailySpend,
} from "@/lib/storage";
import {
  SUSPICIOUS_ADDRESS,
  DEFAULT_VENDOR_ADDRESS,
} from "@/lib/constants";
import type { AutonomousSystem } from "@/types/system";

type Props = {
  system: AutonomousSystem;
};

export function SpendRequestForm({ system }: Props) {
  const { audit, loading, error, verdict, reset } = useEnhancedAudit();
  const [amount, setAmount] = useState("8");
  const [recipient, setRecipient] = useState<string>(DEFAULT_VENDOR_ADDRESS);
  const [memo, setMemo] = useState("Q2 marketing vendor invoice #1042");
  const [executing, setExecuting] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const permission = getPermissionForSystem(system.id);

  async function submitSpend() {
    if (!permission) {
      toast.error("Grant permission to this system first from the dashboard");
      return;
    }

    reset();
    setTxHash(null);

    const result = await audit({
      systemId: system.id,
      spendRequest: {
        amount,
        token: "USDC",
        recipient,
        memo,
      },
      permission: {
        maxDailySpend: permission.maxDailySpend,
        expiry: permission.expiry,
        justification: permission.justification,
      },
      priorSpendToday: getDailySpend(system.id),
      customPrompt: system.customPrompt,
    });

    if (result?.decision === "approved") {
      addDailySpend(system.id, amount);
    }
  }

  async function executeApproved() {
    if (!verdict || !permission || verdict.decision !== "approved") {
      return;
    }

    setExecuting(true);
    try {
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auditId: crypto.randomUUID(),
          systemId: system.id,
          spendRequest: { amount, token: "USDC", recipient, memo },
          grantedPermissions: permission.grantedPermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Execution failed");

      setTxHash(data.txHash);
      toast.success("Transaction submitted via delegation");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Execution failed");
    } finally {
      setExecuting(false);
    }
  }

  return (
    <div className="space-y-6">
      <FadeIn>
        <Card>
          <CardHeader>
            <CardTitle>Vendor Payment Request</CardTitle>
            <CardDescription>
              Submit a spend request for Venice AI compliance review before on-chain
              execution.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <AnimatePresence>
              {!permission && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-300"
                >
                  No permission granted for this system. Go to the dashboard and
                  grant ERC-7715 permissions first.
                </motion.div>
              )}
            </AnimatePresence>

            <div className="grid gap-5 sm:grid-cols-2">
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Label className="text-xs font-medium uppercase tracking-wider text-zinc-400">Amount (USDC)</Label>
                <Input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-10 border-zinc-700 bg-zinc-900/50 text-sm transition-colors focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                />
              </motion.div>
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <Label className="text-xs font-medium uppercase tracking-wider text-zinc-400">Recipient</Label>
                <Input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="h-10 border-zinc-700 bg-zinc-900/50 font-mono text-xs transition-colors focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
                />
              </motion.div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-zinc-400">Memo</Label>
              <Input
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="h-10 border-zinc-700 bg-zinc-900/50 text-sm transition-colors focus-visible:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20"
              />
            </div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={submitSpend}
                disabled={loading || !permission}
                className="w-full gap-2 bg-emerald-600 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 disabled:opacity-50 sm:w-auto"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Venice AI auditing...
                  </>
                ) : (
                  "Submit for Compliance Audit"
                )}
              </Button>
            </motion.div>

            <AnimatePresence>
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3"
                >
                  <LoadingBar />
                  <p className="mt-2 text-xs font-medium text-emerald-400/80">
                    Analyzing policy compliance via Venice AI...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-sm text-red-400"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </FadeIn>

      <AnimatePresence mode="wait">
        {verdict && (
          <motion.div
            key={verdict.decision + verdict.reasoning.slice(0, 20)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <EnhancedVerdictPanel verdict={verdict} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {verdict?.decision === "approved" && permission && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Execute on-chain</CardTitle>
                <CardDescription>
                  Redeem ERC-7710 delegation via session account after Venice approval.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    onClick={executeApproved}
                    disabled={executing}
                    className="gap-2 bg-emerald-600 font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-500 hover:shadow-emerald-500/30 disabled:opacity-50"
                  >
                    {executing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting transaction...
                      </>
                    ) : (
                      "Execute via Delegation"
                    )}
                  </Button>
                </motion.div>
                <AnimatePresence>
                  {txHash && (
                    <motion.a
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      href={`https://sepolia.etherscan.io/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm text-emerald-400 hover:underline"
                    >
                      View on Sepolia Etherscan: {txHash.slice(0, 14)}...
                    </motion.a>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
