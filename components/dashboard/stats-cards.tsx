"use client";

import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { Shield, Bot, AlertTriangle, CheckCircle2, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import { getAuditLog, getBudgetPool, getAnomalies } from "@/lib/storage";
import { useEffect, useState } from "react";
import { Stagger, StaggerItem } from "@/components/motion/motion";

export function StatsCards() {
  const { isConnected } = useAccount();
  const { permissions } = usePermissions();
  const [stats, setStats] = useState([
    { title: "Treasury Status", value: "Disconnected", icon: Shield, accent: "text-zinc-500" },
    { title: "Active Permissions", value: "0", icon: Bot, accent: "text-emerald-400" },
    { title: "Budget Pool", value: "0 USDC", icon: Wallet, accent: "text-cyan-400" },
    { title: "Anomalies", value: "0", icon: AlertTriangle, accent: "text-amber-400" },
    { title: "Approved Today", value: "0", icon: CheckCircle2, accent: "text-emerald-400" },
    { title: "Avg Trust Score", value: "0", icon: TrendingUp, accent: "text-purple-400" },
  ]);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const log = getAuditLog();
    const pool = getBudgetPool();
    const anomalies = getAnomalies();

    const approvedToday = log.filter(
      (r) =>
        r.verdict.decision === "approved" &&
        new Date(r.timestamp).toISOString().slice(0, 10) === today,
    ).length;

    const unresolvedAnomalies = anomalies.filter((a) => !a.resolved).length;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStats([
      {
        title: "Treasury Status",
        value: isConnected ? "Connected" : "Disconnected",
        icon: Shield,
        accent: isConnected ? "text-emerald-400" : "text-zinc-500",
      },
      {
        title: "Active Permissions",
        value: permissions.length.toString(),
        icon: Bot,
        accent: "text-emerald-400",
      },
      {
        title: "Budget Pool",
        value: `${pool.totalBudget} USDC`,
        icon: Wallet,
        accent: "text-cyan-400",
      },
      {
        title: "Anomalies",
        value: unresolvedAnomalies.toString(),
        icon: AlertTriangle,
        accent: unresolvedAnomalies > 0 ? "text-red-400" : "text-emerald-400",
      },
      {
        title: "Approved Today",
        value: approvedToday.toString(),
        icon: CheckCircle2,
        accent: "text-emerald-400",
      },
      {
        title: "Avg Trust Score",
        value: "73",
        icon: TrendingUp,
        accent: "text-purple-400",
      },
    ]);
  }, [permissions, isConnected]);

  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" stagger={0.08}>
      {stats.map(({ title, value, icon: Icon, accent }) => (
        <StaggerItem key={title}>
          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">
                  {title}
                </CardTitle>
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Icon className={`h-4 w-4 ${accent}`} />
                </motion.div>
              </CardHeader>
              <CardContent>
                <motion.p
                  key={value}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`text-2xl font-bold ${accent}`}
                >
                  {value}
                </motion.p>
              </CardContent>
            </Card>
          </motion.div>
        </StaggerItem>
      ))}
    </Stagger>
  );
}
