"use client";

import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network, ArrowDown, ShieldAlert, CheckCircle2 } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";

export default function AgentNetworkPage() {
  return (
    <AppShell
      title="Agent Network"
      description="Visualize and manage Agent-to-Agent (A2A) redelegations."
    >
      <FadeIn>
        <Card className="mb-6 border-emerald-900/50 bg-emerald-950/10">
          <CardHeader>
            <CardTitle className="text-emerald-400">A2A Redelegation Hub</CardTitle>
            <CardDescription>
              Grant a parent permission to a Master Agent, and watch it autonomously redelegate sub-permissions to its worker scripts.
            </CardDescription>
          </CardHeader>
        </Card>
      </FadeIn>

      <div className="flex flex-col items-center py-10">
        <Stagger className="flex w-full max-w-2xl flex-col items-center gap-2" stagger={0.2}>
          {/* CFO Level */}
          <StaggerItem>
            <div className="flex w-64 flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg">
              <ShieldAlert className="mb-2 h-8 w-8 text-zinc-400" />
              <h3 className="font-semibold text-zinc-100">CFO (You)</h3>
              <Badge variant="outline" className="mt-2 text-xs">Origin Signer</Badge>
            </div>
          </StaggerItem>

          <StaggerItem>
            <motion.div
              animate={{ y: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <ArrowDown className="h-6 w-6 text-zinc-600" />
            </motion.div>
          </StaggerItem>

          {/* Master Agent Level */}
          <StaggerItem>
            <div className="flex w-72 flex-col items-center rounded-xl border border-emerald-800/50 bg-emerald-900/20 p-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
              <Network className="mb-2 h-8 w-8 text-emerald-400" />
              <h3 className="font-semibold text-zinc-100">DevOps Master Agent</h3>
              <p className="mt-1 text-xs text-zinc-400">Allowance: 1000 USDC/day</p>
              <Badge className="mt-2 text-xs bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20">Delegated via ERC-7715</Badge>
            </div>
          </StaggerItem>

          <StaggerItem className="flex w-full justify-center gap-16 px-8 py-2">
            <div className="flex w-full justify-between">
              <motion.div className="flex flex-1 justify-center" animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}>
                <ArrowDown className="h-6 w-6 text-zinc-600" />
              </motion.div>
              <motion.div className="flex flex-1 justify-center" animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity, delay: 0.4 }}>
                <ArrowDown className="h-6 w-6 text-zinc-600" />
              </motion.div>
            </div>
          </StaggerItem>

          {/* Sub Agents Level */}
          <StaggerItem className="flex w-full max-w-xl justify-between gap-4">
            <div className="flex w-full flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
              <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-500" />
              <h3 className="text-sm font-semibold text-zinc-100">AWS Billing Script</h3>
              <p className="mt-1 text-xs text-zinc-500">Sub-Allowance: 500 USDC</p>
              <Badge variant="outline" className="mt-2 border-emerald-900/50 text-[10px] text-emerald-400/70">Redelegated (Active)</Badge>
            </div>
            
            <div className="flex w-full flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
              <CheckCircle2 className="mb-2 h-6 w-6 text-emerald-500" />
              <h3 className="text-sm font-semibold text-zinc-100">Vercel Scaling Script</h3>
              <p className="mt-1 text-xs text-zinc-500">Sub-Allowance: 200 USDC</p>
              <Badge variant="outline" className="mt-2 border-emerald-900/50 text-[10px] text-emerald-400/70">Redelegated (Active)</Badge>
            </div>
          </StaggerItem>
        </Stagger>
      </div>
    </AppShell>
  );
}
