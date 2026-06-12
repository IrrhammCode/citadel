"use client";

import { useMemo } from "react";
import type { StoredPermission } from "@/types/permission";
import { getPermissions } from "@/lib/storage";
import { useServerStore } from "@/hooks/useServerStore";

export function usePermissions() {
  const { store, loaded, refresh } = useServerStore();

  const permissions = useMemo<StoredPermission[]>(() => {
    if (store?.permissions?.length) return store.permissions;
    return getPermissions();
  }, [store]);

  return { permissions, loaded, refresh };
}
