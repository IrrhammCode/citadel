import { describe, it, expect } from "vitest";
import { mnemonicToAccount } from "viem/accounts";
import type { ApprovalRequest } from "@/lib/agent/autonomy";
import {
  APPROVAL_DOMAIN,
  APPROVAL_TYPES,
  APPROVAL_PRIMARY_TYPE,
  buildApprovalMessage,
  verifyApprovalSignature,
} from "./signature";

const TEST_ACCOUNT = mnemonicToAccount(
  "test test test test test test test test test test test junk",
  { addressIndex: 0 },
);

function sampleRequest(overrides?: Partial<ApprovalRequest>): ApprovalRequest {
  return {
    id: "test-approval-id",
    systemId: "agent-1",
    type: "spend",
    amount: 75,
    recipient: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    description: "Test payment",
    reasoning: "E2E",
    confidence: 0.9,
    status: "pending",
    requestedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe("approval signature", () => {
  it("verifies a valid EIP-712 approve signature", async () => {
    const account = TEST_ACCOUNT;
    const request = sampleRequest();
    const signature = await account.signTypedData({
      domain: APPROVAL_DOMAIN,
      types: APPROVAL_TYPES,
      primaryType: APPROVAL_PRIMARY_TYPE,
      message: buildApprovalMessage(request, "approve"),
    });

    const result = await verifyApprovalSignature(
      request,
      "approve",
      signature,
      account.address,
    );

    expect(result.valid).toBe(true);
    expect(result.signer?.toLowerCase()).toBe(account.address.toLowerCase());
  });

  it("rejects signature for wrong action", async () => {
    const account = TEST_ACCOUNT;
    const request = sampleRequest();
    const signature = await account.signTypedData({
      domain: APPROVAL_DOMAIN,
      types: APPROVAL_TYPES,
      primaryType: APPROVAL_PRIMARY_TYPE,
      message: buildApprovalMessage(request, "approve"),
    });

    const result = await verifyApprovalSignature(request, "reject", signature, account.address);
    expect(result.valid).toBe(false);
  });

  it("rejects signer not in CFO allowlist when configured", async () => {
    const prev = process.env.CFO_ALLOWED_SIGNERS;
    process.env.CFO_ALLOWED_SIGNERS = "0x0000000000000000000000000000000000000001";

    const account = TEST_ACCOUNT;
    const request = sampleRequest();
    const signature = await account.signTypedData({
      domain: APPROVAL_DOMAIN,
      types: APPROVAL_TYPES,
      primaryType: APPROVAL_PRIMARY_TYPE,
      message: buildApprovalMessage(request, "approve"),
    });

    const result = await verifyApprovalSignature(request, "approve", signature, account.address);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/authorized CFO/i);

    if (prev) process.env.CFO_ALLOWED_SIGNERS = prev;
    else delete process.env.CFO_ALLOWED_SIGNERS;
  });

  it("rejects when request is not pending", async () => {
    const account = TEST_ACCOUNT;
    const request = sampleRequest({ status: "approved" });
    const signature = await account.signTypedData({
      domain: APPROVAL_DOMAIN,
      types: APPROVAL_TYPES,
      primaryType: APPROVAL_PRIMARY_TYPE,
      message: buildApprovalMessage(request, "approve"),
    });

    const result = await verifyApprovalSignature(request, "approve", signature);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/pending/i);
  });
});
