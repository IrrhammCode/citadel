"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot, Target, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSystems } from "@/hooks/useSystems";
import { usePermissions } from "@/hooks/usePermissions";
import { GrantPermissionModal } from "@/components/permissions/grant-permission-modal";
import { CreateSystemModal } from "@/components/systems/create-system-modal";
import { TrustScoreBadge } from "@/components/agent/trust-score-badge";
import { getTrustScore, getAuditLog } from "@/lib/storage";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";

const statusVariant = {
  active: "default" as const,
  idle: "secondary" as const,
  restricted: "warning" as const,
};

export function SystemsList() {
  const { permissions, refresh } = usePermissions();
  const { systems } = useSystems();

  return (
    <FadeIn>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Autonomous Agents</CardTitle>
            <CardDescription className="mt-1">
              AI agents with goals, trust scores, and autonomous spending capabilities.
            </CardDescription>
          </div>
          <CreateSystemModal />
        </CardHeader>
        <CardContent className="space-y-4">
          <Stagger stagger={0.1}>
            {systems.map((system) => {
              const permission = permissions.find((p) => p.systemId === system.id);
              const trustScore = getTrustScore(system.id);
              const totalSpent = getAuditLog()
                .filter((r) => r.systemId === system.id && r.verdict.decision === "approved")
                .reduce((sum, r) => sum + parseFloat(r.spendRequest.amount), 0);

              return (
                <StaggerItem key={system.id}>
                  <motion.div
                    whileHover={{ x: 4, borderColor: "rgba(16,185,129,0.2)" }}
                    className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <motion.div
                        whileHover={{ rotate: 8, scale: 1.05 }}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800"
                      >
                        <Bot className="h-5 w-5 text-zinc-400" />
                      </motion.div>
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-100">{system.name}</p>
                          <Badge variant={statusVariant[system.status]}>
                            {system.status}
                          </Badge>
                          <TrustScoreBadge trustScore={trustScore} compact />
                          {permission && (
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                            >
                              <Badge variant="default">Permission granted</Badge>
                            </motion.div>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">{system.goal || system.description}</p>

                        {/* Agent Stats */}
                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                          {system.budget && (
                            <span className="flex items-center gap-1">
                              <Target className="h-3 w-3" />
                              Budget: {system.budget} USDC
                            </span>
                          )}
                          {system.budget && (
                            <span className="flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Spent: {totalSpent.toFixed(2)} USDC
                            </span>
                          )}
                          {permission && (
                            <span>
                              Daily limit: {permission.maxDailySpend} USDC · Expires{" "}
                              {new Date(permission.expiry * 1000).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {/* KPIs */}
                        {system.kpiTargets && system.kpiTargets.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {system.kpiTargets.map((kpi, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400"
                              >
                                {kpi.name}: {kpi.target}{kpi.unit === "x" ? "x" : kpi.unit === "%" ? "%" : ""}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GrantPermissionModal
                        systemId={system.id}
                        systemName={system.name}
                        existingPermission={permission}
                        onGranted={refresh}
                      />
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/systems/${system.id}`}>
                          Open Agent
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
