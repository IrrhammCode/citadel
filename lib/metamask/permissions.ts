/**
 * MetaMask ERC-7715 Permission Flow
 * Real integration with MetaMask Smart Accounts Kit
 */

import { createPublicClient, createWalletClient, http, parseUnits } from "viem";
import { sepolia } from "viem/chains";
import { erc7710WalletActions } from "@metamask/smart-accounts-kit/actions";
import { getSessionAccount } from "./session-account";
import { CHAIN, USDC_ADDRESS, USDC_DECIMALS } from "@/lib/constants";

// ─── Types ──────────────────────────────────────────────────

export type PermissionRequest = {
  systemId: string;
  systemName: string;
  maxDailySpend: number; // USDC
  duration: number; // seconds
  scope: "daily" | "per-transaction" | "lifetime";
  justification: string;
};

export type GrantedPermission = {
  id: string;
  systemId: string;
  permissionContext: string;
  delegationManager: string;
  grantedAt: number;
  expiresAt: number;
  maxDailySpend: number;
  scope: string;
  status: "active" | "expired" | "revoked";
};

// ─── Request Permission from MetaMask ───────────────────────

export async function requestPermission(
  walletClient: any,
  request: PermissionRequest,
): Promise<GrantedPermission> {
  // Build ERC-7715 permission request
  const permissionRequest = {
    requiredMethods: ["eth_sendTransaction"],
    expiry: Math.floor(Date.now() / 1000) + request.duration,
    permissions: [
      {
        type: "contract-call",
        data: {
          address: USDC_ADDRESS,
          functions: [
            {
              name: "transfer",
              parameters: [
                { name: "to", type: "address" },
                { name: "amount", type: "uint256" },
              ],
            },
          ],
        },
      },
    ],
    // Scope limitations
    limits: {
      maxAmountPerTransaction: parseUnits(request.maxDailySpend.toString(), USDC_DECIMALS),
      maxAmountPerDay: parseUnits(request.maxDailySpend.toString(), USDC_DECIMALS),
    },
    // Metadata
    metadata: {
      systemId: request.systemId,
      systemName: request.systemName,
      justification: request.justification,
    },
  };

  // Call MetaMask requestExecutionPermissions
  const result = await walletClient.requestExecutionPermissions([permissionRequest]);

  if (!result || result.length === 0) {
    throw new Error("Permission request rejected by user");
  }

  const permission = result[0];

  // Store permission
  const grantedPermission: GrantedPermission = {
    id: crypto.randomUUID(),
    systemId: request.systemId,
    permissionContext: permission.context,
    delegationManager: permission.delegationManager,
    grantedAt: Date.now(),
    expiresAt: Date.now() + request.duration * 1000,
    maxDailySpend: request.maxDailySpend,
    scope: request.scope,
    status: "active",
  };

  return grantedPermission;
}

// ─── Execute Delegated Transaction ──────────────────────────

export async function executeDelegated(
  permission: GrantedPermission,
  recipient: string,
  amount: number,
  memo: string,
): Promise<string> {
  const sessionAccount = getSessionAccount();
  const amountWei = parseUnits(amount.toString(), USDC_DECIMALS);

  // Encode USDC transfer
  const { encodeFunctionData, erc20Abi } = await import("viem");
  const data = encodeFunctionData({
    abi: erc20Abi,
    functionName: "transfer",
    args: [recipient as `0x${string}`, amountWei],
  });

  // Create wallet client with ERC-7710 actions
  const publicClient = createPublicClient({
    chain: CHAIN,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account: sessionAccount,
    chain: CHAIN,
    transport: http(),
  }).extend(erc7710WalletActions());

  // Execute via delegation
  const hash = await walletClient.sendTransactionWithDelegation({
    account: sessionAccount,
    chain: CHAIN,
    to: USDC_ADDRESS,
    data,
    permissionContext: permission.permissionContext as `0x${string}`,
    delegationManager: permission.delegationManager as `0x${string}`,
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash });

  return hash;
}

// ─── Check Permission Status ────────────────────────────────

export function isPermissionValid(permission: GrantedPermission): boolean {
  if (permission.status !== "active") return false;
  if (Date.now() > permission.expiresAt) return false;
  return true;
}

// ─── Revoke Permission ──────────────────────────────────────

export function revokePermission(permission: GrantedPermission): GrantedPermission {
  return {
    ...permission,
    status: "revoked",
  };
}

// ─── Get Daily Spend Against Permission ─────────────────────

export function getDailySpendForPermission(
  permission: GrantedPermission,
  auditLog: { systemId: string; amount: number; timestamp: number; decision: string }[],
): number {
  const today = new Date().toISOString().slice(0, 10);
  return auditLog
    .filter((a) => {
      const auditDate = new Date(a.timestamp).toISOString().slice(0, 10);
      return (
        a.systemId === permission.systemId &&
        auditDate === today &&
        a.decision === "approved"
      );
    })
    .reduce((sum, a) => sum + a.amount, 0);
}

// ─── Check if Spend is Within Permission ────────────────────

export function canSpend(
  permission: GrantedPermission,
  amount: number,
  dailySpent: number,
): { allowed: boolean; reason?: string } {
  if (!isPermissionValid(permission)) {
    return { allowed: false, reason: "Permission expired or revoked" };
  }

  if (amount > permission.maxDailySpend) {
    return {
      allowed: false,
      reason: `Amount ${amount} exceeds max per-transaction ${permission.maxDailySpend}`,
    };
  }

  if (dailySpent + amount > permission.maxDailySpend) {
    return {
      allowed: false,
      reason: `Daily spend would exceed limit: ${dailySpent} + ${amount} > ${permission.maxDailySpend}`,
    };
  }

  return { allowed: true };
}
