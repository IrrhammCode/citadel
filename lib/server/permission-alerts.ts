import "server-only";

import { getServerStore } from "@/lib/server/store";
import { notifySlackPermissionExpiring } from "@/lib/notifications/slack";

const alertedKeys = new Set<string>();

/** Notify Slack when permissions expire within 24 hours (once per permission+expiry). */
export async function notifyExpiringPermissions(): Promise<number> {
  const store = getServerStore();
  const nowSec = Math.floor(Date.now() / 1000);
  const thresholdSec = nowSec + 86_400;
  let count = 0;

  for (const permission of store.permissions) {
    if (permission.expiry <= nowSec || permission.expiry > thresholdSec) continue;
    const key = `${permission.id}:${permission.expiry}`;
    if (alertedKeys.has(key)) continue;
    alertedKeys.add(key);
    await notifySlackPermissionExpiring(permission);
    count++;
  }

  return count;
}
