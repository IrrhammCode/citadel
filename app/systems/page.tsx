"use client";

import Link from "next/link";
import { ArrowRight, Bot, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageSection } from "@/components/layout/page-section";
import { SystemsList } from "@/components/dashboard/systems-list";
import { PipelineGuide } from "@/components/flow/pipeline-guide";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSystems } from "@/hooks/useSystems";
import { usePermissions } from "@/hooks/usePermissions";
import { Stagger, StaggerItem } from "@/components/motion/motion";

export default function SystemsPage() {
  const { systems } = useSystems();
  const { permissions } = usePermissions();
  const builtinWithoutPermission = systems.filter(
    (s) => !s.isCustom && !permissions.some((p) => p.systemId === s.id),
  );

  return (
    <AppShell
      title="Systems"
      description="Manage autonomous agents — custom and built-in."
      actions={
        <Button variant="emerald" size="sm" asChild>
          <Link href="/register-agent">
            <UserPlus className="h-3.5 w-3.5" />
            Register Agent
          </Link>
        </Button>
      }
    >
      <div className="space-y-10">
        <PipelineGuide compact />

        <PageSection
          title="Active Agents"
          description="Agents registered with permissions — ready to run."
        >
          <SystemsList />
        </PageSection>

        {builtinWithoutPermission.length > 0 && (
          <PageSection
            title="Built-in Templates"
            description="Use these templates or register a custom agent via the wizard."
          >
            <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" stagger={0.06}>
              {builtinWithoutPermission.slice(0, 6).map((system) => (
                <StaggerItem key={system.id}>
                  <Card className="flex h-full flex-col">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-zinc-500" />
                        <CardTitle className="text-base">{system.name}</CardTitle>
                      </div>
                      <CardDescription className="line-clamp-2">{system.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto flex items-center justify-between pt-0">
                      <Badge variant="secondary">Template</Badge>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/systems/${system.id}`}>
                          Open
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </StaggerItem>
              ))}
            </Stagger>
          </PageSection>
        )}
      </div>
    </AppShell>
  );
}
