"use client";

import { useEffect, useRef } from "react";
import { syncToServer } from "@/lib/store-sync";

const SYNC_EVENTS = [
  "knowledge_updated",
  "memory_updated",
  "citadel_synced",
  "citadel_storage_updated",
  "schedules_updated",
] as const;

/** Debounced push to server when local state changes */
export function AutoSyncProvider({ children }: { children: React.ReactNode }) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const scheduleSync = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        syncToServer().catch(() => {});
      }, 800);
    };

    for (const event of SYNC_EVENTS) {
      window.addEventListener(event, scheduleSync);
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("citadel")) scheduleSync();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of SYNC_EVENTS) {
        window.removeEventListener(event, scheduleSync);
      }
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return <>{children}</>;
}
