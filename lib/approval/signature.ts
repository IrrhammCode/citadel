/**
 * EIP-712 wallet signatures for CFO approval / rejection decisions.
 * Shared between client (wagmi signTypedData) and server (viem verify).
 */
import { recoverTypedDataAddress, type Address, type Hex } from "viem";
import { CHAIN_ID } from "@/lib/constants";
import type { ApprovalRequest } from "@/lib/agent/autonomy";

export type ApprovalAction = "approve" | "reject";

export const APPROVAL_DOMAIN = {
  name: "Citadel Treasury",
  version: "1",
  chainId: CHAIN_ID,
} as const;

export const APPROVAL_TYPES = {
  ApprovalDecision: [
    { name: "requestId", type: "string" },
    { name: "systemId", type: "string" },
    { name: "action", type: "string" },
    { name: "amount", type: "uint256" },
    { name: "requestedAt", type: "uint256" },
  ],
} as const;

export const APPROVAL_PRIMARY_TYPE = "ApprovalDecision" as const;

export function buildApprovalMessage(request: ApprovalRequest, action: ApprovalAction) {
  return {
    requestId: request.id,
    systemId: request.systemId,
    action,
    amount: BigInt(Math.round((request.amount ?? 0) * 1_000_000)),
    requestedAt: BigInt(request.requestedAt),
  } as const;
}

export function buildApprovalTypedData(request: ApprovalRequest, action: ApprovalAction) {
  return {
    domain: APPROVAL_DOMAIN,
    types: APPROVAL_TYPES,
    primaryType: APPROVAL_PRIMARY_TYPE,
    message: buildApprovalMessage(request, action),
  };
}

export async function verifyApprovalSignature(
  request: ApprovalRequest,
  action: ApprovalAction,
  signature: Hex,
  expectedSigner?: Address,
): Promise<{ valid: boolean; signer?: Address; error?: string }> {
  if (request.status !== "pending") {
    return { valid: false, error: "Approval request is no longer pending" };
  }

  try {
    const signer = await recoverTypedDataAddress({
      domain: APPROVAL_DOMAIN,
      types: APPROVAL_TYPES,
      primaryType: APPROVAL_PRIMARY_TYPE,
      message: buildApprovalMessage(request, action),
      signature,
    });

    if (expectedSigner && signer.toLowerCase() !== expectedSigner.toLowerCase()) {
      return { valid: false, error: "Signer does not match claimed address" };
    }

    if (!isAllowedCfoSigner(signer)) {
      return { valid: false, error: "Signer is not an authorized CFO address" };
    }

    return { valid: true, signer };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid signature";
    return { valid: false, error: message };
  }
}

/** Comma-separated allowlist of CFO addresses (lowercase). Empty = any signer allowed. */
export function getAllowedCfoSigners(): Address[] {
  const raw = process.env.CFO_ALLOWED_SIGNERS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => /^0x[a-f0-9]{40}$/.test(s)) as Address[];
}

export function isAllowedCfoSigner(address: Address): boolean {
  const allowed = getAllowedCfoSigners();
  if (allowed.length === 0) return true;
  return allowed.includes(address.toLowerCase() as Address);
}

/** Production requires wallet proof unless explicitly disabled */
export function requiresWalletSignature(): boolean {
  if (process.env.CITADEL_REQUIRE_WALLET_APPROVAL === "false") return false;
  if (process.env.CITADEL_REQUIRE_WALLET_APPROVAL === "true") return true;
  return process.env.NODE_ENV === "production";
}
