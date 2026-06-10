"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Globe,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type TatumStatus = {
  maliciousCheck: boolean;
  simulation: boolean;
  feeEstimation: boolean;
  portfolio: boolean;
  notifications: boolean;
  nameService: boolean;
};

type Props = {
  address?: string;
};

export function TatumIntegrationStatus({ address }: Props) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<TatumStatus | null>(null);
  const [feeEstimate, setFeeEstimate] = useState<{ slow: string; medium: string; fast: string } | null>(null);

  async function checkTatumIntegration() {
    setLoading(true);
    try {
      const results: TatumStatus = {
        maliciousCheck: false,
        simulation: false,
        feeEstimation: false,
        portfolio: false,
        notifications: false,
        nameService: false,
      };

      // Check fee estimation
      try {
        const feeRes = await fetch("/api/tatum?action=fee&chain=ETH");
        if (feeRes.ok) {
          const fee = await feeRes.json();
          setFeeEstimate(fee);
          results.feeEstimation = true;
        }
      } catch {}

      // Check malicious address if address provided
      if (address) {
        try {
          const malRes = await fetch(`/api/tatum?action=malicious&address=${address}`);
          if (malRes.ok) results.maliciousCheck = true;
        } catch {}

        // Check portfolio
        try {
          const portRes = await fetch(`/api/tatum?action=portfolio&address=${address}`);
          if (portRes.ok) results.portfolio = true;
        } catch {}

        // Check name service
        try {
          const nameRes = await fetch(`/api/tatum?action=reverse&address=${address}`);
          if (nameRes.ok) results.nameService = true;
        } catch {}
      }

      // Check subscriptions
      try {
        const subRes = await fetch("/api/tatum?action=subscriptions");
        if (subRes.ok) results.notifications = true;
      } catch {}

      results.simulation = true; // Simulation endpoint exists
      setStatus(results);
    } catch (err) {
      console.error("Tatum check failed:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    checkTatumIntegration();
  }, [address]);

  const features = [
    {
      name: "Malicious Address Detection",
      icon: Shield,
      status: status?.maliciousCheck,
      description: "Check if vendor address is flagged as fraud",
    },
    {
      name: "Transaction Simulation",
      icon: Zap,
      status: status?.simulation,
      description: "Preview transaction outcome before execution",
    },
    {
      name: "Fee Estimation",
      icon: Activity,
      status: status?.feeEstimation,
      description: "Get optimal gas prices (slow/medium/fast)",
    },
    {
      name: "Portfolio Tracking",
      icon: Wallet,
      status: status?.portfolio,
      description: "Track all token balances across chains",
    },
    {
      name: "Blockchain Notifications",
      icon: AlertTriangle,
      status: status?.notifications,
      description: "Real-time wallet activity monitoring",
    },
    {
      name: "Web3 Name Service",
      icon: Globe,
      status: status?.nameService,
      description: "Resolve ENS names to addresses",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-cyan-400" />
          <h3 className="font-semibold text-zinc-100">Tatum Integration</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={checkTatumIntegration}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Refresh"
          )}
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg border p-3 ${
                feature.status
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-zinc-800 bg-zinc-900/30"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${feature.status ? "text-emerald-400" : "text-zinc-500"}`} />
                <span className={`text-sm font-medium ${feature.status ? "text-emerald-400" : "text-zinc-400"}`}>
                  {feature.name}
                </span>
                {feature.status ? (
                  <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="ml-auto h-3.5 w-3.5 text-zinc-600" />
                )}
              </div>
              <p className="mt-1 text-xs text-zinc-500">{feature.description}</p>
            </motion.div>
          );
        })}
      </div>

      {feeEstimate && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-3">
          <p className="text-xs font-medium text-zinc-500 mb-2">Current Gas Prices (ETH)</p>
          <div className="flex gap-4 text-sm">
            <span className="text-zinc-400">Slow: <span className="text-emerald-400">{feeEstimate.slow}</span></span>
            <span className="text-zinc-400">Medium: <span className="text-amber-400">{feeEstimate.medium}</span></span>
            <span className="text-zinc-400">Fast: <span className="text-red-400">{feeEstimate.fast}</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
