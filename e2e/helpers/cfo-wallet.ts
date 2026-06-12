import type { Hex, Address } from "viem";
import { mnemonicToAccount } from "viem/accounts";
import type { ApprovalRequest } from "../../lib/agent/autonomy";
import {
  APPROVAL_DOMAIN,
  APPROVAL_TYPES,
  APPROVAL_PRIMARY_TYPE,
  buildApprovalMessage,
  type ApprovalAction,
} from "../../lib/approval/signature";

const E2E_MNEMONIC =
  "test test test test test test test test test test test junk";

export function getE2eCfoAccount() {
  return mnemonicToAccount(E2E_MNEMONIC, { addressIndex: 0 });
}

export async function signApprovalDecision(
  request: ApprovalRequest,
  action: ApprovalAction,
): Promise<{ signature: Hex; signer: Address }> {
  const account = getE2eCfoAccount();
  const signature = await account.signTypedData({
    domain: APPROVAL_DOMAIN,
    types: APPROVAL_TYPES,
    primaryType: APPROVAL_PRIMARY_TYPE,
    message: buildApprovalMessage(request, action),
  });

  return { signature, signer: account.address };
}
