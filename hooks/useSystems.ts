"use client";

import { useCallback, useEffect, useState } from "react";
import { AUTONOMOUS_SYSTEMS, AutonomousSystem } from "@/types/system";
import { getCustomSystems } from "@/lib/storage";

export function useSystems() {
  const [systems, setSystems] = useState<AutonomousSystem[]>(AUTONOMOUS_SYSTEMS);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    const customSystems = getCustomSystems();
    setSystems([...AUTONOMOUS_SYSTEMS, ...customSystems]);
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    // Custom event to trigger re-render in the same window
    window.addEventListener("systems_updated", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("systems_updated", onStorage);
    };
  }, [refresh]);

  return { systems, loaded, refresh };
}
