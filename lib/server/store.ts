import type { AuditRecord } from "@/types/audit";
import type { ActivityEvent } from "@/types/activity";
import type { TrustScore } from "@/types/agent";
import type { DecisionRecord } from "@/lib/agent/memory";
import { AUTONOMOUS_SYSTEMS } from "@/types/system";
import { mergeByKey, mergeRecords, mergeDailySpend } from "@/lib/server/merge";
import { getStoreBackend } from "@/lib/server/backends";
import { publishActivityUpdate } from "@/lib/server/redis";

export type {
  AgentLoopStatus,
  VeniceUsageRecord,
  CitadelStore,
} from "@/lib/server/store-types";
export { DEFAULT_STORE } from "@/lib/server/store-types";

import type { AgentLoopStatus, VeniceUsageRecord, CitadelStore } from "@/lib/server/store-types";
import { DEFAULT_STORE } from "@/lib/server/store-types";

let memoryStore: CitadelStore | null = null;
let storeVersion = 1;
let hydratePromise: Promise<CitadelStore> | null = null;

const SAVE_RETRIES = 3;

async function persistStore(store: CitadelStore): Promise<void> {
  for (let attempt = 0; attempt < SAVE_RETRIES; attempt++) {
    const result = await getStoreBackend().save(store, storeVersion);
    if (result !== "conflict") {
      storeVersion = result.version;
      return;
    }
    const fresh = await getStoreBackend().load();
    memoryStore = fresh.store;
    storeVersion = fresh.version;
    console.warn(`[store] optimistic lock conflict — reloaded v${storeVersion} (attempt ${attempt + 1})`);
  }
  throw new Error("[store] could not persist after optimistic lock retries");
}

/** Load latest store from Postgres/file into memory (call at API entry) */
export async function hydrateServerStore(): Promise<CitadelStore> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = getStoreBackend()
    .load()
    .then((result) => {
      memoryStore = result.store;
      storeVersion = result.version;
      hydratePromise = null;
      return result.store;
    })
    .catch((err) => {
      hydratePromise = null;
      console.error("[store] hydrate failed:", err);
      memoryStore = memoryStore ?? { ...DEFAULT_STORE };
      return memoryStore;
    });
  return hydratePromise;
}

export function getServerStore(): CitadelStore {
  if (!memoryStore) {
    memoryStore = { ...DEFAULT_STORE };
  }
  return memoryStore;
}

export function getStoreVersion(): number {
  return storeVersion;
}

export async function saveServerStoreAsync(store: CitadelStore): Promise<void> {
  memoryStore = { ...store, lastSync: Date.now() };
  await persistStore(memoryStore);
}

export function saveServerStore(store: CitadelStore): void {
  memoryStore = { ...store, lastSync: Date.now() };
  void persistStore(memoryStore).catch((err) => {
    console.error("[store] async save failed:", err);
    void hydrateServerStore();
  });
}

export function mergeServerStore(
  partial: Partial<CitadelStore>,
  opts?: { fromClient?: boolean },
): CitadelStore {
  const current = getServerStore();
  const fromClient = opts?.fromClient ?? false;

  const merged: CitadelStore = {
    ...current,
    permissions: mergeByKey(partial.permissions, current.permissions, "systemId"),
    customSystems: mergeByKey(partial.customSystems, current.customSystems, "id"),
    auditLog: mergeByKey(partial.auditLog, current.auditLog, "id", 500),
    activity: mergeByKey(partial.activity, current.activity, "id", 200),
    decisions: mergeByKey(partial.decisions, current.decisions, "id", 200),
    reports: mergeByKey(partial.reports, current.reports, "id", 100),
    approvalRequests: mergeByKey(
      partial.approvalRequests,
      current.approvalRequests,
      "id",
    ),
    knowledge: mergeByKey(partial.knowledge, current.knowledge, "id", 500),
    agentGoals: mergeByKey(partial.agentGoals, current.agentGoals, "id"),
    autonomyConfigs: mergeRecords(current.autonomyConfigs, partial.autonomyConfigs),
    trustScores: mergeRecords(current.trustScores, partial.trustScores),
    agentLoops: mergeRecords(current.agentLoops, partial.agentLoops),
    budgetPool: partial.budgetPool !== undefined ? partial.budgetPool : current.budgetPool,
    veniceUsage: fromClient
      ? current.veniceUsage
      : mergeByKey(partial.veniceUsage, current.veniceUsage, "id", 500),
    spendCounts: fromClient
      ? current.spendCounts
      : { ...current.spendCounts, ...partial.spendCounts },
    dailySpend: fromClient
      ? current.dailySpend
      : mergeDailySpend(current.dailySpend, partial.dailySpend),
    lastSync: Date.now(),
  };
  saveServerStore(merged);
  return merged;
}

export function getAgentLoopStatus(systemId: string): AgentLoopStatus | undefined {
  return getServerStore().agentLoops[systemId];
}

export function saveAgentLoopStatus(status: AgentLoopStatus) {
  const store = getServerStore();
  store.agentLoops[status.systemId] = status;
  saveServerStore(store);
}

export function getAllAgentLoopStatuses(): Record<string, AgentLoopStatus> {
  return getServerStore().agentLoops;
}

export function getServerPermission(systemId: string) {
  return getServerStore().permissions.find((p) => p.systemId === systemId);
}

export function getServerSystem(systemId: string) {
  const store = getServerStore();
  return (
    AUTONOMOUS_SYSTEMS.find((s) => s.id === systemId) ||
    store.customSystems.find((s) => s.id === systemId)
  );
}

export function appendServerAudit(record: AuditRecord) {
  const store = getServerStore();
  store.auditLog = [record, ...store.auditLog].slice(0, 500);
  saveServerStore(store);
}

export function appendServerActivity(event: Omit<ActivityEvent, "id" | "timestamp">) {
  const store = getServerStore();
  const full: ActivityEvent = {
    ...event,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  store.activity = [full, ...store.activity].slice(0, 200);
  saveServerStore(store);
  void publishActivityUpdate({
    activityLen: store.activity.length,
    topId: full.id,
  });
  return full;
}

export function appendServerDecision(record: DecisionRecord) {
  const store = getServerStore();
  store.decisions = [record, ...store.decisions].slice(0, 200);
  saveServerStore(store);
}

export function incrementSpendCount(systemId: string): number {
  const store = getServerStore();
  const next = (store.spendCounts[systemId] ?? 0) + 1;
  store.spendCounts[systemId] = next;
  saveServerStore(store);
  return next;
}

export function appendVeniceUsage(record: Omit<VeniceUsageRecord, "id" | "timestamp">) {
  const store = getServerStore();
  const full: VeniceUsageRecord = {
    ...record,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  };
  store.veniceUsage = [full, ...store.veniceUsage].slice(0, 500);
  saveServerStore(store);
  return full;
}

export function getServerDailySpend(systemId: string): string {
  const store = getServerStore();
  const today = new Date().toISOString().slice(0, 10);
  const entry = store.dailySpend[systemId];
  if (!entry || entry.date !== today) return "0";
  return entry.amount;
}

export function updateServerTrustScore(
  systemId: string,
  event: { type: string; description: string; points: number; timestamp: number },
) {
  const store = getServerStore();
  const current = store.trustScores[systemId] ?? {
    score: 50,
    level: "standard" as const,
    maxTxAmount: 20,
    history: [],
    updatedAt: Date.now(),
  };
  const newScore = Math.max(0, Math.min(100, current.score + event.points));
  let level: TrustScore["level"] = "standard";
  let maxTxAmount = 20;
  if (newScore <= 30) { level = "restricted"; maxTxAmount = 5; }
  else if (newScore <= 60) { level = "standard"; maxTxAmount = 20; }
  else if (newScore <= 80) { level = "trusted"; maxTxAmount = 50; }
  else { level = "elite"; maxTxAmount = 100; }

  store.trustScores[systemId] = {
    score: newScore,
    level,
    maxTxAmount,
    history: [event as TrustScore["history"][0], ...current.history].slice(0, 50),
    updatedAt: Date.now(),
  };
  saveServerStore(store);
  return store.trustScores[systemId];
}

export function addServerDailySpend(systemId: string, amount: string) {
  const store = getServerStore();
  const today = new Date().toISOString().slice(0, 10);
  const current = getServerDailySpend(systemId);
  const next = (parseFloat(current) + parseFloat(amount)).toString();
  store.dailySpend[systemId] = { date: today, amount: next };
  saveServerStore(store);
}
