"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { PageSection } from "@/components/layout/page-section";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { BudgetPoolCard } from "@/components/agent/budget-pool-card";
import { AnomalyAlerts } from "@/components/agent/anomaly-alerts";
import { PermissionCard } from "@/components/permissions/permission-card";
import { ActivityFeed } from "@/components/agent/activity-feed";
import { ApprovalQueue } from "@/components/agent/approval-queue";
import { RecentReports } from "@/components/agent/recent-reports";
import { PipelineGuide } from "@/components/flow/pipeline-guide";
import { EnvPreflight } from "@/components/env/env-preflight";
import { usePermissions } from "@/hooks/usePermissions";
import { useServerStore } from "@/hooks/useServerStore";
import { getBudgetPool, getAnomalies } from "@/lib/storage";
import { Stagger, StaggerItem } from "@/components/motion/motion";
import { Button } from "@/components/ui/button";
import { ScrollText, Activity, UserPlus } from "lucide-react";

export default function DashboardPage() {
  const { permissions } = usePermissions();
  const { store } = useServerStore();
  const pool = store?.budgetPool ?? getBudgetPool();
  const anomalies = getAnomalies();

  return (
    <AppShell
      title="Monitor & Results"
      description="Step 3 — Track agent activity, audits, and treasury performance."
    >
      <div className="space-y-8">
        <EnvPreflight />

        {/* Flow guide */}
        <PipelineGuide />

        {/* Live activity — primary deliverable */}
        <PageSection
          title="Live Activity"
          description="Real-time results from agent cycles — audits, executions, and reports."
          action={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/audit-log">
                  <ScrollText className="h-3.5 w-3.5" />
                  Audit Log
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/agent-dashboard">
                  <Activity className="h-3.5 w-3.5" />
                  Agent Control
                </Link>
              </Button>
            </div>
          }
        >
          <ActivityFeed limit={12} pollIntervalMs={5000} />
        </PageSection>

        {/* Pending approvals */}
        <PageSection
          title="Pending Approvals"
          description="Spends blocked by autonomy policy — approve to execute on-chain."
        >
          <ApprovalQueue />
        </PageSection>

        {/* Auto reports */}
        <PageSection
          title="Agent Reports"
          description="Venice-generated reports after spending milestones."
        >
          <RecentReports limit={3} />
        </PageSection>

        {/* Overview */}
        <PageSection
          title="Overview"
          description="Treasury status and today's decisions."
        >
          <StatsCards />
        </PageSection>

        {/* Budget & Alerts */}
        <PageSection
          title="Budget & Alerts"
          description="Budget allocation and detected anomalies."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <BudgetPoolCard pool={pool} />
            <AnomalyAlerts anomalies={anomalies} />
          </div>
        </PageSection>

        {/* Active permissions */}
        {permissions.length > 0 ? (
          <PageSection
            title="Active Permissions"
            description={`${permissions.length} agents with active ERC-7715 permissions.`}
          >
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
              {permissions.map((p) => (
                <StaggerItem key={p.id}>
                  <PermissionCard permission={p} />
                </StaggerItem>
              ))}
            </Stagger>
          </PageSection>
        ) : (
          <PageSection
            title="No Agents Yet"
            description="Get started by registering your first agent."
          >
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
              <p className="text-sm text-zinc-500">
                No active permissions yet. Register an agent to begin the workflow.
              </p>
              <Button variant="emerald" size="sm" className="mt-4" asChild>
                <Link href="/register-agent">
                  <UserPlus className="h-3.5 w-3.5" />
                  Register Agent
                </Link>
              </Button>
            </div>
          </PageSection>
        )}
      </div>
    </AppShell>
  );
}
