"use client";

import {
  getPermissions,
  getCustomSystems,
  getAuditLog,
  getActivity,
  getAllAgentGoals,
  getReports,
  getBudgetPool,
  getTrustScore,
} from "@/lib/storage";
import { getAutonomyConfig } from "@/lib/agent/autonomy";
import { getRecentDecisions } from "@/lib/agent/memory";
import { getAllKnowledge } from "@/lib/agent/knowledge";
import type { CitadelStore } from "@/lib/server/store";

/** Push localStorage state to server before agent operations */
export async function syncToServer(): Promise<{ ok: boolean; error?: string }> {
  try {
    const systems = getCustomSystems();
    const autonomyConfigs: Record<string, ReturnType<typeof getAutonomyConfig>> = {};
    for (const s of systems) {
      autonomyConfigs[s.id] = getAutonomyConfig(s.id);
    }
    for (const p of getPermissions()) {
      if (!autonomyConfigs[p.systemId]) {
        autonomyConfigs[p.systemId] = getAutonomyConfig(p.systemId);
      }
    }

    const trustScores: Record<string, ReturnType<typeof getTrustScore>> = {};
    for (const p of getPermissions()) {
      trustScores[p.systemId] = getTrustScore(p.systemId);
    }
    for (const s of systems) {
      if (!trustScores[s.id]) trustScores[s.id] = getTrustScore(s.id);
    }

    const payload: Partial<CitadelStore> = {
      permissions: getPermissions(),
      customSystems: getCustomSystems(),
      auditLog: getAuditLog(),
      activity: getActivity(200),
      autonomyConfigs,
      agentGoals: getAllAgentGoals(),
      reports: getReports(),
      budgetPool: getBudgetPool(),
      trustScores,
      decisions: getRecentDecisions(200),
      knowledge: getAllKnowledge(),
    };

    const res = await fetch("/api/store", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: (body as { error?: string }).error ?? res.statusText };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Sync failed" };
  }
}

/** Pull server state into localStorage — full sync */
export async function pullFromServer(): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/store");
    if (!res.ok) return { ok: false, error: res.statusText };
    const store = (await res.json()) as CitadelStore;

    const { writeJson } = await import("@/lib/storage-internal");

    if (store.auditLog?.length) {
      const existing = getAuditLog();
      const merged = [...store.auditLog, ...existing.filter(
        (e) => !store.auditLog.some((s) => s.id === e.id),
      )].sort((a, b) => b.timestamp - a.timestamp);
      writeJson("citadel:audit-log", merged.slice(0, 500));
    }

    if (store.activity?.length) {
      writeJson("citadel:activity", store.activity);
    }

    if (store.reports?.length) {
      writeJson("citadel:reports", store.reports);
    }

    if (store.decisions?.length) {
      const { getMemoryStore } = await import("@/lib/agent/memory");
      const memory = getMemoryStore();
      writeJson("citadel:agent-memory", {
        decisions: store.decisions,
        patterns: memory.patterns,
        learnings: memory.learnings,
        lastUpdated: Date.now(),
      });
    }

    if (store.permissions?.length) {
      writeJson("citadel:permissions", store.permissions);
    }

    if (store.customSystems?.length) {
      writeJson("citadel:custom-systems", store.customSystems);
    }

    if (store.budgetPool) {
      writeJson("citadel:budget-pool", store.budgetPool);
    }

    if (store.trustScores && Object.keys(store.trustScores).length > 0) {
      writeJson("citadel:trust-scores", store.trustScores);
    }

    if (store.approvalRequests?.length) {
      writeJson("citadel:autonomy-approvals", store.approvalRequests);
    }

    if (store.autonomyConfigs && Object.keys(store.autonomyConfigs).length > 0) {
      writeJson("citadel:autonomy-config", store.autonomyConfigs);
    }

    if (store.agentGoals?.length) {
      writeJson("citadel:agent-goals", store.agentGoals);
    }

    if (store.knowledge?.length) {
      writeJson("citadel_knowledge", { items: store.knowledge, lastUpdated: Date.now() });
    }

    window.dispatchEvent(new Event("citadel_synced"));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Pull failed" };
  }
}

/** Fetch server store without writing localStorage (for read-only UI) */
export async function fetchServerStore(): Promise<CitadelStore | null> {
  try {
    const res = await fetch("/api/store");
    if (!res.ok) return null;
    return (await res.json()) as CitadelStore;
  } catch {
    return null;
  }
}
