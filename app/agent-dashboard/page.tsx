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
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";
import { useSystems } from "@/hooks/useSystems";
import { toast } from "sonner";

type AgentStatus = {
  systemId: string;
  isRunning: boolean;
  cycleCount: number;
  lastCycle: number;
};

type DecisionLog = {
  id: string;
  systemId: string;
  systemName: string;
  timestamp: number;
  actions: {
    type: string;
    description: string;
    confidence: number;
  }[];
  reasoning: string;
};

export default function AgentDashboardPage() {
  const { systems } = useSystems();
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [decisionLogs, setDecisionLogs] = useState<DecisionLog[]>([]);
  const [isStarting, setIsStarting] = useState<string | null>(null);

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

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  // Start agent
  async function handleStartAgent(systemId: string) {
    setIsStarting(systemId);
    try {
      const res = await fetch("/api/agent/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId, intervalMinutes: 60 }),
      });

      if (res.ok) {
        toast.success(`Agent ${systemId} started`);
        await fetchStatuses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to start agent");
      }
    } catch (error) {
      toast.error("Failed to start agent");
    } finally {
      setIsStarting(null);
    }
  }

  // Stop agent
  async function handleStopAgent(systemId: string) {
    try {
      const res = await fetch("/api/agent/loop", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId }),
      });

      if (res.ok) {
        toast.success(`Agent ${systemId} stopped`);
        await fetchStatuses();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to stop agent");
      }
    } catch (error) {
      toast.error("Failed to stop agent");
    }
  }

  // Run single cycle
  async function handleRunCycle(systemId: string) {
    setIsStarting(systemId);
    try {
      const res = await fetch("/api/agent/loop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemId, intervalMinutes: 1440 }), // Long interval, just for single run
      });

      if (res.ok) {
        toast.success(`Agent ${systemId} cycle executed`);
        await fetchStatuses();
      }
    } catch (error) {
      toast.error("Failed to run cycle");
    } finally {
      setIsStarting(null);
    }
  }

  const runningAgents = Object.values(agentStatuses).filter((s) => s.isRunning);
  const stoppedAgents = Object.values(agentStatuses).filter((s) => !s.isRunning);

  return (
    <AppShell
      title="Agent Dashboard"
      description="Monitor and control autonomous AI agents in real-time."
    >
      <FadeIn>
        {/* ── Stats Overview ───────────────────────────────── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10">
                  <Bot className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">
                    {Object.keys(agentStatuses).length}
                  </p>
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
                  <p className="text-2xl font-bold text-zinc-100">
                    {runningAgents.length}
                  </p>
                  <p className="text-xs text-zinc-500">Running</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-600/10">
                  <Pause className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-zinc-100">
                    {stoppedAgents.length}
                  </p>
                  <p className="text-xs text-zinc-500">Stopped</p>
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
                  <p className="text-2xl font-bold text-zinc-100">
                    {decisionLogs.length}
                  </p>
                  <p className="text-xs text-zinc-500">Decisions Made</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Agent Controls ──────────────────────────────── */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Agent Controls</CardTitle>
                <CardDescription className="mt-1">
                  Start, stop, or run single cycles for each agent
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchStatuses}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Stagger className="space-y-3" stagger={0.05}>
              {systems.map((system) => {
                const status = agentStatuses[system.id];
                const isRunning = status?.isRunning ?? false;
                const isLoading = isStarting === system.id;

                return (
                  <StaggerItem key={system.id}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                            isRunning ? "bg-emerald-600/10" : "bg-zinc-800"
                          }`}
                        >
                          {isRunning ? (
                            <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
                          ) : (
                            <Bot className="h-4 w-4 text-zinc-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{system.name}</p>
                          <p className="text-xs text-zinc-500">
                            {isRunning
                              ? `${status?.cycleCount ?? 0} cycles`
                              : "Stopped"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={isRunning ? "default" : "secondary"}>
                          {isRunning ? "Running" : "Stopped"}
                        </Badge>

                        {isRunning ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStopAgent(system.id)}
                            disabled={isLoading}
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleStartAgent(system.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <RefreshCw className="h-3 w-3 animate-spin" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRunCycle(system.id)}
                          disabled={isLoading}
                          title="Run single cycle"
                        >
                          <Zap className="h-3 w-3" />
                        </Button>
                      </div>
                    </motion.div>
                  </StaggerItem>
                );
              })}
            </Stagger>
          </CardContent>
        </Card>

        {/* ── Decision Logs ───────────────────────────────── */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Decisions</CardTitle>
            <CardDescription>
              AI agent decision history with reasoning
            </CardDescription>
          </CardHeader>
          <CardContent>
            {decisionLogs.length > 0 ? (
              <Stagger className="space-y-4" stagger={0.05}>
                {decisionLogs.slice(0, 10).map((log) => (
                  <StaggerItem key={log.id}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-emerald-400" />
                          <span className="font-medium text-zinc-100">
                            {log.systemName}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {log.actions.map((action, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Badge variant="outline" className="text-xs">
                              {action.type}
                            </Badge>
                            <span className="text-zinc-300">
                              {action.description}
                            </span>
                            <span className="text-xs text-zinc-500">
                              ({(action.confidence * 100).toFixed(0)}%)
                            </span>
                          </div>
                        ))}
                      </div>

                      <p className="mt-3 text-xs text-zinc-500">
                        {log.reasoning}
                      </p>
                    </motion.div>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <div className="py-8 text-center text-zinc-500">
                <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No decisions made yet</p>
                <p className="text-xs mt-1">Start an agent to begin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </AppShell>
  );
}
