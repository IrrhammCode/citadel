"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpCircle, Loader2, CheckCircle2, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccount } from "wagmi";
import { toast } from "sonner";

type Props = {
  onUpgraded?: (smartAccountAddress: string) => void;
};

export function UpgradeToSmartAccount({ onUpgraded }: Props) {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(false);
  const [upgraded, setUpgraded] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  async function handleUpgrade() {
    if (!isConnected || !address) {
      toast.error("Connect MetaMask first");
      return;
    }

    setLoading(true);
    try {
      // Call 1Shot Relayer for EIP-7702 upgrade
      const res = await fetch("/api/upgrade-7702", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Upgrade failed");
      }

      const data = (await res.json()) as { txHash: string; smartAccountAddress: string };
      setTxHash(data.txHash);
      setUpgraded(true);
      toast.success("Upgraded to Smart Account!");
      onUpgraded?.(data.smartAccountAddress);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upgrade failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  if (upgraded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6"
      >
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          <div>
            <h3 className="font-semibold text-emerald-400">Smart Account Active</h3>
            <p className="text-sm text-zinc-400">Your EOA has been upgraded via EIP-7702</p>
          </div>
        </div>
        {txHash && (
          <p className="mt-3 text-xs text-zinc-500">
            TX: {txHash.slice(0, 18)}...
          </p>
        )}
        <div className="mt-4 flex items-center gap-4 text-sm text-zinc-400">
          <span className="flex items-center gap-1">
            <Shield className="h-4 w-4 text-cyan-400" />
            ERC-7715 ready
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-amber-400" />
            Gasless via 1Shot
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-cyan-500/10 p-2">
          <ArrowUpCircle className="h-5 w-5 text-cyan-400" />
        </div>
        <div>
          <h3 className="font-semibold text-zinc-100">Upgrade to Smart Account</h3>
          <p className="text-sm text-zinc-400">
            Enable EIP-7702 for gasless execution via 1Shot Relayer
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2 text-sm text-zinc-400">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>Gas abstraction (pay gas in USDC)</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>ERC-7710 delegation support</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>No per-transaction signing</span>
        </div>
      </div>

      <Button
        className="mt-4 w-full"
        onClick={handleUpgrade}
        disabled={loading || !isConnected}
      >
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <ArrowUpCircle className="mr-2 h-4 w-4" />
        )}
        Upgrade via 1Shot
      </Button>

      {!isConnected && (
        <p className="mt-2 text-center text-xs text-zinc-500">
          Connect MetaMask to upgrade
        </p>
      )}
    </motion.div>
  );
}
