"use client";

import { useCallback, useEffect, useState } from "react";
import { getPermissions, getCustomSystems, getAuditLog, getActivity } from "@/lib/storage";
import { fetchServerStore } from "@/lib/store-sync";

export type FlowStep = {
  id: "register" | "run" | "deliver" | "venice";
  label: string;
  description: string;
  href: string;
  done: boolean;
  active: boolean;
};

export function useFlowProgress() {
  const [steps, setSteps] = useState<FlowStep[]>([]);
  const [progress, setProgress] = useState(0);

  const refresh = useCallback(async () => {
    const server = await fetchServerStore();
    const permissions = server?.permissions?.length
      ? server.permissions
      : getPermissions();
    const customAgents = server?.customSystems?.length
      ? server.customSystems
      : getCustomSystems();
    const auditLog = server?.auditLog?.length ? server.auditLog : getAuditLog();
    const activity = server?.activity?.length ? server.activity : getActivity(5);
    const decisions = server?.decisions?.length ?? 0;

    const hasRegistered = customAgents.length > 0 || permissions.length > 0;
    const hasPermission = permissions.length > 0;
    const hasAudit = auditLog.length > 0;
    const hasActivity = activity.length > 0 || decisions > 0;

    const flowSteps: FlowStep[] = [
      {
        id: "register",
        label: "Register Agent",
        description: "Define agent + grant ERC-7715",
        href: "/register-agent",
        done: hasRegistered && hasPermission,
        active: !hasPermission,
      },
      {
        id: "run",
        label: "Run Agent",
        description: "Start cycle → think → audit → execute",
        href: "/agent-dashboard",
        done: hasAudit && (hasActivity || decisions > 0),
        active: hasPermission && !hasAudit,
      },
      {
        id: "deliver",
        label: "View Results",
        description: "Activity feed, audit log, reports",
        href: "/dashboard",
        done: hasActivity,
        active: hasAudit && !hasActivity,
      },
      {
        id: "venice",
        label: "Venice AI",
        description: "Audit reasoning & billing",
        href: "/audit-log",
        done: hasAudit,
        active: false,
      },
    ];

    const doneCount = flowSteps.filter((s) => s.done).length;
    setSteps(flowSteps);
    setProgress(Math.round((doneCount / flowSteps.length) * 100));
  }, []);

  useEffect(() => {
    refresh();
    const onSync = () => refresh();
    window.addEventListener("citadel_synced", onSync);
    window.addEventListener("systems_updated", onSync);
    const interval = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("citadel_synced", onSync);
      window.removeEventListener("systems_updated", onSync);
      clearInterval(interval);
    };
  }, [refresh]);

  const currentStep = steps.find((s) => s.active) ?? steps.find((s) => !s.done) ?? steps[steps.length - 1];

  return { steps, progress, currentStep, refresh };
}
