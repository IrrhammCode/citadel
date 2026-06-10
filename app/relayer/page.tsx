"use client";

import { useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, Server, ShieldCheck } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";

export default function RelayerPage() {
  const [use1Shot, setUse1Shot] = useState(true);
  const [sponsorGas, setSponsorGas] = useState(false);

  return (
    <AppShell
      title="Gas & Relayer Policies"
      description="Configure how autonomous transactions are broadcasted and paid for on-chain."
    >
      <div className="grid gap-6 md:grid-cols-2">
        <Stagger className="space-y-6" stagger={0.1}>
          <StaggerItem>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-emerald-400" />
                    <CardTitle className="text-lg">1Shot Permissionless Relayer</CardTitle>
                  </div>
                  <Switch checked={use1Shot} onCheckedChange={setUse1Shot} />
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
                    <span className="font-mono text-xs text-zinc-500">https://api.1shot.xyz/v1/relay</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>

          <StaggerItem>
            <Card className={use1Shot ? "opacity-100 transition-opacity" : "opacity-50 pointer-events-none transition-opacity"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-emerald-400" />
                    <CardTitle className="text-lg">Gas Sponsorship (Paymaster)</CardTitle>
                  </div>
                  <Switch checked={sponsorGas} onCheckedChange={setSponsorGas} />
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

        <FadeIn delay={0.3}>
          <Card className="h-full border-emerald-900/30 bg-emerald-950/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                Execution Metrics
              </CardTitle>
              <CardDescription>
                Overview of relayed transaction performance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Total Relayed (1Shot)</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-100">142 Tx</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Gas Saved (Sponsorship)</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-100">0.045 ETH</p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">USDC Paid for Gas</p>
                  <p className="mt-1 text-2xl font-semibold text-zinc-100">$ 12.50</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </AppShell>
  );
}
