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

function getTrustColor(score: number) {
  if (score >= 80) return { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", label: "Elite" };
  if (score >= 60) return { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", label: "Trusted" };
  if (score >= 40) return { bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30", label: "Standard" };
  return { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", label: "Restricted" };
}

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
                    whileHover={{ x: 4 }}
                    className="group flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 transition-all duration-200 ease-out hover:border-emerald-500/20 hover:shadow-[0_0_24px_rgba(16,185,129,0.07)] sm:flex-row sm:items-center sm:justify-between"
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
                          {trustScore !== null && (
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getTrustColor(trustScore.score).bg} ${getTrustColor(trustScore.score).text} ${getTrustColor(trustScore.score).border}`}>
                              {getTrustColor(trustScore.score).label}
                            </span>
                          )}
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
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <GrantPermissionModal
                        systemId={system.id}
                        systemName={system.name}
                        existingPermission={permission}
                        onGranted={refresh}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="group/btn border-zinc-700 transition-colors duration-200 hover:border-emerald-500/30 hover:bg-emerald-500/10 hover:text-emerald-400"
                      >
                        <Link href={`/systems/${system.id}`}>
                          Open Agent
                          <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover/btn:translate-x-0.5" />
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
