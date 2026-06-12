/**
 * Normalize MetaMask ERC-7715 granted permission objects for executeDelegatedTransfer.
 * Kit may return `context` or nested shapes — we map to permissionContext + delegationManager.
 */
export type NormalizedDelegationPermission = {
  permissionContext: string;
  delegationManager: string;
};

export function normalizeDelegationPermission(raw: unknown): NormalizedDelegationPermission | null {
  if (!raw || typeof raw !== "object") return null;

  const p = raw as Record<string, unknown>;

  const permissionContext =
    (p.permissionContext as string) ||
    (p.context as string) ||
    (p.permission as Record<string, unknown>)?.context as string ||
    undefined;

  const delegationManager =
    (p.delegationManager as string) ||
    (p.delegationManagerAddress as string) ||
    undefined;

  if (!permissionContext || !delegationManager) return null;

  return { permissionContext, delegationManager };
}

/** Extract first delegatable permission from StoredPermission.grantedPermissions */
export function normalizeStoredPermission(grantedPermissions: unknown): NormalizedDelegationPermission | null {
  if (!grantedPermissions) return null;

  if (Array.isArray(grantedPermissions)) {
    for (const item of grantedPermissions) {
      const normalized = normalizeDelegationPermission(item);
      if (normalized) return normalized;
    }
    return null;
  }

  return normalizeDelegationPermission(grantedPermissions);
}
