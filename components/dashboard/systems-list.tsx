"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSystems } from "@/hooks/useSystems";
import { usePermissions } from "@/hooks/usePermissions";
import { GrantPermissionModal } from "@/components/permissions/grant-permission-modal";
import { CreateSystemModal } from "@/components/systems/create-system-modal";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion/motion";

const statusVariant = {
  active: "default" as const,
  idle: "secondary" as const,
  restricted: "warning" as const,
};

export function SystemsList() {
  const { permissions, refresh } = usePermissions();
  const { systems } = useSystems();

  return (
    <FadeIn>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>Autonomous Systems</CardTitle>
            <CardDescription className="mt-1">
              Grant granular ERC-7715 permissions to autonomous treasury agents.
            </CardDescription>
          </div>
          <CreateSystemModal />
        </CardHeader>
        <CardContent className="space-y-4">
          <Stagger stagger={0.1}>
            {systems.map((system) => {
              const permission = permissions.find((p) => p.systemId === system.id);
              return (
                <StaggerItem key={system.id}>
                  <motion.div
                    whileHover={{ x: 4, borderColor: "rgba(16,185,129,0.2)" }}
                    className="flex flex-col gap-4 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-start gap-3">
                      <motion.div
                        whileHover={{ rotate: 8, scale: 1.05 }}
                        className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800"
                      >
                        <Bot className="h-5 w-5 text-zinc-400" />
                      </motion.div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-zinc-100">{system.name}</p>
                          <Badge variant={statusVariant[system.status]}>
                            {system.status}
                          </Badge>
                          {permission && (
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                            >
                              <Badge variant="default">Permission granted</Badge>
                            </motion.div>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-zinc-400">{system.description}</p>
                        {permission && (
                          <p className="mt-1 text-xs text-emerald-400/80">
                            Daily limit: {permission.maxDailySpend} USDC · Expires{" "}
                            {new Date(permission.expiry * 1000).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GrantPermissionModal
                        systemId={system.id}
                        systemName={system.name}
                        existingPermission={permission}
                        onGranted={refresh}
                      />
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/systems/${system.id}`}>
                          Simulate
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </Stagger>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
