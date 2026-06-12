"use client";

import { useAccount } from "wagmi";
import { motion } from "framer-motion";
import { Shield, Bot, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePermissions } from "@/hooks/usePermissions";
import { useServerStore } from "@/hooks/useServerStore";
import { getAuditLog } from "@/lib/storage";
import { useEffect, useState } from "react";
import { Stagger, StaggerItem } from "@/components/motion/motion";

export function StatsCards() {
  const { isConnected } = useAccount();
  const { permissions } = usePermissions();
  const { store } = useServerStore(5000);
  const [blockedToday, setBlockedToday] = useState(0);
  const [approvedToday, setApprovedToday] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const log = store?.auditLog?.length ? store.auditLog : getAuditLog();
    setBlockedToday(
      log.filter(
        (r) =>
          r.verdict.decision === "blocked" &&
          new Date(r.timestamp).toISOString().slice(0, 10) === today,
      ).length,
    );
    setApprovedToday(
      log.filter(
        (r) =>
          r.verdict.decision === "approved" &&
          new Date(r.timestamp).toISOString().slice(0, 10) === today,
      ).length,
    );
  }, [permissions, store]);

  const stats = [
    {
      title: "Treasury Status",
      value: isConnected ? "Secured" : "Offline",
      icon: Shield,
      accent: isConnected ? "text-gold-400" : "text-zinc-600",
    },
    {
      title: "Active Permissions",
      value: permissions.length.toString(),
      icon: Bot,
      accent: "text-emerald-400",
    },
    {
      title: "Approved Today",
      value: approvedToday.toString(),
      icon: CheckCircle2,
      accent: "text-emerald-400",
    },
    {
      title: "Blocked Today",
      value: blockedToday.toString(),
      icon: AlertTriangle,
      accent: "text-red-400",
    },
  ];

  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" stagger={0.08}>
      {stats.map(({ title, value, icon: Icon, accent }) => (
        <StaggerItem key={title}>
          <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.25 }}>
            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium tracking-wider text-zinc-500 uppercase">
                  {title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${accent}`} />
              </CardHeader>
              <CardContent>
                <motion.p
                  key={value}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`font-display text-3xl font-medium ${accent}`}
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
