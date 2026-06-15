"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Activity, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageSection } from "@/components/layout/page-section";
import { AgentGoalCard } from "@/components/agent/agent-goal-card";
import { TrustScoreBadge } from "@/components/agent/trust-score-badge";
import { AnomalyAlerts } from "@/components/agent/anomaly-alerts";
import { ActivityFeed } from "@/components/agent/activity-feed";
import { ReportViewer } from "@/components/agent/report-viewer";
import { PipelineGuide } from "@/components/flow/pipeline-guide";
import { useSystems } from "@/hooks/useSystems";
import { usePermissions } from "@/hooks/usePermissions";
import { useServerStore } from "@/hooks/useServerStore";
import { AgentLifecyclePanel } from "@/components/agent/agent-lifecycle-panel";
import { getTrustScore, getAnomalies, getAuditLog } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SystemAgentPage() {
  const params = useParams<{ id: string }>();
  const { systems, loaded } = useSystems();
  const { permissions } = usePermissions();
  const { store } = useServerStore();
  const system = systems.find((s) => s.id === params.id);
  const hasPermission = permissions.some((p) => p.systemId === params.id);

  if (!loaded) return null;

  if (!system) {
    return (
      <AppShell title="System not found">
        <div className="py-16 text-center">
          <p className="text-zinc-500">System not found.</p>
          <Button className="mt-4" variant="outline" asChild>
            <Link href="/systems">Back to Systems</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const trustScore = store?.trustScores?.[system.id] ?? getTrustScore(system.id);
  const anomalies = getAnomalies(system.id);
  const unresolvedCount = anomalies.filter((a) => !a.resolved).length;
  const auditLog = store?.auditLog?.length ? store.auditLog : getAuditLog();
  const totalSpent = auditLog
    .filter((r) => r.systemId === system.id && r.verdict.decision === "approved")
    .reduce((sum, r) => sum + parseFloat(r.spendRequest.amount), 0);

  return (
    <AppShell
      title={system.name}
      description={system.goal || "Detail autonomous agent."}
      actions={
        <div className="flex gap-2">
          {hasPermission ? (
            <Button variant="emerald" size="sm" asChild>
              <Link href="/agent-dashboard">
                <Activity className="h-3.5 w-3.5" />
                Run Agent
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/register-agent">
                <UserPlus className="h-3.5 w-3.5" />
                Grant Permission
              </Link>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/systems">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-8">
        <PipelineGuide compact />

        <PageSection title="Overview">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <AgentGoalCard system={system} trustScore={trustScore} totalSpent={totalSpent} />
            </div>
            <TrustScoreBadge trustScore={trustScore} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">{system.category}</Badge>
            <Badge variant={hasPermission ? "default" : "outline"}>
              {hasPermission ? "Permission aktif" : "Belum di-grant"}
            </Badge>
          </div>
        </PageSection>

        <PageSection title="Lifecycle">
          <AgentLifecyclePanel
            systemId={system.id}
            systemName={system.name}
            isCustom={!!system.isCustom}
            hasPermission={hasPermission}
          />
        </PageSection>

        <PageSection title="Aktivitas & Audit">
          <Tabs defaultValue="activity">
            <TabsList className="mb-4 w-full justify-start border border-[--border-default] bg-[--canvas-elevated]">
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="anomalies">
                Anomalies
                {unresolvedCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
                    {unresolvedCount}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="report">AI Report</TabsTrigger>
            </TabsList>

            <TabsContent value="activity" className="mt-0">
              <ActivityFeed systemId={system.id} limit={15} pollIntervalMs={5000} />
            </TabsContent>
            <TabsContent value="anomalies" className="mt-0">
              <AnomalyAlerts anomalies={anomalies} />
            </TabsContent>
            <TabsContent value="report" className="mt-0">
              <ReportViewer systemId={system.id} systemName={system.name} />
            </TabsContent>
          </Tabs>
        </PageSection>
      </div>
    </AppShell>
  );
}
