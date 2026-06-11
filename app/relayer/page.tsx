"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Zap, Server, ShieldCheck, RefreshCw, Activity, CheckCircle2, XCircle } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";
import { getRecentDecisions } from "@/lib/agent/memory";
import { AgentEventBus } from "@/lib/agent/event-bus";

type RelayStats = {
  totalRelayed: number;
  successful: number;
  failed: number;
  gasSaved: number;
  usdcPaidForGas: number;
};

export default function RelayerPage() {
  const [use1Shot, setUse1Shot] = useState(true);
  const [sponsorGas, setSponsorGas] = useState(false);
  const [stats, setStats] = useState<RelayStats>({
    totalRelayed: 0,
    successful: 0,
    failed: 0,
    gasSaved: 0,
    usdcPaidForGas: 0,
  });
  const [recentTxs, setRecentTxs] = useState<any[]>([]);

  // Load relay data
  useEffect(() => {
    loadRelayData();
    
    // Listen for events
    const bus = AgentEventBus.getInstance();
    const handler = () => loadRelayData();
    bus.on("spend.approved", handler);
    bus.on("agent.error", handler);
    
    return () => {
      bus.off("spend.approved", handler);
      bus.off("agent.error", handler);
    };
  }, []);

  function loadRelayData() {
    const decisions = getRecentDecisions(50);
    
    // Calculate stats from decisions
    const totalRelayed = decisions.length;
    const successful = decisions.filter((d) => d.outcome?.success !== false).length;
    const failed = totalRelayed - successful;
    const gasSaved = successful * 0.0003; // Estimated ETH saved per tx
    const usdcPaidForGas = successful * 0.15; // Estimated USDC for gas
    
    setStats({ totalRelayed, successful, failed, gasSaved, usdcPaidForGas });
    
    // Build recent transactions
    const txs = decisions.slice(0, 10).map((d) => ({
      id: d.id,
      systemId: d.systemId,
      action: d.decision.actions[0]?.type || "unknown",
      status: d.outcome?.success !== false ? "confirmed" : "failed",
      timestamp: d.timestamp,
      hash: d.outcome?.txHash || "0x" + d.id.slice(0, 8),
    }));
    
    setRecentTxs(txs);
  }

  return (
    <AppShell
      title="Gas & Relayer Policies"
      description="Configure how autonomous transactions are broadcasted and paid for on-chain."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Stagger className="space-y-6" stagger={0.1}>
          {/* 1Shot Relayer */}
          <StaggerItem>
            <Card className="transition-all duration-200 hover:border-emerald-900/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-emerald-400" />
                    <CardTitle className="text-lg">1Shot Permissionless Relayer</CardTitle>
                  </div>
                  <Switch
                    checked={use1Shot}
                    onCheckedChange={setUse1Shot}
                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-600"
                  />
                </div>
                <CardDescription className="mt-2">
                  Route ERC-7710 transactions through the 1Shot mainnet relayer instead of public RPCs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-zinc-300">Status</span>
                    {use1Shot ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">Active</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-zinc-400">Disabled</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
                    <span className="text-sm font-medium text-zinc-300">Endpoint</span>
                    <span className="font-mono text-xs text-zinc-500">https://relayer.1shotapi.com/v1/rpc</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-zinc-800 pt-3">
                    <span className="text-sm font-medium text-zinc-300">Supported Chains</span>
                    <div className="flex gap-1">
                      {["ETH", "Base", "Arb", "OP"].map((chain) => (
                        <Badge key={chain} variant="outline" className="text-[10px]">
                          {chain}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          {/* Gas Sponsorship */}
          <StaggerItem>
            <Card className={`transition-all duration-200 hover:border-emerald-900/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)] ${use1Shot ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-emerald-400" />
                    <CardTitle className="text-lg">Gas Sponsorship (Paymaster)</CardTitle>
                  </div>
                  <Switch
                    checked={sponsorGas}
                    onCheckedChange={setSponsorGas}
                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-600"
                  />
                </div>
                <CardDescription className="mt-2">
                  Sponsor gas fees for your agents, or force them to pay gas using ERC-20 stablecoins.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 text-sm text-zinc-400">
                  <p>
                    {sponsorGas 
                      ? "Your treasury paymaster will cover all ETH gas fees for delegated transactions."
                      : "Agents will pay for gas using their USDC allowance via 1Shot's stablecoin relayer."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </Stagger>

        {/* Execution Metrics */}
        <FadeIn delay={0.3}>
          <Card className="h-full border-emerald-900/30 bg-emerald-950/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-emerald-400" />
                  Execution Metrics
                </CardTitle>
                <Button variant="outline" size="sm" onClick={loadRelayData}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Overview of relayed transaction performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 mb-6">
                <div className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-all duration-200 hover:border-emerald-900/50 hover:bg-zinc-900/60">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Relayed (1Shot)</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-zinc-100 font-mono">{stats.totalRelayed} <span className="text-sm font-normal text-zinc-500">Tx</span></p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-all duration-200 hover:border-emerald-900/50 hover:bg-zinc-900/60">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">Successful</p>
                    </div>
                    <p className="mt-2 text-xl font-bold text-emerald-400 font-mono">{stats.successful}</p>
                  </div>
                  <div className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-all duration-200 hover:border-red-900/40 hover:bg-zinc-900/60">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-3.5 w-3.5 text-zinc-500 group-hover:text-red-400 transition-colors" />
                      <p className="text-xs text-zinc-500 uppercase tracking-wider">Failed</p>
                    </div>
                    <p className="mt-2 text-xl font-bold text-red-400 font-mono">{stats.failed}</p>
                  </div>
                </div>
                <div className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-all duration-200 hover:border-emerald-900/50 hover:bg-zinc-900/60">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Gas Saved (Sponsorship)</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-zinc-100 font-mono">{stats.gasSaved.toFixed(3)} <span className="text-sm font-normal text-zinc-500">ETH</span></p>
                </div>
                <div className="group rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 transition-all duration-200 hover:border-emerald-900/50 hover:bg-zinc-900/60">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-zinc-500 group-hover:text-emerald-400 transition-colors" />
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">USDC Paid for Gas</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-zinc-100 font-mono">${stats.usdcPaidForGas.toFixed(2)}</p>
                </div>
              </div>

              {/* Recent Transactions */}
              <div>
                <h3 className="text-sm font-medium text-zinc-300 mb-3">Recent Transactions</h3>
                <div className="space-y-2">
                  {recentTxs.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-2"
                    >
                      <div className="flex items-center gap-2">
                        {tx.status === "confirmed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-400" />
                        )}
                        <div>
                          <p className="text-xs font-medium text-zinc-200">{tx.systemId}</p>
                          <p className="text-[10px] text-zinc-500">{tx.action}</p>
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-zinc-500 tracking-tight">{tx.hash.slice(0, 10)}…</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </AppShell>
  );
}
