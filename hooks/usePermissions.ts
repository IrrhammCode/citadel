"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoredPermission } from "@/types/permission";
import { getPermissions } from "@/lib/storage";

export function usePermissions() {
  const [permissions, setPermissions] = useState<StoredPermission[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setPermissions(getPermissions());
    setLoaded(true);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
    const onStorage = () => refresh();
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  return { permissions, loaded, refresh };
}
