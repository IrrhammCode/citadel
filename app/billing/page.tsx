"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Activity, LineChart, Cpu } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";
import { motion } from "framer-motion";

export default function AIBillingPage() {
  return (
    <AppShell
      title="AI Billing (x402)"
      description="Agentic payments for Venice AI compliance inference."
    >
      <FadeIn>
        <div className="mb-8 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-6">
          <div className="flex items-start justify-between">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-zinc-100">x402 Inference Streaming</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Citadel does not use static API keys for Venice AI. Instead, the platform uses an autonomous session key to pay for AI audits per-inference via ERC-7710 delegaton. This is true zero-trust A2A coordination.
              </p>
            </div>
            <BrainCircuit className="h-12 w-12 text-emerald-400/50" />
          </div>
        </div>
      </FadeIn>

      <div className="grid gap-6 md:grid-cols-3">
        <Stagger className="md:col-span-2 space-y-6" stagger={0.1}>
          <StaggerItem>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-emerald-400" />
                  Live Inference Stream
                </CardTitle>
                <CardDescription>Recent Venice AI compliance audit payments.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { model: "venice-70b-instruct", tokens: 842, cost: "0.0042", status: "Paid via 7710" },
                    { model: "venice-70b-instruct", tokens: 1205, cost: "0.0060", status: "Paid via 7710" },
                    { model: "venice-8b-fast", tokens: 450, cost: "0.0011", status: "Paid via 7710" },
                  ].map((stream, i) => (
                    <motion.div 
                      key={i}
                      whileHover={{ x: 4 }}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <Cpu className="h-4 w-4 text-zinc-500" />
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{stream.model}</p>
                          <p className="text-xs text-zinc-500">{stream.tokens} tokens processed</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-zinc-100">{stream.cost} USDC</p>
                        <p className="text-[10px] text-emerald-400">{stream.status}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        </Stagger>

        <FadeIn delay={0.2}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-emerald-400" />
                x402 Allowance
              </CardTitle>
              <CardDescription>Budget allocated to Citadel AI for self-audits.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-[4px] border-emerald-900/50">
                  <svg className="absolute inset-0 h-full w-full -rotate-90">
                    <circle
                      cx="60"
                      cy="60"
                      r="58"
                      fill="none"
                      stroke="rgba(16, 185, 129, 1)"
                      strokeWidth="4"
                      strokeDasharray="364"
                      strokeDashoffset="100"
                      className="transition-all duration-1000 ease-in-out"
                    />
                  </svg>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-zinc-100">72%</p>
                    <p className="text-[10px] uppercase tracking-wide text-zinc-500">Remaining</p>
                  </div>
                </div>
                
                <div className="mt-8 w-full space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Total Delegated</span>
                    <span className="font-semibold text-zinc-100">50.00 USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-400">Spent on Inference</span>
                    <span className="font-semibold text-zinc-100">14.00 USDC</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeIn>
      </div>
    </AppShell>
  );
}
