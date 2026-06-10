import type { GetGrantedExecutionPermissionsResult } from "@metamask/smart-accounts-kit/actions";

export type StoredPermission = {
  id: string;
  systemId: string;
  systemName: string;
  maxDailySpend: string;
  expiry: number;
  justification: string;
  grantedAt: number;
  sessionAddress: string;
  grantedPermissions: GetGrantedExecutionPermissionsResult;
};

export type GrantPermissionForm = {
  systemId: string;
  maxDailySpend: string;
  expiryDays: number;
  justification: string;
};
