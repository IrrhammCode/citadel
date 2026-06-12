"use client";

import { useCallback, useEffect, useState } from "react";
import { pullFromServer } from "@/lib/store-sync";

/** Poll server store and sync to localStorage */
export function useServerSync(intervalMs = 5000) {
  const [lastSync, setLastSync] = useState<number>(0);
  const [syncing, setSyncing] = useState(false);

  const sync = useCallback(async () => {
    setSyncing(true);
    try {
      const ok = await pullFromServer();
      if (ok) setLastSync(Date.now());
      return ok;
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    sync();
    const interval = setInterval(sync, intervalMs);
    const onEvent = () => sync();
    window.addEventListener("citadel_synced", onEvent);
    return () => {
      clearInterval(interval);
      window.removeEventListener("citadel_synced", onEvent);
    };
  }, [sync, intervalMs]);

  return { sync, lastSync, syncing };
}
