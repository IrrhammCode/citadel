"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { SpendRequestForm } from "@/components/audit/spend-request-form";
import { AgentGoalCard } from "@/components/agent/agent-goal-card";
import { TrustScoreBadge } from "@/components/agent/trust-score-badge";
import { AnomalyAlerts } from "@/components/agent/anomaly-alerts";
import { ReportViewer } from "@/components/agent/report-viewer";
import { NegotiationPanel } from "@/components/agent/negotiation-panel";
import { useSystems } from "@/hooks/useSystems";
import { getTrustScore, getAnomalies, getAuditLog } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SystemSimulatorPage() {
  const params = useParams<{ id: string }>();
  const { systems, loaded } = useSystems();
  const system = systems.find((s) => s.id === params.id);

  if (!loaded) return null;

  if (!system) {
    return (
      <AppShell title="System not found">
        <div className="text-center">
          <p className="text-zinc-400">This autonomous system does not exist.</p>
          <Button className="mt-4" asChild>
            <Link href="/systems">Back to Systems</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const trustScore = getTrustScore(system.id);
  const anomalies = getAnomalies(system.id);
  const totalSpent = getAuditLog()
    .filter((r) => r.systemId === system.id && r.verdict.decision === "approved")
    .reduce((sum, r) => sum + parseFloat(r.spendRequest.amount), 0);

  return (
    <AppShell
      title={system.name}
      description={system.goal || "Autonomous spend simulator with Venice AI compliance firewall."}
    >
      <div className="space-y-6">
        {/* Agent Overview */}
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AgentGoalCard system={system} trustScore={trustScore} totalSpent={totalSpent} />
          </div>
          <div>
            <TrustScoreBadge trustScore={trustScore} />
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="spend" className="space-y-4">
          <TabsList className="bg-zinc-900 border border-zinc-800">
            <TabsTrigger value="spend">Spend Request</TabsTrigger>
            <TabsTrigger value="anomalies">
              Anomalies {anomalies.filter((a) => !a.resolved).length > 0 && (
                <span className="ml-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-xs text-red-400">
                  {anomalies.filter((a) => !a.resolved).length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="report">AI Report</TabsTrigger>
            <TabsTrigger value="negotiate">Negotiate</TabsTrigger>
          </TabsList>

          <TabsContent value="spend">
            <SpendRequestForm system={system} />
          </TabsContent>

          <TabsContent value="anomalies">
            <AnomalyAlerts anomalies={anomalies} />
          </TabsContent>

          <TabsContent value="report">
            <ReportViewer systemId={system.id} systemName={system.name} />
          </TabsContent>

          <TabsContent value="negotiate">
            <NegotiationPanel systemId={system.id} />
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
