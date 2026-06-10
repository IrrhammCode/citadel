"use client";

import { AppShell } from "@/components/layout/app-shell";
import { AuditLogTable } from "@/components/audit/audit-log-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/motion";

export default function AuditLogPage() {
  return (
    <AppShell
      title="Audit Log"
      description="Complete history of Venice AI compliance decisions."
    >
      <FadeIn>
        <Card>
          <CardHeader>
            <CardTitle>Compliance Decisions</CardTitle>
            <CardDescription>
              Every spend request audited by Venice AI with approve/block reasoning.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuditLogTable />
          </CardContent>
        </Card>
      </FadeIn>
    </AppShell>
  );
}
