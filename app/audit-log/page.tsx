"use client";

import { AppShell } from "@/components/layout/app-shell";
import { PageSection } from "@/components/layout/page-section";
import { AuditLogTable } from "@/components/audit/audit-log-table";
import { PipelineGuide } from "@/components/flow/pipeline-guide";
import { Card, CardContent } from "@/components/ui/card";

export default function AuditLogPage() {
  return (
    <AppShell
      title="Audit Log"
      description="Step 4 — Complete history of Venice AI decisions with full reasoning."
    >
      <div className="space-y-6">
        <PipelineGuide compact />

        <PageSection
          title="Decision History"
          description="All spend requests audited by Venice AI — approved or blocked."
        >
          <Card>
            <CardContent className="p-0 pt-6">
              <AuditLogTable />
            </CardContent>
          </Card>
        </PageSection>
      </div>
    </AppShell>
  );
}
