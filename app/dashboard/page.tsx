"use client";

import { useAccount } from "wagmi";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { SystemsList } from "@/components/dashboard/systems-list";
import { BudgetPoolCard } from "@/components/agent/budget-pool-card";
import { AnomalyAlerts } from "@/components/agent/anomaly-alerts";
import { PermissionCard } from "@/components/permissions/permission-card";
import { usePermissions } from "@/hooks/usePermissions";
import { getBudgetPool, getAnomalies } from "@/lib/storage";
import { LandingCta } from "@/components/landing/landing-cta";
import { Stagger, StaggerItem } from "@/components/motion/motion";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const { permissions } = usePermissions();
  const pool = getBudgetPool();
  const anomalies = getAnomalies();

  return (
    <AppShell
      title="AI CFO Dashboard"
      description="Autonomous treasury management with goals, trust scores, and multi-agent coordination."
    >
      <div className="space-y-8">
        {!isConnected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-start gap-3">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Shield className="mt-0.5 h-5 w-5 text-amber-400" />
              </motion.div>
              <div>
                <p className="font-medium text-zinc-200">Connect your treasury wallet</p>
                <p className="text-sm text-zinc-400">
                  Connect MetaMask to grant Advanced Permissions and manage autonomous agents.
                </p>
              </div>
            </div>
            <LandingCta />
          </motion.div>
        )}

        <StatsCards />

        {/* Budget Pool + Anomalies */}
        <div className="grid gap-4 lg:grid-cols-2">
          <BudgetPoolCard pool={pool} />
          <div className="space-y-4">
            <AnomalyAlerts anomalies={anomalies} />
          </div>
        </div>

        <SystemsList />

        {permissions.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="mb-4 text-lg font-semibold text-zinc-100">
              Active Permissions
            </h2>
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.08}>
              {permissions.map((p) => (
                <StaggerItem key={p.id}>
                  <PermissionCard permission={p} />
                </StaggerItem>
              ))}
            </Stagger>
          </motion.div>
        )}

        <motion.div
          className="text-center"
          whileHover={{ scale: 1.02 }}
        >
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">← Back to landing</Link>
          </Button>
        </motion.div>
      </div>
    </AppShell>
  );
}
