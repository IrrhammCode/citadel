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
  ShieldCheck,
  ShieldX,
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
          <Card className="border-zinc-800 hover:border-[rgba(16,185,129,0.3)] transition-colors duration-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(16,185,129,0.15)]">
                  <Bot className="h-5 w-5 text-[#10b981]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#f2f2f2]">{systems.length}</p>
                  <p className="text-xs text-[#71717a]">Total Agents</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 hover:border-[rgba(16,185,129,0.3)] transition-colors duration-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(16,185,129,0.15)]">
                  <Activity className="h-5 w-5 text-[#10b981]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#f2f2f2]">{runningAgents.length}</p>
                  <p className="text-xs text-[#71717a]">Running</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 hover:border-[rgba(16,185,129,0.3)] transition-colors duration-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                  <Zap className="h-5 w-5 text-[#a1a1aa]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#f2f2f2]">{totalCycles}</p>
                  <p className="text-xs text-[#71717a]">Total Cycles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 hover:border-[rgba(16,185,129,0.3)] transition-colors duration-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                  <Brain className="h-5 w-5 text-[#a1a1aa]" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#f2f2f2]">{decisionLogs.length}</p>
                  <p className="text-xs text-[#71717a]">Decisions</p>
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
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ x: 4, borderColor: "rgba(16,185,129,0.3)" }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className={`flex items-center justify-between rounded-lg border p-4 transition-all duration-200 ${
                        isRunning
                          ? "border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)] shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                          : "border-zinc-800 bg-zinc-900/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          className={`relative flex h-8 w-8 items-center justify-center rounded-lg ${
                            isRunning ? "bg-[rgba(16,185,129,0.15)]" : "bg-zinc-800"
                          }`}
                          animate={isRunning ? { boxShadow: ["0 0 0px rgba(16,185,129,0)", "0 0 12px rgba(16,185,129,0.4)", "0 0 0px rgba(16,185,129,0)"] } : { boxShadow: "none" }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          {isRunning ? (
                            <Activity className="h-4 w-4 text-[#10b981]" />
                          ) : (
                            <Bot className="h-4 w-4 text-[#a1a1aa]" />
                          )}
                        </motion.div>
                        <div>
                          <p className="font-medium text-[#f2f2f2]">{system.name}</p>
                          <p className="text-xs text-[#71717a]">
                            {isRunning ? `${status?.cycleCount ?? 0} cycles` : "Stopped"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={isRunning ? "running" : "stopped"}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            transition={{ duration: 0.15 }}
                          >
                            <Badge
                              className={
                                isRunning
                                  ? "bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.3)]"
                                  : "bg-zinc-800 text-[#a1a1aa] border border-zinc-700"
                              }
                            >
                              {isRunning ? "Running" : "Stopped"}
                            </Badge>
                          </motion.div>
                        </AnimatePresence>

                        {isRunning ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleStopAgent(system.id)}
                            disabled={isLoading}
                            className="border-zinc-700 bg-transparent text-[#a1a1aa] hover:border-[#ef4444] hover:bg-[rgba(239,68,68,0.1)] hover:text-[#ef4444] transition-all duration-200"
                          >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3" />}
                          </Button>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleStartAgent(system.id)}
                            disabled={isLoading}
                            className="bg-[#10b981] text-[#0a0a0f] hover:bg-[#059669] font-semibold transition-all duration-200 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                          >
                            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRunCycle(system.id)}
                          disabled={isLoading}
                          title="Run single cycle (calls Venice AI)"
                          className="text-[#a1a1aa] hover:text-[#f2f2f2] hover:bg-zinc-800 transition-all duration-200"
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
                    <motion.div
                      whileHover={{ x: 4, borderColor: "rgba(16,185,129,0.3)" }}
                      transition={{ duration: 0.2 }}
                      className={`rounded-lg border p-4 transition-all duration-200 ${
                        log.outcome?.success
                          ? "border-[rgba(16,185,129,0.2)] bg-[rgba(16,185,129,0.03)]"
                          : log.outcome && !log.outcome.success
                          ? "border-[rgba(239,68,68,0.2)] bg-[rgba(239,68,68,0.03)]"
                          : "border-zinc-800 bg-zinc-900/30"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-[#10b981]" />
                          <span className="font-medium text-[#f2f2f2]">{log.systemId}</span>
                        </div>
                        <span className="text-xs text-[#71717a]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {log.decision?.actions?.map((action: any, i: number) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline" className="text-xs border-zinc-700 text-[#a1a1aa]">{action.type}</Badge>
                            <span className="text-[#f2f2f2]">{action.description}</span>
                            <span className="text-xs text-[#71717a] font-mono">({(action.confidence * 100).toFixed(0)}%)</span>
                          </div>
                        ))}
                      </div>
                      {log.decision?.reasoning && (
                        <p className="mt-3 text-xs text-[#71717a]">{log.decision.reasoning}</p>
                      )}
                      {log.outcome && (
                        <div className="mt-2">
                          <Badge
                            className={
                              log.outcome.success
                                ? "bg-[rgba(16,185,129,0.15)] text-[#10b981] border border-[rgba(16,185,129,0.3)]"
                                : "bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.3)]"
                            }
                          >
                            <span className="flex items-center gap-1">
                              {log.outcome.success ? (
                                <ShieldCheck className="h-3 w-3" />
                              ) : (
                                <ShieldX className="h-3 w-3" />
                              )}
                              {log.outcome.success ? "Success" : log.outcome.error || "Failed"}
                            </span>
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


