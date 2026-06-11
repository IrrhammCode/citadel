"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Network, ArrowDown, ShieldAlert, CheckCircle2, RefreshCw, Zap, Activity } from "lucide-react";
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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Network className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-zinc-100">{connections.length}</p>
                  <p className="text-xs text-zinc-500">Total Connections</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-zinc-100">
                    {connections.filter((c) => c.status === "active").length}
                  </p>
                  <p className="text-xs text-zinc-500">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-2xl font-bold text-zinc-100">
                    {negotiations.filter((n) => n.status === "pending").length}
                  </p>
                  <p className="text-xs text-zinc-500">Pending Negotiations</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* A2A Network Visualization */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>A2A Network</CardTitle>
                <CardDescription>Agent-to-Agent communication topology</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={loadData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              {/* CFO Level */}
              <div className="flex w-64 flex-col items-center rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg">
                <ShieldAlert className="mb-2 h-8 w-8 text-zinc-400" />
                <h3 className="font-semibold text-zinc-100">CFO (You)</h3>
                <Badge variant="outline" className="mt-2 text-xs">Origin Signer</Badge>
              </div>

              <motion.div animate={{ y: [0, 5, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <ArrowDown className="h-6 w-6 text-zinc-600" />
              </motion.div>

              {/* Agent Level */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {systems.slice(0, 6).map((system) => {
                  const systemConns = connections.filter(
                    (c) => c.to === system.id || c.from === system.id
                  );
                  const activeConns = systemConns.filter((c) => c.status === "active");
                  
                  return (
                    <motion.div
                      key={system.id}
                      whileHover={{ scale: 1.02 }}
                      className="flex flex-col items-center rounded-xl border border-emerald-800/50 bg-emerald-900/20 p-4"
                    >
                      <Network className="mb-2 h-6 w-6 text-emerald-400" />
                      <h3 className="text-sm font-semibold text-zinc-100">{system.name}</h3>
                      <p className="text-xs text-zinc-500 mt-1">{activeConns.length} connections</p>
                      <Badge className="mt-2 text-xs bg-emerald-500/20 text-emerald-300">
                        {system.status}
                      </Badge>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Negotiations */}
        <Card>
          <CardHeader>
            <CardTitle>A2A Negotiations</CardTitle>
            <CardDescription>Budget reallocation requests between agents</CardDescription>
          </CardHeader>
          <CardContent>
            {negotiations.length > 0 ? (
              <Stagger className="space-y-3" stagger={0.05}>
                {negotiations.slice(0, 10).map((neg) => (
                  <StaggerItem key={neg.id}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/30 p-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-100">
                          {neg.fromSystemId} → {neg.toSystemId}
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">{neg.reason}</p>
                        {neg.amount && (
                          <p className="text-xs text-zinc-400 mt-1">{neg.amount} USDC</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            neg.status === "approved"
                              ? "default"
                              : neg.status === "pending"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {neg.status}
                        </Badge>
                        {neg.status === "pending" && (
                          <>
                            <Button size="sm" onClick={() => handleApprove(neg.id)}>
                              <CheckCircle2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReject(neg.id)}
                            >
                              ✕
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  </StaggerItem>
                ))}
              </Stagger>
            ) : (
              <div className="py-8 text-center text-zinc-500">
                <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No negotiations yet</p>
                <p className="text-xs mt-1">Agents will initiate negotiations automatically</p>
              </div>
            )}
          </CardContent>
        </Card>
      </FadeIn>
    </AppShell>
  );
}
