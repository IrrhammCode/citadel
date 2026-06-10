import type { AuditRecord } from "@/types/audit";
import type { StoredPermission } from "@/types/permission";

const PERMISSIONS_KEY = "citadel:permissions";
const AUDIT_LOG_KEY = "citadel:audit-log";
const DAILY_SPEND_KEY = "citadel:daily-spend";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function getPermissions(): StoredPermission[] {
  return readJson<StoredPermission[]>(PERMISSIONS_KEY, []);
}

export function savePermission(permission: StoredPermission) {
  const existing = getPermissions().filter((p) => p.systemId !== permission.systemId);
  writeJson(PERMISSIONS_KEY, [...existing, permission]);
}

export function getPermissionForSystem(systemId: string): StoredPermission | undefined {
  return getPermissions().find((p) => p.systemId === systemId);
}

export function getAuditLog(): AuditRecord[] {
  return readJson<AuditRecord[]>(AUDIT_LOG_KEY, []).sort(
    (a, b) => b.timestamp - a.timestamp,
  );
}

export function appendAuditRecord(record: AuditRecord) {
  const log = getAuditLog();
  writeJson(AUDIT_LOG_KEY, [record, ...log]);
}

export function updateAuditRecordTx(id: string, txHash: string) {
  const log = getAuditLog().map((r) => (r.id === id ? { ...r, txHash } : r));
  writeJson(AUDIT_LOG_KEY, log);
}

export function getDailySpend(systemId: string): string {
  const all = readJson<Record<string, { date: string; amount: string }>>(
    DAILY_SPEND_KEY,
    {},
  );
  const today = new Date().toISOString().slice(0, 10);
  const entry = all[systemId];
  if (!entry || entry.date !== today) return "0";
  return entry.amount;
}

export function addDailySpend(systemId: string, amount: string) {
  const all = readJson<Record<string, { date: string; amount: string }>>(
    DAILY_SPEND_KEY,
    {},
  );
  const today = new Date().toISOString().slice(0, 10);
  const current = getDailySpend(systemId);
  const next = (parseFloat(current) + parseFloat(amount)).toString();
  all[systemId] = { date: today, amount: next };
  writeJson(DAILY_SPEND_KEY, all);
}

const CUSTOM_SYSTEMS_KEY = "citadel:custom-systems";

export function getCustomSystems(): import("@/types/system").AutonomousSystem[] {
  return readJson<import("@/types/system").AutonomousSystem[]>(CUSTOM_SYSTEMS_KEY, []);
}

export function saveCustomSystem(system: import("@/types/system").AutonomousSystem) {
  const existing = getCustomSystems();
  writeJson(CUSTOM_SYSTEMS_KEY, [...existing, system]);
}
