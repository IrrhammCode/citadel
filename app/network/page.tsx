"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, ArrowDown, ShieldAlert, CheckCircle2, RefreshCw, Zap, Activity, X } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";
import { useSystems } from "@/hooks/useSystems";
import { getNegotiations, saveNegotiation, updateNegotiationStatus } from "@/lib/storage";
import { AgentEventBus } from "@/lib/agent/event-bus";
import { toast } from "sonner";

type A2AConnection = {
  from: string;
  to: string;
  type: "delegation" | "negotiation" | "data_share";
  status: "active" | "pending" | "completed";
  amount?: number;
  lastActivity: number;
};

/** Status → semantic color mapping (design tokens) */
const STATUS_STYLES: Record<string, { badge: string; border: string; text: string }> = {
  approved: {
    badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
  },
  completed: {
    badge: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
    border: "border-emerald-500/30",
    text: "text-emerald-400",
  },
  pending: {
    badge: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
    border: "border-amber-500/30",
    text: "text-amber-400",
  },
  active: {
    badge: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
    border: "border-blue-500/30",
    text: "text-blue-400",
  },
  rejected: {
    badge: "bg-red-500/15 text-red-400 border border-red-500/30",
    border: "border-red-500/30",
    text: "text-red-400",
  },
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.pending;
}

/** Pulse dot for active connections */
function PulseDot() {
  return (
    <span className="relative flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
    </span>
  );
}

export default function AgentNetworkPage() {
  const { systems } = useSystems();
  const [connections, setConnections] = useState<A2AConnection[]>([]);
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load real data
  useEffect(() => {
    loadData();

    // Listen for events
    const bus = AgentEventBus.getInstance();
    const handler = () => loadData();
    bus.on("negotiate.request", handler);
    bus.on("negotiate.accepted", handler);
    bus.on("negotiate.rejected", handler);

    return () => {
      bus.off("negotiate.request", handler);
      bus.off("negotiate.accepted", handler);
      bus.off("negotiate.rejected", handler);
    };
  }, []);

  function loadData() {
    const negs = getNegotiations();
    setNegotiations(negs);

    // Build connections from negotiations
    const conns: A2AConnection[] = negs.map((n) => ({
      from: n.fromSystemId,
      to: n.toSystemId,
      type: "negotiation" as const,
      status: n.status === "approved" ? "completed" : n.status === "pending" ? "pending" : "active",
      amount: n.amount,
      lastActivity: n.resolvedAt || n.timestamp,
    }));

    // Add default delegations
    for (const system of systems) {
      conns.push({
        from: "cfo",
        to: system.id,
        type: "delegation",
        status: "active",
        lastActivity: Date.now(),
      });
    }

    setConnections(conns);
  }

  // Initiate negotiation
  async function handleNegotiate(fromId: string, toId: string) {
    const amount = 50; // Example amount
    const reason = "Budget reallocation needed for KPI optimization";

    saveNegotiation({
      id: crypto.randomUUID(),
      fromSystemId: fromId,
      toSystemId: toId,
      amount,
      reason,
      status: "pending",
      timestamp: Date.now(),
    });

    // Emit event
    const bus = AgentEventBus.getInstance();
    await bus.emit({
      type: "negotiate.request",
      source: fromId,
      target: toId,
      data: { amount, reason },
    });

    loadData();
    toast.success(`Negotiation initiated: ${fromId} → ${toId}`);
  }

  // Approve negotiation
  function handleApprove(id: string) {
    updateNegotiationStatus(id, "approved");
    loadData();
    toast.success("Negotiation approved");
  }

  // Reject negotiation
  function handleReject(id: string) {
    updateNegotiationStatus(id, "rejected");
    loadData();
    toast.success("Negotiation rejected");
  }

  return (
    <AppShell
      title="Agent Network"
      description="Visualize and manage Agent-to-Agent (A2A) communications."
    >
      <FadeIn>
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          {[
            {
              icon: Network,
              value: connections.length,
              label: "Total Connections",
            },
            {
              icon: Activity,
              value: connections.filter((c) => c.status === "active").length,
              label: "Active",
            },
            {
              icon: Zap,
              value: negotiations.filter((n) => n.status === "pending").length,
              label: "Pending Negotiations",
            },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.2 }}
            >
              <Card className="border-[#27272a] bg-[#111118] hover:border-emerald-500/30 transition-colors duration-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                      <stat.icon className="h-4.5 w-4.5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-[#f2f2f2]">{stat.value}</p>
                      <p className="text-xs text-[#71717a]">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* A2A Network Visualization */}
        <Card className="mb-6 border-[#27272a] bg-[#111118]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-[#f2f2f2]">A2A Network</CardTitle>
                <CardDescription className="text-[#71717a]">
                  Agent-to-Agent communication topology
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                className="border-[#27272a] text-[#a1a1aa] hover:border-emerald-500/30 hover:text-emerald-400 transition-colors duration-200"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              {/* CFO Level */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex w-64 flex-col items-center rounded-xl border border-[#27272a] bg-[#1a1a24] p-5 shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 mb-2">
                  <ShieldAlert className="h-6 w-6 text-emerald-400" />
                </div>
                <h3 className="font-semibold text-[#f2f2f2]">CFO (You)</h3>
                <Badge className="mt-2 text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Origin Signer
                </Badge>
              </motion.div>

              {/* Connection line — emerald with pulse */}
              <div className="flex flex-col items-center gap-1">
                <div className="h-8 w-px bg-gradient-to-b from-emerald-500/60 to-emerald-500/20" />
                <motion.div
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                >
                  <ArrowDown className="h-5 w-5 text-emerald-400" />
                </motion.div>
                <div className="h-4 w-px bg-gradient-to-b from-emerald-500/20 to-transparent" />
              </div>

              {/* Agent Level */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {systems.slice(0, 6).map((system, i) => {
                  const systemConns = connections.filter(
                    (c) => c.to === system.id || c.from === system.id
                  );
                  const activeConns = systemConns.filter((c) => c.status === "active");
                  const isActive = activeConns.length > 0;

                  return (
                    <motion.div
                      key={system.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05, duration: 0.3 }}
                      whileHover={{ y: -3, scale: 1.01 }}
                      className={`group flex flex-col items-center rounded-xl border p-4 transition-all duration-200 ${
                        isActive
                          ? "border-emerald-500/30 bg-emerald-900/15 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                          : "border-[#27272a] bg-[#0a0a0f]"
                      }`}
                    >
                      <div className="relative mb-2">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors duration-200 ${
                            isActive
                              ? "bg-emerald-500/15"
                              : "bg-zinc-500/10"
                          }`}
                        >
                          <Network
                            className={`h-5 w-5 transition-colors duration-200 ${
                              isActive ? "text-emerald-400" : "text-[#71717a]"
                            }`}
                          />
                        </div>
                        {isActive && (
                          <span className="absolute -right-0.5 -top-0.5">
                            <PulseDot />
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-[#f2f2f2]">{system.name}</h3>
                      <p className="text-xs text-[#71717a] mt-1">
                        {activeConns.length} connection{activeConns.length !== 1 ? "s" : ""}
                      </p>
                      <Badge
                        className={`mt-2 text-xs ${getStatusStyle(system.status ?? "active").badge}`}
                      >
                        {system.status ?? "active"}
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Negotiations */}
        <Card className="border-[#27272a] bg-[#111118]">
          <CardHeader>
            <CardTitle className="text-[#f2f2f2]">A2A Negotiations</CardTitle>
            <CardDescription className="text-[#71717a]">
              Budget reallocation requests between agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {negotiations.length > 0 ? (
              <Stagger className="space-y-3" stagger={0.05}>
                {negotiations.slice(0, 10).map((neg) => {
                  const style = getStatusStyle(neg.status);
                  return (
                    <StaggerItem key={neg.id}>
                      <motion.div
                        whileHover={{ x: 4 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className={`flex items-center justify-between rounded-xl border p-4 transition-all duration-200 hover:shadow-md ${style.border} bg-[#0a0a0f]/60 hover:bg-[#1a1a24]/60`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Status indicator dot */}
                          <div className="mt-1 flex-shrink-0">
                            {neg.status === "approved" || neg.status === "completed" ? (
                              <CheckCircle2 className={`h-4 w-4 ${style.text}`} />
                            ) : neg.status === "rejected" ? (
                              <X className={`h-4 w-4 ${style.text}`} />
                            ) : neg.status === "pending" ? (
                              <Zap className={`h-4 w-4 ${style.text}`} />
                            ) : (
                              <Activity className={`h-4 w-4 ${style.text}`} />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[#f2f2f2]">
                              {neg.fromSystemId}{" "}
                              <span className="text-emerald-500/60 mx-1">→</span>{" "}
                              {neg.toSystemId}
                            </p>
                            <p className="text-xs text-[#71717a] mt-0.5">{neg.reason}</p>
                            {neg.amount && (
                              <p className="text-xs font-mono text-[#a1a1aa] mt-1">
                                {neg.amount} USDC
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                          <Badge className={`text-xs ${style.badge}`}>
                            {neg.status}
                          </Badge>
                          {neg.status === "pending" && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleApprove(neg.id)}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white h-7 px-2.5 transition-colors duration-150"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleReject(neg.id)}
                                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 h-7 px-2.5 transition-colors duration-150"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    </StaggerItem>
                  );
                })}
              </Stagger>
            ) : (
              <div className="py-12 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#1a1a24]">
                  <Network className="h-6 w-6 text-[#52525b]" />
                </div>
                <p className="text-sm text-[#a1a1aa]">No negotiations yet</p>
                <p className="text-xs text-[#52525b] mt-1">
                  Agents will initiate negotiations automatically
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </AppShell>
  );
}
