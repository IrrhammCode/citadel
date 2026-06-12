"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchServerStore, pullFromServer } from "@/lib/store-sync";
import type { CitadelStore } from "@/lib/server/store";

/** Poll server store for server-first UI reads */
export function useServerStore(intervalMs = 5000) {
  const [store, setStore] = useState<CitadelStore | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const server = await fetchServerStore();
    if (server) setStore(server);
    setLoaded(true);
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void pullFromServer().then(() => refresh());
    }, intervalMs);
    const onSync = () => {
      void refresh();
    };
    window.addEventListener("citadel_synced", onSync);
    return () => {
      clearInterval(interval);
      window.removeEventListener("citadel_synced", onSync);
    };
  }, [refresh, intervalMs]);

  return { store, loaded, refresh };
}
