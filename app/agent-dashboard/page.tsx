"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Brain,
  Play,
  Pause,
  RefreshCw,
  Clock,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  BarChart3,
  Settings,
  Loader2,
  Database,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";
import { useSystems } from "@/hooks/useSystems";
import { getRecentDecisions } from "@/lib/agent/memory";
import { toast } from "sonner";

type AgentStatus = {
  systemId: string;
  isRunning: boolean;
  cycleCount: number;
  lastCycle: number;
};

export default function AgentDashboardPage() {
  const { systems } = useSystems();
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [decisionLogs, setDecisionLogs] = useState<any[]>([]);
  const [loadingAgent, setLoadingAgent] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Fetch agent statuses
  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/agent/loop");
      if (res.ok) {
        const data = await res.json();
        setAgentStatuses(data);
      }
    } catch (error) {
      console.error("Failed to fetch statuses:", error);
    }
  }, []);

  // Fetch decision logs from memory
  const fetchDecisions = useCallback(() => {
    const decisions = getRecentDecisions(20);
    setDecisionLogs(decisions);
  }, []);

  useEffect(() => {
    fetchStatuses();
    fetchDecisions();
    const interval = setInterval(() => {
      fetchStatuses();
      fetchDecisions();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatuses, fetchDecisions]);

  // Seed demo data
  async function handleSeedData() {
    setIsSeeding(true);
    try {
      const { seedDemoData } = await import("@/lib/demo/seed-data");
      seedDemoData();
      fetchDecisions();
      toast.success("Demo data seeded!");
    } catch (error) {
      toast.error("Failed to seed data");
    } finally {
      setIsSeeding(false);
    }
  }

  // Start agent
  async function handleStartAgent(systemId: string) {
    setLoadingAgent(systemId);
    try {
      const res = await fetch("/api/agent/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId, intervalMinutes: 60 }),
      });

      if (res.ok) {
        toast.success(`${systemId} agent started`);
        fetchStatuses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to start agent");
      }
    } catch (error) {
      toast.error("Failed to start agent");
    } finally {
      setLoadingAgent(null);
    }
  }

  // Stop agent
  async function handleStopAgent(systemId: string) {
    setLoadingAgent(systemId);
    try {
      const res = await fetch("/api/agent/loop", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId }),
      });

      if (res.ok) {
        toast.success(`${systemId} agent stopped`);
        fetchStatuses();
      }
    } catch (error) {
      toast.error("Failed to stop agent");
    } finally {
      setLoadingAgent(null);
    }
  }

  // Run single cycle (actually calls Venice AI)
  async function handleRunCycle(systemId: string) {
    setLoadingAgent(systemId);
    try {
      const res = await fetch("/api/agent/loop", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`${systemId} cycle complete`);
        fetchStatuses();
        fetchDecisions();
      } else {
        toast.error("Failed to run cycle");
      }
    } catch (error) {
      toast.error("Failed to run cycle");
    } finally {
      setLoadingAgent(null);
    }
  }

  const runningAgents = Object.values(agentStatuses).filter((s) => s.isRunning);
  const totalCycles = Object.values(agentStatuses).reduce((sum, s) => sum + s.cycleCount, 0);

  return (
    <AppShell
      title="Agent Dashboard"
      description="Monitor and control autonomous AI agents in real-time."
    >
      <FadeIn>
        {/* Seed Data Button */}
        <div className="mb-6">
          <Button variant="secondary" onClick={handleSeedData} disabled={isSeeding}>
            {isSeeding ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Database className="h-4 w-4 mr-2" />
            )}
            Seed Demo Data
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10">
                  <Bot className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{systems.length}</p>
                  <p className="text-xs text-zinc-500">Total Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10">
                  <Activity className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{runningAgents.length}</p>
                  <p className="text-xs text-zinc-500">Running</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-600/10">
                  <Zap className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{totalCycles}</p>
                  <p className="text-xs text-zinc-500">Total Cycles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-600/10">
                  <Brain className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{decisionLogs.length}</p>
                  <p className="text-xs text-zinc-500">Decisions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Agent Controls */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agent Controls</CardTitle>
                <CardDescription className="mt-1">
                  Start, stop, or run single cycles (calls Venice AI)
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchStatuses}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Stagger className="space-y-3" stagger={0.05}>
              {systems.slice(0, 10).map((system) => {
                const status = agentStatuses[system.id];
                const isRunning = status?.isRunning ?? false;
                const isLoading = loadingAgent === system.id;

                return (
                  <StaggerItem key={system.id}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${isRunning ? "bg-emerald-600/10" : "bg-zinc-800"}`}>
                          {isRunning ? (
                            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
                          ) : (
                            <Bot className="h-4 w-4 text-zinc-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{system.name}</p>
                          <p className="text-xs text-zinc-500">
                            {isRunning ? `${status?.cycleCount ?? 0} cycles` : "Stopped"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={isRunning ? "default" : "secondary"}>
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

                        <Button variant="ghost" size="sm" onClick={() => handleRunCycle(system.id)} disabled={isLoading} title="Run single cycle (calls Venice AI)">
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

        {/* Decision Logs */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Decisions</CardTitle>
            <CardDescription>AI agent decision history from memory</CardDescription>
          </CardHeader>
          <CardContent>
            {decisionLogs.length > 0 ? (
              <Stagger className="space-y-4" stagger={0.05}>
                {decisionLogs.slice(0, 10).map((log) => (
                  <StaggerItem key={log.id}>
                    <motion.div whileHover={{ x: 4 }} className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-emerald-400" />
                          <span className="font-medium text-zinc-100">{log.systemId}</span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {log.decision?.actions?.map((action: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">{action.type}</Badge>
                            <span className="text-zinc-300">{action.description}</span>
                            <span className="text-xs text-zinc-500">({(action.confidence * 100).toFixed(0)}%)</span>
                          </div>
                        ))}
                      </div>
                      {log.decision?.reasoning && (
                        <p className="mt-3 text-xs text-zinc-500">{log.decision.reasoning}</p>
                      )}
                      {log.outcome && (
                        <div className="mt-2">
                          <Badge variant={log.outcome.success ? "default" : "destructive"} className="text-xs">
                            {log.outcome.success ? "Success" : log.outcome.error || "Failed"}
                          </Badge>
                        </div>
                      )}
                    </motion.div>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <div className="py-8 text-center text-zinc-500">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No decisions recorded yet</p>
                <p className="text-xs mt-1">Run a cycle or seed demo data to begin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </AppShell>
  );
}


