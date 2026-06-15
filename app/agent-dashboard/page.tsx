"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Brain,
  Play,
  Pause,
  RefreshCw,
  Activity,
  Zap,
  Loader2,
  ShieldCheck,
  ShieldX,
  ArrowRight,
  UserPlus,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";
import { PipelineGuide } from "@/components/flow/pipeline-guide";
import { ActivityFeed } from "@/components/agent/activity-feed";
import { VeniceChat } from "@/components/agent/venice-chat";
import { useSystems } from "@/hooks/useSystems";
import { usePermissions } from "@/hooks/usePermissions";
import { useServerSync } from "@/hooks/useServerSync";
import { getRecentDecisions } from "@/lib/agent/memory";
import { toast } from "sonner";
import { syncToServer, pullFromServer } from "@/lib/store-sync";

type AgentStatus = {
  systemId: string;
  isRunning: boolean;
  cycleCount: number;
  lastCycle: number;
  lastError?: string;
};

export default function AgentDashboardPage() {
  const { systems } = useSystems();
  const { permissions } = usePermissions();
  const { lastSync } = useServerSync(5000);
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [decisionLogs, setDecisionLogs] = useState<ReturnType<typeof getRecentDecisions>>([]);
  const [loadingAgent, setLoadingAgent] = useState<string | null>(null);

  const agentsWithPermission = systems.filter((s) =>
    permissions.some((p) => p.systemId === s.id),
  );

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/loop");
      if (res.ok) setAgentStatuses(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  const fetchDecisions = useCallback(() => {
    setDecisionLogs(getRecentDecisions(20));
  }, []);

  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions, lastSync]);

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 5000);
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  async function handleStartAgent(systemId: string) {
    setLoadingAgent(systemId);
    try {
      await syncToServer();
      const res = await fetch("/api/agent/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId, intervalMinutes: 60 }),
      });
      if (res.ok) {
        toast.success("Agent started — first cycle running");
        fetchStatuses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to start");
      }
    } catch {
      toast.error("Failed to start agent");
    } finally {
      setLoadingAgent(null);
    }
  }

  async function handleStopAgent(systemId: string) {
    setLoadingAgent(systemId);
    try {
      await fetch("/api/agent/loop", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId }),
      });
      toast.success("Agent stopped");
      fetchStatuses();
    } catch {
      toast.error("Failed to stop");
    } finally {
      setLoadingAgent(null);
    }
  }

  async function handleRunCycle(systemId: string) {
    setLoadingAgent(systemId);
    try {
      await syncToServer();
      const res = await fetch("/api/agent/loop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId }),
      });
      if (res.ok) {
        const data = await res.json();
        const executed = data.outcomes?.filter((o: { executed: boolean }) => o.executed).length ?? 0;
        toast.success(`Cycle complete — ${executed} actions executed`);
        await pullFromServer();
        fetchStatuses();
        fetchDecisions();
      } else {
        const data = await res.json();
        toast.error(data.error || "Cycle failed");
      }
    } catch {
      toast.error("Failed to run cycle");
    } finally {
      setLoadingAgent(null);
    }
  }

  const runningCount = Object.values(agentStatuses).filter((s) => s.isRunning).length;

  return (
    <AppShell
      title="Run Agent"
      description="Step 2 — Venice-powered reasoning → multi-step critique → audit gate → 1Shot execution. Fully autonomous agents."
      actions={
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard">
            View Results
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      }
    >
      <FadeIn>
        <div className="mb-8">
          <PipelineGuide compact />
        </div>

        {agentsWithPermission.length === 0 ? (
          <Card className="border-dashed border-zinc-800">
            <CardContent className="py-12 text-center">
              <Bot className="mx-auto h-10 w-10 text-zinc-600" />
              <h3 className="mt-4 text-lg font-medium text-zinc-300">No agents ready to run</h3>
              <p className="mt-2 text-sm text-zinc-500">
                Register an agent and grant ERC-7715 permission first.
              </p>
              <Button variant="emerald" className="mt-4" asChild>
                <Link href="/register-agent">
                  <UserPlus className="h-4 w-4" />
                  Register Agent
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                    <Bot className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-100">{agentsWithPermission.length}</p>
                    <p className="text-xs text-zinc-500">Agents siap</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/15">
                    <Activity className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-100">{runningCount}</p>
                    <p className="text-xs text-zinc-500">Running</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                    <Brain className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-zinc-100">{decisionLogs.length}</p>
                    <p className="text-xs text-zinc-500">Decisions</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agent controls */}
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Agent Controls</CardTitle>
                    <CardDescription className="mt-1">
                      Start untuk cycle otomatis, atau ⚡ untuk single cycle (think → audit → execute)
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchStatuses}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Stagger className="space-y-3" stagger={0.05}>
                  {agentsWithPermission.map((system) => {
                    const status = agentStatuses[system.id];
                    const isRunning = status?.isRunning ?? false;
                    const isLoading = loadingAgent === system.id;

                    return (
                      <StaggerItem key={system.id}>
                        <motion.div
                          className={`flex items-center justify-between rounded-lg border p-4 ${
                            isRunning
                              ? "border-emerald-500/30 bg-emerald-500/5"
                              : "border-zinc-800 bg-zinc-900/30"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isRunning ? "bg-emerald-500/15" : "bg-zinc-800"}`}>
                              {isRunning ? (
                                <Activity className="h-4 w-4 text-emerald-400" />
                              ) : (
                                <Bot className="h-4 w-4 text-zinc-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-zinc-100">{system.name}</p>
                              <p className="text-xs text-zinc-500">
                                {isRunning ? `${status?.cycleCount ?? 0} cycles` : "Ready to run"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Badge variant={isRunning ? "approved" : "secondary"}>
                              {isRunning ? "Running" : "Stopped"}
                            </Badge>
                            {isRunning ? (
                              <Button variant="outline" size="sm" onClick={() => handleStopAgent(system.id)} disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                              </Button>
                            ) : (
                              <Button variant="default" size="sm" onClick={() => handleStartAgent(system.id)} disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRunCycle(system.id)}
                              disabled={isLoading}
                              title="Single cycle"
                            >
                              {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                            </Button>
                          </div>
                        </motion.div>
                      </StaggerItem>
                    );
                  })}
                </Stagger>
              </CardContent>
            </Card>

            {/* Live Venice Intelligence — core demo of Best use of Venice AI + Best Agent */}
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[--brand-primary]" />
                <span className="text-xs uppercase tracking-[0.15em] text-[--text-tertiary]">Core Intelligence Layer — Venice AI</span>
              </div>
              <VeniceChat 
                systemId={agentsWithPermission[0]?.id || "default"} 
                systemName={agentsWithPermission[0]?.name || "Treasury Agent"} 
              />
            </div>

            {/* Live results from this session */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Latest Cycle Results</CardTitle>
                <CardDescription>Activity from the most recent agent run</CardDescription>
              </CardHeader>
              <CardContent>
                <ActivityFeed limit={8} pollIntervalMs={5000} compact />
              </CardContent>
            </Card>

            {/* Decision logs */}
            <Card>
              <CardHeader>
                <CardTitle>Venice Decisions</CardTitle>
                <CardDescription>AI reasoning dari agent brain</CardDescription>
              </CardHeader>
              <CardContent>
                {decisionLogs.length > 0 ? (
                  <div className="space-y-3">
                    {decisionLogs.slice(0, 5).map((log) => (
                      <div
                        key={log.id}
                        className={`rounded-lg border p-4 ${
                          log.outcome?.success
                            ? "border-emerald-500/20 bg-emerald-500/5"
                            : "border-zinc-800 bg-zinc-900/30"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-zinc-200">{log.systemId}</span>
                          <span className="text-xs text-zinc-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {log.decision?.actions?.map((action, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-zinc-400">
                            <Badge variant="outline" className="text-xs">{action.type}</Badge>
                            {action.description}
                          </div>
                        ))}
                        {log.decision?.reasoning && (
                          <p className="mt-2 text-xs text-zinc-500">{log.decision.reasoning}</p>
                        )}
                        {log.outcome && (
                          <Badge className="mt-2" variant={log.outcome.success ? "default" : "destructive"}>
                            {log.outcome.success ? (
                              <><ShieldCheck className="h-3 w-3 mr-1" /> Executed</>
                            ) : (
                              <><ShieldX className="h-3 w-3 mr-1" /> {log.outcome.error || "Failed"}</>
                            )}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-6 text-center text-sm text-zinc-500">
                    No decisions yet — click ⚡ to run the first cycle
                  </p>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </FadeIn>
    </AppShell>
  );
}
