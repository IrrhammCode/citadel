import { privateKeyToAccount } from "viem/accounts";

/**
 * Server-side session EOA used as the ERC-7715 permission recipient (`to` address).
 * The private key must never be exposed to the client.
 */
export function getSessionAccount() {
  const privateKey = process.env.SESSION_ACCOUNT_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("SESSION_ACCOUNT_PRIVATE_KEY is not configured");
  }
  const normalized = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  return privateKeyToAccount(normalized as `0x${string}`);
}

export function getSessionAddress(): `0x${string}` {
  return getSessionAccount().address;
}
