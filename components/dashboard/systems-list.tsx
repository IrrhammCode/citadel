"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Activity, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSystems } from "@/hooks/useSystems";
import { usePermissions } from "@/hooks/usePermissions";
import { useServerStore } from "@/hooks/useServerStore";
import { TrustScoreBadge } from "@/components/agent/trust-score-badge";
import { getTrustScore, getAuditLog } from "@/lib/storage";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";

const statusVariant = {
  active: "default" as const,
  idle: "secondary" as const,
  restricted: "warning" as const,
};

export function SystemsList() {
  const { permissions } = usePermissions();
  const { systems } = useSystems();
  const { store } = useServerStore();

  // Show custom agents first, then builtins with permission
  const customAgents = systems.filter((s) => s.isCustom);
  const activeBuiltins = systems.filter(
    (s) => !s.isCustom && permissions.some((p) => p.systemId === s.id),
  );
  const displaySystems = [...customAgents, ...activeBuiltins];

  return (
    <FadeIn>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Registered Agents</CardTitle>
            <CardDescription className="max-w-2xl text-[--text-secondary]">
              Registered agents or those with active permissions.
            </CardDescription>
          </div>
          <Button variant="emerald" size="sm" asChild>
            <Link href="/register-agent">
              <UserPlus className="h-3.5 w-3.5" />
              Register
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {displaySystems.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-800 p-6 text-center">
              <Bot className="mx-auto h-8 w-8 text-zinc-600" />
              <p className="mt-2 text-sm text-zinc-500">No agents registered yet</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/register-agent">Register First Agent</Link>
              </Button>
            </div>
          ) : (
            <Stagger stagger={0.1}>
              {displaySystems.map((system) => {
                const permission = permissions.find((p) => p.systemId === system.id);
                const trustScore = store?.trustScores?.[system.id] ?? getTrustScore(system.id);
                const auditLog = store?.auditLog?.length ? store.auditLog : getAuditLog();
                const totalSpent = auditLog
                  .filter((r) => r.systemId === system.id && r.verdict.decision === "approved")
                  .reduce((sum, r) => sum + parseFloat(r.spendRequest.amount), 0);

                return (
                  <StaggerItem key={system.id}>
                    <motion.div
                      whileHover={{ x: 4 }}
                      className="group flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 transition-all hover:border-emerald-500/20 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">
                          <Bot className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-zinc-100">{system.name}</p>
                            <Badge variant={statusVariant[system.status]}>{system.status}</Badge>
                            {system.isCustom && <Badge variant="outline">Custom</Badge>}
                            <TrustScoreBadge trustScore={trustScore} compact />
                            {permission && <Badge variant="default">Permission aktif</Badge>}
                          </div>
                          <p className="mt-1 text-sm text-zinc-400">{system.goal || system.description}</p>
                          {system.budget && (
                            <p className="mt-1 text-xs text-zinc-500">
                              Budget {system.budget} USDC · Spent {totalSpent.toFixed(2)} USDC
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {permission && (
                          <Button variant="default" size="sm" asChild>
                            <Link href="/agent-dashboard">
                              <Activity className="h-3 w-3" />
                              Run
                            </Link>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/systems/${system.id}`}>
                            Detail
                            <ArrowRight className="h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    </motion.div>
                  </StaggerItem>
                );
              })}
            </Stagger>
          )}
        </CardContent>
      </Card>
    </FadeIn>
  );
}
