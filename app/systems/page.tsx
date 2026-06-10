"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AUTONOMOUS_SYSTEMS } from "@/types/system";
import { usePermissions } from "@/hooks/usePermissions";
import { Stagger, StaggerItem } from "@/components/motion/motion";

export default function SystemsPage() {
  const { permissions } = usePermissions();

  return (
    <AppShell
      title="Autonomous Systems"
      description="Simulate spend requests and run Venice AI compliance audits."
    >
      <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" stagger={0.1}>
        {AUTONOMOUS_SYSTEMS.map((system) => {
          const hasPermission = permissions.some((p) => p.systemId === system.id);
          return (
            <StaggerItem key={system.id}>
              <motion.div whileHover={{ y: -6 }} transition={{ duration: 0.2 }}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <motion.div whileHover={{ rotate: 12 }}>
                        <Bot className="h-4 w-4 text-zinc-400" />
                      </motion.div>
                      <CardTitle className="text-base">{system.name}</CardTitle>
                    </div>
                    <CardDescription>{system.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Badge variant={hasPermission ? "default" : "secondary"}>
                      {hasPermission ? "Permission active" : "No permission"}
                    </Badge>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/systems/${system.id}`}>
                        Open
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </StaggerItem>
          );
        })}
      </Stagger>
    </AppShell>
  );
}
