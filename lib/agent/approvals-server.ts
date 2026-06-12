/**
 * Server-side approval queue — persisted in citadel store.
 */
import type { Hex, Address } from "viem";
import type { ApprovalRequest } from "@/lib/agent/autonomy";
import type { ApprovalAction } from "@/lib/approval/signature";
import {
  requiresWalletSignature,
  verifyApprovalSignature,
} from "@/lib/approval/signature";
import {
  notifySlackApprovalPending,
  notifySlackApprovalResolved,
} from "@/lib/notifications/slack";
import { getServerStore, getServerSystem, saveServerStore } from "@/lib/server/store";

export type ApprovalProof = {
  signature: Hex;
  signer: Address;
};

async function verifyProof(
  request: ApprovalRequest,
  action: ApprovalAction,
  proof?: ApprovalProof,
): Promise<{ ok: true; signer: Address } | { ok: false; error: string }> {
  if (!requiresWalletSignature()) {
    return { ok: true, signer: (proof?.signer ?? "0x0000000000000000000000000000000000000000") as Address };
  }

  if (!proof?.signature || !proof.signer) {
    return { ok: false, error: "Wallet signature required — connect MetaMask and sign the approval" };
  }

  const verified = await verifyApprovalSignature(
    request,
    action,
    proof.signature,
    proof.signer,
  );

  if (!verified.valid || !verified.signer) {
    return { ok: false, error: verified.error ?? "Invalid wallet signature" };
  }

  return { ok: true, signer: verified.signer };
}

export function getServerApprovals(systemId?: string): ApprovalRequest[] {
  const store = getServerStore();
  const all = store.approvalRequests ?? [];
  if (systemId) return all.filter((a) => a.systemId === systemId);
  return all.sort((a, b) => b.requestedAt - a.requestedAt);
}

export function getServerPendingApprovals(systemId?: string): ApprovalRequest[] {
  return getServerApprovals(systemId).filter((a) => a.status === "pending");
}

export function createServerApprovalRequest(
  systemId: string,
  action: {
    type: "spend" | "negotiate" | "onboard_vendor";
    amount?: number;
    recipient?: string;
    description: string;
    reasoning: string;
    confidence: number;
  },
): ApprovalRequest {
  const store = getServerStore();
  const request: ApprovalRequest = {
    id: crypto.randomUUID(),
    systemId,
    ...action,
    status: "pending",
    requestedAt: Date.now(),
  };
  store.approvalRequests = [request, ...(store.approvalRequests ?? [])].slice(0, 100);
  saveServerStore(store);

  const systemName = getServerSystem(systemId)?.name;
  void notifySlackApprovalPending(request, systemName);

  return request;
}

export async function approveServerRequest(
  id: string,
  approvedBy: string,
  proof?: ApprovalProof,
): Promise<ApprovalRequest | { error: string }> {
  const store = getServerStore();
  const request = store.approvalRequests?.find((a) => a.id === id);
  if (!request) return { error: "Approval not found" };
  if (request.status !== "pending") return { error: "Approval is no longer pending" };

  const check = await verifyProof(request, "approve", proof);
  if (!check.ok) return { error: check.error };

  request.status = "approved";
  request.resolvedAt = Date.now();
  request.resolvedBy = approvedBy;
  request.approvalSigner = check.signer;
  if (proof?.signature) request.approvalSignature = proof.signature;
  saveServerStore(store);

  void notifySlackApprovalResolved(request, getServerSystem(request.systemId)?.name, "approved", {
    signer: check.signer,
  });

  return request;
}

export async function rejectServerRequest(
  id: string,
  rejectedBy: string,
  proof?: ApprovalProof,
): Promise<ApprovalRequest | { error: string }> {
  const store = getServerStore();
  const request = store.approvalRequests?.find((a) => a.id === id);
  if (!request) return { error: "Approval not found" };
  if (request.status !== "pending") return { error: "Approval is no longer pending" };

  const check = await verifyProof(request, "reject", proof);
  if (!check.ok) return { error: check.error };

  request.status = "rejected";
  request.resolvedAt = Date.now();
  request.resolvedBy = rejectedBy;
  request.approvalSigner = check.signer;
  if (proof?.signature) request.approvalSignature = proof.signature;
  saveServerStore(store);

  void notifySlackApprovalResolved(request, getServerSystem(request.systemId)?.name, "rejected", {
    signer: check.signer,
  });

  return request;
}

export function notifyApprovalExecuted(
  request: ApprovalRequest,
  txHash?: string,
): void {
  void notifySlackApprovalResolved(
    request,
    getServerSystem(request.systemId)?.name,
    "executed",
    { txHash, signer: request.approvalSigner },
  );
}

export function autoApproveServerRequest(id: string): ApprovalRequest | undefined {
  const store = getServerStore();
  const request = store.approvalRequests?.find((a) => a.id === id);
  if (!request) return undefined;
  request.status = "auto-approved";
  request.resolvedAt = Date.now();
  saveServerStore(store);
  return request;
}
