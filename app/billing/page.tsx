"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Activity, LineChart, Cpu, RefreshCw } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";

type InferenceRecord = {
  id: string;
  operation: string;
  model: string;
  tokens: number;
  costUsd: number;
  systemId?: string;
  timestamp: number;
  authMethod: "x402" | "api_key";
  latencyMs: number;
};

type BillingData = {
  budget: number;
  totalSpent: number;
  remaining: number;
  inferences: InferenceRecord[];
  x402: { canConsume: boolean; balanceUsd: number; minimumTopUpUsd: number } | null;
  authMethod: "x402" | "api_key";
};

export default function AIBillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [health, setHealth] = useState<{ ok: boolean; latencyMs: number; model: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [billingRes, healthRes] = await Promise.all([
        fetch("/api/billing"),
        fetch("/api/venice/health"),
      ]);
      if (billingRes.ok) setData(await billingRes.json());
      if (healthRes.ok) {
        const h = await healthRes.json();
        setHealth({ ok: h.ok, latencyMs: h.latencyMs, model: h.model });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const budget = data?.budget ?? 50;
  const totalSpent = data?.totalSpent ?? 0;
  const remaining = data?.remaining ?? budget;
  const usagePercent = budget > 0 ? (totalSpent / budget) * 100 : 0;
  const isLowBudget = (remaining / budget) * 100 < 20;
  const inferences = data?.inferences ?? [];

  return (
    <AppShell
      title="AI Billing (x402)"
      description="Venice AI inference usage — real x402 balance when configured."
    >
      <FadeIn>
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {health && (
              <Badge variant={health.ok ? "default" : "destructive"}>
                Venice {health.ok ? "online" : "offline"} · {health.latencyMs}ms
              </Badge>
            )}
            {data?.x402 && (
              <Badge variant="secondary">
                x402 balance: ${data.x402.balanceUsd.toFixed(2)}
              </Badge>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="mb-8 rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-6">
          <div className="flex items-start justify-between">
            <div className="max-w-2xl">
              <h2 className="text-xl font-semibold text-zinc-100">Venice AI Observability</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                Real inference tracking from VeniceService gateway.
                Auth: {data?.authMethod ?? "api_key"}
                {data?.x402 ? ` · x402 wallet balance $${data.x402.balanceUsd.toFixed(2)}` : ""}
              </p>
            </div>
            <BrainCircuit className="h-12 w-12 text-emerald-400/50" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <Stagger className="md:col-span-2 space-y-6" stagger={0.1}>
            <StaggerItem>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-emerald-400" />
                    Inference Stream
                  </CardTitle>
                  <CardDescription>Tracked Venice AI calls (audit, think, report).</CardDescription>
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
                              <p className="text-sm font-medium text-zinc-200">
                                {record.operation} · {record.model}
                              </p>
                              <p className="font-mono text-[13px] text-zinc-500">
                                {record.tokens} tokens · {record.latencyMs}ms
                                {record.systemId ? ` · ${record.systemId}` : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-semibold text-zinc-100">
                              ${record.costUsd.toFixed(4)}
                            </p>
                            <Badge variant={record.authMethod === "x402" ? "default" : "secondary"} className="text-[10px]">
                              {record.authMethod}
                            </Badge>
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="py-8 text-center text-zinc-500">
                        <BrainCircuit className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No inferences yet — run an agent or audit</p>
                      </div>
                    )}
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
                  Budget
                </CardTitle>
                <CardDescription>
                  {data?.x402
                    ? `x402 wallet: $${data.x402.balanceUsd.toFixed(2)} available`
                    : "API key mode — estimated costs"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center justify-center py-6">
                  <div className={`relative flex h-32 w-32 items-center justify-center rounded-full border-[4px] ${isLowBudget ? "border-red-900/60" : "border-emerald-900/50"}`}>
                    <div className="text-center">
                      <p className={`text-2xl font-bold ${isLowBudget ? "text-red-400" : "text-emerald-400"}`}>
                        ${remaining.toFixed(2)}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-500">Remaining</p>
                    </div>
                  </div>
                  <div className="mt-8 w-full space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Budget</span>
                      <span className="font-mono text-zinc-100">${budget.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Spent</span>
                      <span className="font-mono text-zinc-100">${totalSpent.toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Inferences</span>
                      <span className="font-mono text-zinc-100">{inferences.length}</span>
                    </div>
                    <div className="h-2 rounded-full bg-zinc-800 mt-2">
                      <div
                        className={`h-full rounded-full transition-all ${isLowBudget ? "bg-red-500" : "bg-emerald-500"}`}
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
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
