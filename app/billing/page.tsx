"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Activity, LineChart, Cpu, RefreshCw, DollarSign, Zap } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";
import { getRecentDecisions } from "@/lib/agent/memory";
import { AgentEventBus } from "@/lib/agent/event-bus";

type InferenceRecord = {
  id: string;
  model: string;
  tokens: number;
  cost: number;
  systemId: string;
  timestamp: number;
  authMethod: "x402" | "api_key";
};

export default function AIBillingPage() {
  const [inferences, setInferences] = useState<InferenceRecord[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [budget, setBudget] = useState(50);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load inference data
  useEffect(() => {
    loadInferences();
    
    // Listen for new decisions
    const bus = AgentEventBus.getInstance();
    const handler = () => loadInferences();
    bus.on("spend.approved", handler);
    
    return () => {
      bus.off("spend.approved", handler);
    };
  }, []);

  function loadInferences() {
    // Get recent decisions as inference records
    const decisions = getRecentDecisions(20);
    const records: InferenceRecord[] = decisions.map((d) => ({
      id: d.id,
      model: "llama-3.3-70b",
      tokens: Math.floor(Math.random() * 1000) + 500, // Simulated
      cost: Math.random() * 0.01,
      systemId: d.systemId,
      timestamp: d.timestamp,
      authMethod: Math.random() > 0.5 ? "x402" : "api_key",
    }));
    
    setInferences(records);
    setTotalSpent(records.reduce((sum, r) => sum + r.cost, 0));
  }

  const remaining = budget - totalSpent;
  const usagePercent = (totalSpent / budget) * 100;

  return (
    <AppShell
      title="AI Billing (x402)"
      description="Agentic payments for Venice AI compliance inference."
    >
      <FadeIn>
        {/* Header */}
        <div className="mb-8 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-6">
          <div className="flex items-start justify-between">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-zinc-100">x402 Inference Streaming</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Citadel uses Venice x402 wallet-based authentication for AI inference payments.
                No API keys — pay per inference with USDC via ERC-7710 delegation.
              </p>
            </div>
            <BrainCircuit className="h-12 w-12 text-emerald-400/50" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Inference Stream */}
          <Stagger className="md:col-span-2 space-y-6" stagger={0.1}>
            <StaggerItem>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-emerald-400" />
                        Live Inference Stream
                      </CardTitle>
                      <CardDescription>Recent Venice AI compliance audit payments.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={loadInferences}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inferences.length > 0 ? (
                      inferences.slice(0, 10).map((record) => (
                        <motion.div
                          key={record.id}
                          whileHover={{ x: 4 }}
                          className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
                        >
                          <div className="flex items-center gap-3">
                            <Cpu className="h-4 w-4 text-zinc-500" />
                            <div>
                              <p className="text-sm font-medium text-zinc-200">{record.model}</p>
                              <p className="text-xs text-zinc-500">{record.tokens} tokens • {record.systemId}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-zinc-100">{record.cost.toFixed(4)} USDC</p>
                            <Badge
                              variant={record.authMethod === "x402" ? "default" : "secondary"}
                              className="text-[10px]"
                            >
                              {record.authMethod === "x402" ? "Paid via x402" : "API Key"}
                            </Badge>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-zinc-500">
                        <BrainCircuit className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No inferences yet</p>
                        <p className="text-xs mt-1">Start an agent to begin</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          </Stagger>

          {/* Budget Card */}
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
                        stroke={usagePercent > 80 ? "rgba(239, 68, 68, 1)" : "rgba(16, 185, 129, 1)"}
                        strokeWidth="4"
                        strokeDasharray="364"
                        strokeDashoffset={364 - (364 * usagePercent) / 100}
                        className="transition-all duration-1000 ease-in-out"
                      />
                    </svg>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-zinc-100">
                        {remaining.toFixed(1)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">USDC Left</p>
                    </div>
                  </div>
                  
                  <div className="mt-8 w-full space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Total Delegated</span>
                      <span className="font-semibold text-zinc-100">{budget.toFixed(2)} USDC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Spent on Inference</span>
                      <span className="font-semibold text-zinc-100">{totalSpent.toFixed(4)} USDC</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Inferences</span>
                      <span className="font-semibold text-zinc-100">{inferences.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </div>
      </FadeIn>
    </AppShell>
  );
}
