"use client";

import { useMemo } from "react";
import { AUTONOMOUS_SYSTEMS, AutonomousSystem } from "@/types/system";
import { getCustomSystems } from "@/lib/storage";
import { useServerStore } from "@/hooks/useServerStore";

export function useSystems() {
  const { store, loaded, refresh } = useServerStore();

  const systems = useMemo<AutonomousSystem[]>(() => {
    const custom = store?.customSystems?.length ? store.customSystems : getCustomSystems();
    return [...AUTONOMOUS_SYSTEMS, ...custom];
  }, [store]);

  return { systems, loaded, refresh };
}
